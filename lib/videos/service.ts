import { del } from "@vercel/blob";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { PlanTier } from "@/lib/auth/types";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { createId } from "@/lib/db/id";
import {
  clients,
  videoAccess,
  videoCategories,
  videos,
} from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import {
  assertVodVideoUploadAllowed,
  getVodThumbnailBlob,
  getVodVideoBlob,
  putVodThumbnail,
  putVodVideo,
} from "@/lib/storage/blob";
import {
  buildPlayUrl,
  createVideoStreamToken,
  getStreamTokenExpiry,
} from "./stream-token";
import type {
  VideoAccessItem,
  VideoActor,
  VideoCategoryItem,
  VideoFeedCategory,
  VideoItem,
  VideoPlayback,
  VideoStreamInfo,
} from "./types";
import { getYoutubeThumbnailUrl, extractYoutubeId } from "./youtube";
import type {
  CreateCategoryInput,
  CreateUploadVideoMetadataInput,
  CreateYoutubeVideoInput,
  ReorderCategoriesInput,
  SetVideoAccessInput,
  UpdateCategoryInput,
  UpdateVideoInput,
} from "@/lib/validators/videos";

async function getCategoryOrThrow(organizationId: string, categoryId: string) {
  const category = await getDb().query.videoCategories.findFirst({
    where: and(
      eq(videoCategories.id, categoryId),
      eq(videoCategories.organizationId, organizationId),
    ),
  });

  if (!category) {
    throw problem({
      type: "not-found",
      title: "Category not found",
      status: 404,
      detail: "The requested category does not exist.",
    });
  }

  return category;
}

async function getVideoOrThrow(organizationId: string, videoId: string) {
  const video = await getDb().query.videos.findFirst({
    where: and(
      eq(videos.id, videoId),
      eq(videos.organizationId, organizationId),
    ),
  });

  if (!video) {
    throw problem({
      type: "not-found",
      title: "Video not found",
      status: 404,
      detail: "The requested video does not exist.",
    });
  }

  return video;
}

async function getClientOrThrow(organizationId: string, clientId: string) {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.id, clientId),
      eq(clients.organizationId, organizationId),
    ),
    columns: { id: true, firstName: true, lastName: true },
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: "The requested client does not exist.",
    });
  }

  return client;
}

async function validateCategoryId(
  organizationId: string,
  categoryId: string | null | undefined,
) {
  if (!categoryId) {
    return null;
  }

  await getCategoryOrThrow(organizationId, categoryId);
  return categoryId;
}

async function validateClientIds(
  organizationId: string,
  clientIds: string[],
) {
  if (clientIds.length === 0) {
    return;
  }

  const rows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.id, clientIds),
    ),
    columns: { id: true },
  });

  if (rows.length !== clientIds.length) {
    throw problem({
      type: "validation-error",
      title: "Invalid clients",
      status: 400,
      detail: "One or more client ids are invalid.",
    });
  }
}

function resolveThumbnailUrl(
  video: typeof videos.$inferSelect,
): string | null {
  if (video.source === "youtube" && video.youtubeId) {
    return getYoutubeThumbnailUrl(video.youtubeId);
  }

  if (video.thumbnailPathname) {
    return `/api/v1/videos/${video.id}/thumbnail`;
  }

  return null;
}

async function countVideoAccess(videoId: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(videoAccess)
    .where(eq(videoAccess.videoId, videoId));
  return row?.total ?? 0;
}

async function mapVideoItem(
  video: typeof videos.$inferSelect,
  categoryName: string | null,
): Promise<VideoItem> {
  const accessCount =
    video.visibility === "selected" ? await countVideoAccess(video.id) : 0;

  return {
    id: video.id,
    title: video.title,
    description: video.description,
    source: video.source,
    youtubeId: video.youtubeId,
    thumbnailUrl: resolveThumbnailUrl(video),
    durationSeconds: video.durationSeconds,
    visibility: video.visibility,
    categoryId: video.categoryId,
    categoryName,
    sizeBytes: video.sizeBytes,
    accessCount,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };
}

