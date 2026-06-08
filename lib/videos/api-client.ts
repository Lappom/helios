import { upload } from "@vercel/blob/client";
import { createId } from "@/lib/db/id";
import {
  BLOB_CLIENT_UPLOAD_URL,
  MULTIPART_UPLOAD_THRESHOLD_BYTES,
  buildVodThumbnailPathname,
  buildVodUploadPathname,
} from "@/lib/storage/client-upload";
import type {
  VideoAccessItem,
  VideoCategoryItem,
  VideoFeedCategory,
  VideoItem,
  VideoStreamInfo,
} from "@/lib/videos/types";
import type {
  CreateCategoryInput,
  CreateYoutubeVideoInput,
  SetVideoAccessInput,
  UpdateCategoryInput,
  UpdateVideoInput,
} from "@/lib/validators/videos";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchVideoCategories(): Promise<{
  items: VideoCategoryItem[];
}> {
  const response = await fetch("/api/v1/videos/categories");
  return parseResponse(response);
}

export async function createVideoCategory(
  input: CreateCategoryInput,
): Promise<VideoCategoryItem> {
  const response = await fetch("/api/v1/videos/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function updateVideoCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<VideoCategoryItem> {
  const response = await fetch(`/api/v1/videos/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteVideoCategory(categoryId: string): Promise<void> {
  const response = await fetch(`/api/v1/videos/categories/${categoryId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function reorderVideoCategories(
  categoryIds: string[],
): Promise<{ items: VideoCategoryItem[] }> {
  const response = await fetch("/api/v1/videos/categories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryIds }),
  });
  return parseResponse(response);
}

export async function fetchVideos(params?: {
  categoryId?: string | null;
  page?: number;
  limit?: number;
}): Promise<{ items: VideoItem[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.categoryId === null) {
    search.set("categoryId", "null");
  } else if (params?.categoryId) {
    search.set("categoryId", params.categoryId);
  }
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();
  const response = await fetch(`/api/v1/videos${query ? `?${query}` : ""}`);
  const payload = await parseResponse<{
    items: VideoItem[];
    total: number;
  }>(response);
  return payload;
}

export async function createYoutubeVideo(
  input: CreateYoutubeVideoInput,
): Promise<VideoItem> {
  const response = await fetch("/api/v1/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function uploadVideoWithProgress(
  organizationId: string,
  file: File,
  metadata: {
    title: string;
    description?: string | null;
    categoryId?: string | null;
    visibility: "all_clients" | "selected";
    clientIds?: string[];
    durationSeconds?: number | null;
  },
  thumbnail: File | null,
  onProgress?: (percent: number) => void,
): Promise<VideoItem> {
  const videoId = createId();
  const pathname = buildVodUploadPathname(organizationId, videoId, file.type);

  await upload(pathname, file, {
    access: "private",
    handleUploadUrl: BLOB_CLIENT_UPLOAD_URL,
    clientPayload: JSON.stringify({
      uploadType: "vod",
      sizeBytes: file.size,
      mimeType: file.type,
    }),
    multipart: file.size > MULTIPART_UPLOAD_THRESHOLD_BYTES,
    onUploadProgress: (event) => {
      if (!onProgress) {
        return;
      }
      const baseProgress = thumbnail ? 90 : 100;
      onProgress(Math.round((event.percentage / 100) * baseProgress));
    },
  });

  let thumbnailPathname: string | null = null;
  if (thumbnail) {
    thumbnailPathname = buildVodThumbnailPathname(organizationId, videoId);
    await upload(thumbnailPathname, thumbnail, {
      access: "private",
      handleUploadUrl: BLOB_CLIENT_UPLOAD_URL,
      clientPayload: JSON.stringify({
        uploadType: "vod_thumbnail",
        sizeBytes: thumbnail.size,
        mimeType: thumbnail.type,
      }),
      onUploadProgress: (event) => {
        if (!onProgress) {
          return;
        }
        onProgress(90 + Math.round((event.percentage / 100) * 10));
      },
    });
  } else if (onProgress) {
    onProgress(100);
  }

  const response = await fetch("/api/v1/videos/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathname,
      thumbnailPathname,
      mimeType: file.type,
      sizeBytes: file.size,
      metadata,
    }),
  });

  return parseResponse(response);
}

export async function updateVideo(
  videoId: string,
  input: UpdateVideoInput,
): Promise<VideoItem> {
  const response = await fetch(`/api/v1/videos/${videoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteVideoApi(videoId: string): Promise<void> {
  const response = await fetch(`/api/v1/videos/${videoId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function fetchVideoAccess(
  videoId: string,
): Promise<{ items: VideoAccessItem[] }> {
  const response = await fetch(`/api/v1/videos/${videoId}/access`);
  return parseResponse(response);
}

export async function setVideoAccessApi(
  videoId: string,
  input: SetVideoAccessInput,
): Promise<{ items: VideoAccessItem[] }> {
  const response = await fetch(`/api/v1/videos/${videoId}/access`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchVideoStream(
  videoId: string,
): Promise<VideoStreamInfo> {
  const response = await fetch(`/api/v1/videos/${videoId}/stream`);
  return parseResponse(response);
}

export async function fetchClientVideoFeed(): Promise<{
  categories: VideoFeedCategory[];
}> {
  const response = await fetch("/api/v1/videos/feed");
  return parseResponse(response);
}