async function replaceVideoAccess(
  organizationId: string,
  videoId: string,
  clientIds: string[],
) {
  await getDb().delete(videoAccess).where(eq(videoAccess.videoId, videoId));

  if (clientIds.length === 0) {
    return;
  }

  await getDb().insert(videoAccess).values(
    clientIds.map((clientId) => ({
      id: createId(),
      organizationId,
      videoId,
      clientId,
    })),
  );
}

export async function listCategories(
  organizationId: string,
): Promise<VideoCategoryItem[]> {
  const categories = await getDb().query.videoCategories.findMany({
    where: eq(videoCategories.organizationId, organizationId),
    orderBy: [asc(videoCategories.sortOrder), asc(videoCategories.name)],
  });

  const counts = await getDb()
    .select({
      categoryId: videos.categoryId,
      total: count(),
    })
    .from(videos)
    .where(eq(videos.organizationId, organizationId))
    .groupBy(videos.categoryId);

  const countMap = new Map(
    counts.map((row) => [row.categoryId ?? "__uncategorized__", row.total]),
  );

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    videoCount: countMap.get(category.id) ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }));
}

export async function createCategory(
  organizationId: string,
  input: CreateCategoryInput,
): Promise<VideoCategoryItem> {
  const [maxOrder] = await getDb()
    .select({ max: sql<number>`coalesce(max(${videoCategories.sortOrder}), -1)` })
    .from(videoCategories)
    .where(eq(videoCategories.organizationId, organizationId));

  const [created] = await getDb()
    .insert(videoCategories)
    .values({
      id: createId(),
      organizationId,
      name: input.name,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    })
    .returning();

  return {
    id: created.id,
    name: created.name,
    sortOrder: created.sortOrder,
    videoCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateCategory(
  organizationId: string,
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<VideoCategoryItem> {
  await getCategoryOrThrow(organizationId, categoryId);

  const [updated] = await getDb()
    .update(videoCategories)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    .where(
      and(
        eq(videoCategories.id, categoryId),
        eq(videoCategories.organizationId, organizationId),
      ),
    )
    .returning();

  const [videoCountRow] = await getDb()
    .select({ total: count() })
    .from(videos)
    .where(
      and(
        eq(videos.organizationId, organizationId),
        eq(videos.categoryId, categoryId),
      ),
    );

  return {
    id: updated.id,
    name: updated.name,
    sortOrder: updated.sortOrder,
    videoCount: videoCountRow?.total ?? 0,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteCategory(
  organizationId: string,
  categoryId: string,
): Promise<void> {
  await getCategoryOrThrow(organizationId, categoryId);

  await getDb()
    .update(videos)
    .set({ categoryId: null })
    .where(
      and(
        eq(videos.organizationId, organizationId),
        eq(videos.categoryId, categoryId),
      ),
    );

  await getDb()
    .delete(videoCategories)
    .where(
      and(
        eq(videoCategories.id, categoryId),
        eq(videoCategories.organizationId, organizationId),
      ),
    );
}

export async function reorderCategories(
  organizationId: string,
  input: ReorderCategoriesInput,
): Promise<VideoCategoryItem[]> {
  const existing = await getDb().query.videoCategories.findMany({
    where: eq(videoCategories.organizationId, organizationId),
    columns: { id: true },
  });

  const existingIds = new Set(existing.map((row) => row.id));
  if (
    input.categoryIds.length !== existing.length ||
    input.categoryIds.some((id) => !existingIds.has(id))
  ) {
    throw problem({
      type: "validation-error",
      title: "Invalid category order",
      status: 400,
      detail: "categoryIds must include every category exactly once.",
    });
  }

  await Promise.all(
    input.categoryIds.map((categoryId, index) =>
      getDb()
        .update(videoCategories)
        .set({ sortOrder: index })
        .where(
          and(
            eq(videoCategories.id, categoryId),
            eq(videoCategories.organizationId, organizationId),
          ),
        ),
    ),
  );

  return listCategories(organizationId);
}

export async function listVideos(
  organizationId: string,
  options: {
    categoryId?: string | null;
    page: number;
    limit: number;
    offset: number;
  },
): Promise<{ items: VideoItem[]; total: number }> {
  const conditions = [eq(videos.organizationId, organizationId)];

  if (options.categoryId === null) {
    conditions.push(isNull(videos.categoryId));
  } else if (options.categoryId) {
    conditions.push(eq(videos.categoryId, options.categoryId));
  }

  const where = and(...conditions);

  const [totalRow] = await getDb().select({ total: count() }).from(videos).where(where);
  const rows = await getDb().query.videos.findMany({
    where,
    orderBy: [desc(videos.createdAt)],
    limit: options.limit,
    offset: options.offset,
    with: {
      category: {
        columns: { name: true },
      },
    },
  });

  const items = await Promise.all(
    rows.map((row) => mapVideoItem(row, row.category?.name ?? null)),
  );

  return {
    items,
    total: totalRow?.total ?? 0,
  };
}

export async function createYoutubeVideo(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateYoutubeVideoInput,
): Promise<VideoItem> {
  const youtubeId = extractYoutubeId(input.youtubeUrl);
  if (!youtubeId) {
    throw problem({
      type: "validation-error",
      title: "Invalid YouTube URL",
      status: 400,
      detail: "Could not extract a YouTube video id.",
    });
  }

  const categoryId = await validateCategoryId(organizationId, input.categoryId);
  const clientIds = input.clientIds ?? [];

  if (input.visibility === "selected") {
    await validateClientIds(organizationId, clientIds);
  }

  const videoId = createId();
  const [created] = await getDb()
    .insert(videos)
    .values({
      id: videoId,
      organizationId,
      coachClerkUserId,
      categoryId,
      title: input.title,
      description: input.description ?? null,
      source: "youtube",
      youtubeId,
      durationSeconds: input.durationSeconds ?? null,
      visibility: input.visibility,
    })
    .returning();

  if (input.visibility === "selected") {
    await replaceVideoAccess(organizationId, videoId, clientIds);
  }

  emitHeliosEvent("video.published", {
    organizationId,
    videoId,
    coachClerkUserId,
    visibility: input.visibility,
  });

  const category = categoryId
    ? await getDb().query.videoCategories.findFirst({
        where: eq(videoCategories.id, categoryId),
        columns: { name: true },
      })
    : null;

  return mapVideoItem(created, category?.name ?? null);
}

export async function uploadVideo(
  organizationId: string,
  coachClerkUserId: string,
  planTier: PlanTier,
  file: File,
  thumbnail: File | null,
  input: CreateUploadVideoMetadataInput,
): Promise<VideoItem> {
  assertVodVideoUploadAllowed(planTier, file);

  const categoryId = await validateCategoryId(organizationId, input.categoryId);
  const clientIds = input.clientIds ?? [];

  if (input.visibility === "selected") {
    await validateClientIds(organizationId, clientIds);
  }

  const videoId = createId();
  const uploaded = await putVodVideo(file, { organizationId, videoId });

  let thumbnailPathname: string | null = null;
  if (thumbnail) {
    const thumb = await putVodThumbnail(thumbnail, { organizationId, videoId });
    thumbnailPathname = thumb.pathname;
  }

  const [created] = await getDb()
    .insert(videos)
    .values({
      id: videoId,
      organizationId,
      coachClerkUserId,
      categoryId,
      title: input.title,
      description: input.description ?? null,
      source: "upload",
      blobPathname: uploaded.pathname,
      thumbnailPathname,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      durationSeconds: input.durationSeconds ?? null,
      visibility: input.visibility,
    })
    .returning();

  if (input.visibility === "selected") {
    await replaceVideoAccess(organizationId, videoId, clientIds);
  }

  emitHeliosEvent("video.published", {
    organizationId,
    videoId,
    coachClerkUserId,
    visibility: input.visibility,
  });

  const category = categoryId
    ? await getDb().query.videoCategories.findFirst({
        where: eq(videoCategories.id, categoryId),
        columns: { name: true },
      })
    : null;

  return mapVideoItem(created, category?.name ?? null);
}

export async function updateVideo(
  organizationId: string,
  videoId: string,
  input: UpdateVideoInput,
): Promise<VideoItem> {
  const existing = await getVideoOrThrow(organizationId, videoId);
  const categoryId =
    input.categoryId !== undefined
      ? await validateCategoryId(organizationId, input.categoryId)
      : undefined;

  const [updated] = await getDb()
    .update(videos)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.durationSeconds !== undefined
        ? { durationSeconds: input.durationSeconds }
        : {}),
    })
    .where(
      and(eq(videos.id, videoId), eq(videos.organizationId, organizationId)),
    )
    .returning();

  if (
    input.visibility === "all_clients" &&
    existing.visibility === "selected"
  ) {
    await getDb().delete(videoAccess).where(eq(videoAccess.videoId, videoId));
  }

  const category = updated.categoryId
    ? await getDb().query.videoCategories.findFirst({
        where: eq(videoCategories.id, updated.categoryId),
        columns: { name: true },
      })
    : null;

  return mapVideoItem(updated, category?.name ?? null);
}

export async function deleteVideo(
  organizationId: string,
  videoId: string,
): Promise<void> {
  const video = await getVideoOrThrow(organizationId, videoId);

  if (video.blobPathname) {
    await del(video.blobPathname);
  }
  if (video.thumbnailPathname) {
    await del(video.thumbnailPathname);
  }

  await getDb()
    .delete(videos)
    .where(
      and(eq(videos.id, videoId), eq(videos.organizationId, organizationId)),
    );
}

export async function setVideoAccess(
  organizationId: string,
  videoId: string,
  input: SetVideoAccessInput,
): Promise<VideoAccessItem[]> {
  const video = await getVideoOrThrow(organizationId, videoId);

  if (video.visibility !== "selected") {
    throw problem({
      type: "validation-error",
      title: "Invalid visibility",
      status: 400,
      detail: "Access list applies only to selected visibility videos.",
    });
  }

  await validateClientIds(organizationId, input.clientIds);
  await replaceVideoAccess(organizationId, videoId, input.clientIds);

  return listVideoAccess(organizationId, videoId);
}

export async function listVideoAccess(
  organizationId: string,
  videoId: string,
): Promise<VideoAccessItem[]> {
  await getVideoOrThrow(organizationId, videoId);

  const rows = await getDb().query.videoAccess.findMany({
    where: and(
      eq(videoAccess.organizationId, organizationId),
      eq(videoAccess.videoId, videoId),
    ),
    with: {
      client: {
        columns: { firstName: true, lastName: true },
      },
    },
    orderBy: [asc(videoAccess.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    clientName: `${row.client.firstName} ${row.client.lastName}`.trim(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function assertVideoAccess(
  organizationId: string,
  videoId: string,
  actor: VideoActor,
): Promise<typeof videos.$inferSelect> {
  const video = await getVideoOrThrow(organizationId, videoId);

  if (actor.role === "coach") {
    return video;
  }

  if (video.visibility === "all_clients") {
    return video;
  }

  const access = await getDb().query.videoAccess.findFirst({
    where: and(
      eq(videoAccess.videoId, videoId),
      eq(videoAccess.clientId, actor.clientId),
      eq(videoAccess.organizationId, organizationId),
    ),
  });

  if (!access) {
    throw problem({
      type: "forbidden",
      title: "Forbidden",
      status: 403,
      detail: "You do not have access to this video.",
    });
  }

  return video;
}

export async function listClientVideoFeed(
  organizationId: string,
  clientId: string,
): Promise<VideoFeedCategory[]> {
  await getClientOrThrow(organizationId, clientId);

  const accessibleVideos = await getDb().query.videos.findMany({
    where: and(
      eq(videos.organizationId, organizationId),
      or(
        eq(videos.visibility, "all_clients"),
        sql`${videos.id} IN (
          SELECT ${videoAccess.videoId}
          FROM ${videoAccess}
          WHERE ${videoAccess.clientId} = ${clientId}
            AND ${videoAccess.organizationId} = ${organizationId}
        )`,
      ),
    ),
    orderBy: [desc(videos.createdAt)],
    with: {
      category: {
        columns: { id: true, name: true, sortOrder: true },
      },
    },
  });

  const categories = await getDb().query.videoCategories.findMany({
    where: eq(videoCategories.organizationId, organizationId),
    orderBy: [asc(videoCategories.sortOrder), asc(videoCategories.name)],
  });

  const categoryMap = new Map<string, VideoFeedCategory>();

  for (const category of categories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      videos: [],
    });
  }

  const uncategorized: VideoFeedCategory = {
    id: null,
    name: "Sans catégorie",
    sortOrder: Number.MAX_SAFE_INTEGER,
    videos: [],
  };

  for (const video of accessibleVideos) {
    const item = {
      id: video.id,
      title: video.title,
      description: video.description,
      source: video.source,
      youtubeId: video.youtubeId,
      thumbnailUrl: resolveThumbnailUrl(video),
      durationSeconds: video.durationSeconds,
    };

    if (video.category) {
      const bucket = categoryMap.get(video.category.id);
      if (bucket) {
        bucket.videos.push(item);
      } else {
        uncategorized.videos.push(item);
      }
    } else {
      uncategorized.videos.push(item);
    }
  }

  const feed = [...categoryMap.values()].filter(
    (category) => category.videos.length > 0,
  );

  if (uncategorized.videos.length > 0) {
    feed.push(uncategorized);
  }

  return feed.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getVideoStreamInfo(
  organizationId: string,
  videoId: string,
  actor: VideoActor,
): Promise<VideoStreamInfo> {
  const video = await assertVideoAccess(organizationId, videoId, actor);
  const expiresAt = getStreamTokenExpiry();
  const token = createVideoStreamToken(videoId, expiresAt);
  const expiresAtIso = new Date(expiresAt).toISOString();

  if (video.source === "youtube" && video.youtubeId) {
    return {
      source: "youtube",
      embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
      playUrl: null,
      expiresAt: expiresAtIso,
    };
  }

  return {
    source: "upload",
    embedUrl: null,
    playUrl: buildPlayUrl(videoId, expiresAt, token),
    expiresAt: expiresAtIso,
  };
}

export async function getVideoForPlayback(
  organizationId: string,
  videoId: string,
): Promise<VideoPlayback> {
  const video = await getVideoOrThrow(organizationId, videoId);

  if (video.source !== "upload" || !video.blobPathname || !video.mimeType) {
    throw problem({
      type: "not-found",
      title: "Playback not available",
      status: 404,
      detail: "This video does not have an uploaded stream.",
    });
  }

  return {
    mimeType: video.mimeType,
    blobPathname: video.blobPathname,
    title: video.title,
  };
}

export async function getVideoThumbnailForDownload(
  organizationId: string,
  videoId: string,
  actor: VideoActor,
) {
  const video = await assertVideoAccess(organizationId, videoId, actor);

  if (!video.thumbnailPathname) {
    throw problem({
      type: "not-found",
      title: "Thumbnail not found",
      status: 404,
      detail: "This video does not have a thumbnail.",
    });
  }

  return video.thumbnailPathname;
}

export async function getVodVideoBlobStream(pathname: string) {
  return getVodVideoBlob(pathname);
}

export async function getVodThumbnailBlobStream(pathname: string) {
  return getVodThumbnailBlob(pathname);
}
