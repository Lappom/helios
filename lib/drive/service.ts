import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
import type { PlanTier } from "@/lib/auth/types";
import { problem } from "@/lib/api/response";
import {
  checkDriveStorageQuota,
  getDriveStorageUsed,
} from "@/lib/billing/drive-quota";
import { getDb } from "@/lib/db";
import { createId } from "@/lib/db/id";
import {
  clients,
  driveFiles,
  driveFolders,
  driveShares,
} from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import {
  assertDriveUploadAllowed,
  getDriveFileBlob,
  putDriveFile,
} from "@/lib/storage/blob";
import type {
  ClientDriveFileItem,
  DriveFileItem,
  DriveFolderContents,
  DriveFolderItem,
  DriveFolderTreeNode,
  DriveShareItem,
  DriveStorageQuota,
} from "./types";
import type { CreateFolderInput, ShareDriveInput } from "@/lib/validators/drive";
import { del } from "@vercel/blob";

async function getFolderOrThrow(organizationId: string, folderId: string) {
  const folder = await getDb().query.driveFolders.findFirst({
    where: and(
      eq(driveFolders.id, folderId),
      eq(driveFolders.organizationId, organizationId),
    ),
  });

  if (!folder) {
    throw problem({
      type: "not-found",
      title: "Folder not found",
      status: 404,
      detail: "The requested folder does not exist.",
    });
  }

  return folder;
}

async function getFileOrThrow(organizationId: string, fileId: string) {
  const file = await getDb().query.driveFiles.findFirst({
    where: and(
      eq(driveFiles.id, fileId),
      eq(driveFiles.organizationId, organizationId),
    ),
  });

  if (!file) {
    throw problem({
      type: "not-found",
      title: "File not found",
      status: 404,
      detail: "The requested file does not exist.",
    });
  }

  return file;
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

async function countFolderFiles(
  organizationId: string,
  folderId: string | null,
): Promise<number> {
  const where =
    folderId === null
      ? and(
          eq(driveFiles.organizationId, organizationId),
          isNull(driveFiles.folderId),
        )
      : and(
          eq(driveFiles.organizationId, organizationId),
          eq(driveFiles.folderId, folderId),
        );

  const [row] = await getDb().select({ total: count() }).from(driveFiles).where(where);
  return row?.total ?? 0;
}

async function countChildFolders(
  organizationId: string,
  parentId: string | null,
): Promise<number> {
  const where =
    parentId === null
      ? and(
          eq(driveFolders.organizationId, organizationId),
          isNull(driveFolders.parentId),
        )
      : and(
          eq(driveFolders.organizationId, organizationId),
          eq(driveFolders.parentId, parentId),
        );

  const [row] = await getDb()
    .select({ total: count() })
    .from(driveFolders)
    .where(where);
  return row?.total ?? 0;
}

async function mapFolderItem(
  organizationId: string,
  folder: typeof driveFolders.$inferSelect,
): Promise<DriveFolderItem> {
  const [fileCount, childFolderCount] = await Promise.all([
    countFolderFiles(organizationId, folder.id),
    countChildFolders(organizationId, folder.id),
  ]);

  return {
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    fileCount,
    childFolderCount,
  };
}

async function mapFileItem(
  organizationId: string,
  file: typeof driveFiles.$inferSelect,
): Promise<DriveFileItem> {
  const [shareRow] = await getDb()
    .select({ total: count() })
    .from(driveShares)
    .where(
      and(
        eq(driveShares.organizationId, organizationId),
        eq(driveShares.fileId, file.id),
      ),
    );

  return {
    id: file.id,
    folderId: file.folderId,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedByClerkUserId: file.uploadedByClerkUserId,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    shareCount: shareRow?.total ?? 0,
  };
}

export async function getDriveStorageQuota(
  organizationId: string,
  planTier: PlanTier,
): Promise<DriveStorageQuota> {
  const result = await checkDriveStorageQuota(organizationId, planTier, 0);
  const usedPercent =
    result.limit === Number.POSITIVE_INFINITY
      ? 0
      : Math.min(100, Math.round((result.used / result.limit) * 100));

  return {
    usedBytes: result.used,
    limitBytes: result.limit,
    usedPercent,
  };
}

export async function getFolderTree(
  organizationId: string,
): Promise<DriveFolderTreeNode[]> {
  const folders = await getDb().query.driveFolders.findMany({
    where: eq(driveFolders.organizationId, organizationId),
    orderBy: [asc(driveFolders.name)],
  });

  const mapped = await Promise.all(
    folders.map((folder) => mapFolderItem(organizationId, folder)),
  );

  const byParent = new Map<string | null, DriveFolderTreeNode[]>();

  for (const folder of mapped) {
    const node: DriveFolderTreeNode = { ...folder, children: [] };
    const siblings = byParent.get(folder.parentId) ?? [];
    siblings.push(node);
    byParent.set(folder.parentId, siblings);
  }

  function attachChildren(parentId: string | null): DriveFolderTreeNode[] {
    const nodes = byParent.get(parentId) ?? [];
    for (const node of nodes) {
      node.children = attachChildren(node.id);
    }
    return nodes;
  }

  return attachChildren(null);
}

export async function listFolderContents(
  organizationId: string,
  parentId: string | null,
  options: { page: number; limit: number; offset: number },
): Promise<DriveFolderContents> {
  if (parentId) {
    await getFolderOrThrow(organizationId, parentId);
  }

  const folderWhere =
    parentId === null
      ? and(
          eq(driveFolders.organizationId, organizationId),
          isNull(driveFolders.parentId),
        )
      : and(
          eq(driveFolders.organizationId, organizationId),
          eq(driveFolders.parentId, parentId),
        );

  const fileWhere =
    parentId === null
      ? and(
          eq(driveFiles.organizationId, organizationId),
          isNull(driveFiles.folderId),
        )
      : and(
          eq(driveFiles.organizationId, organizationId),
          eq(driveFiles.folderId, parentId),
        );

  const [childFolders, fileRows, [totalRow], folderRow] = await Promise.all([
    getDb().query.driveFolders.findMany({
      where: folderWhere,
      orderBy: [asc(driveFolders.name)],
    }),
    getDb().query.driveFiles.findMany({
      where: fileWhere,
      orderBy: [desc(driveFiles.createdAt)],
      limit: options.limit,
      offset: options.offset,
    }),
    getDb().select({ total: count() }).from(driveFiles).where(fileWhere),
    parentId
      ? getDb().query.driveFolders.findFirst({
          where: and(
            eq(driveFolders.id, parentId),
            eq(driveFolders.organizationId, organizationId),
          ),
        })
      : Promise.resolve(null),
  ]);

  const folders = await Promise.all(
    childFolders.map((folder) => mapFolderItem(organizationId, folder)),
  );
  const files = await Promise.all(
    fileRows.map((file) => mapFileItem(organizationId, file)),
  );

  return {
    folder: folderRow ? await mapFolderItem(organizationId, folderRow) : null,
    folders,
    files,
    page: options.page,
    limit: options.limit,
    totalFiles: totalRow?.total ?? 0,
  };
}

export async function createFolder(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateFolderInput,
): Promise<DriveFolderItem> {
  if (input.parentId) {
    await getFolderOrThrow(organizationId, input.parentId);
  }

  const [folder] = await getDb()
    .insert(driveFolders)
    .values({
      organizationId,
      coachClerkUserId,
      parentId: input.parentId ?? null,
      name: input.name,
    })
    .returning();

  return mapFolderItem(organizationId, folder!);
}

export async function uploadDriveFile(
  organizationId: string,
  coachClerkUserId: string,
  planTier: PlanTier,
  file: File,
  folderId?: string | null,
): Promise<DriveFileItem> {
  if (folderId) {
    await getFolderOrThrow(organizationId, folderId);
  }

  const storageUsed = await getDriveStorageUsed(organizationId);
  assertDriveUploadAllowed(planTier, file, storageUsed);

  const fileId = createId();
  const uploaded = await putDriveFile(file, { organizationId, fileId });

  const [row] = await getDb()
    .insert(driveFiles)
    .values({
      id: fileId,
      organizationId,
      folderId: folderId ?? null,
      name: uploaded.fileName,
      mimeType: uploaded.mimeType,
      sizeBytes: file.size,
      blobPathname: uploaded.pathname,
      uploadedByClerkUserId: coachClerkUserId,
    })
    .returning();

  return mapFileItem(organizationId, row!);
}

async function getDescendantFolderIds(
  organizationId: string,
  rootFolderIds: string[],
): Promise<string[]> {
  if (rootFolderIds.length === 0) {
    return [];
  }

  const allFolders = await getDb().query.driveFolders.findMany({
    where: eq(driveFolders.organizationId, organizationId),
    columns: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const folder of allFolders) {
    if (!folder.parentId) {
      continue;
    }
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder.id);
    childrenByParent.set(folder.parentId, siblings);
  }

  const result = new Set<string>(rootFolderIds);
  const queue = [...rootFolderIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return [...result];
}

async function buildFolderPath(
  organizationId: string,
  folderId: string | null,
): Promise<string[]> {
  if (!folderId) {
    return [];
  }

  const allFolders = await getDb().query.driveFolders.findMany({
    where: eq(driveFolders.organizationId, organizationId),
    columns: { id: true, parentId: true, name: true },
  });

  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  const path: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = byId.get(currentId);
    if (!folder) {
      break;
    }
    path.unshift(folder.name);
    currentId = folder.parentId;
  }

  return path;
}

export async function shareDriveFile(
  organizationId: string,
  fileId: string,
  coachClerkUserId: string,
  input: ShareDriveInput,
): Promise<DriveShareItem> {
  await getFileOrThrow(organizationId, fileId);
  const client = await getClientOrThrow(organizationId, input.clientId);

  const existing = await getDb().query.driveShares.findFirst({
    where: and(
      eq(driveShares.organizationId, organizationId),
      eq(driveShares.fileId, fileId),
      eq(driveShares.clientId, input.clientId),
    ),
  });

  if (existing) {
    return {
      id: existing.id,
      fileId: existing.fileId,
      folderId: existing.folderId,
      clientId: existing.clientId,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      permission: "read",
      sharedByClerkUserId: existing.sharedByClerkUserId,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  const [share] = await getDb()
    .insert(driveShares)
    .values({
      organizationId,
      fileId,
      clientId: input.clientId,
      sharedByClerkUserId: coachClerkUserId,
    })
    .returning();

  emitHeliosEvent("drive.file.shared", {
    organizationId,
    fileId,
    clientId: input.clientId,
    shareId: share!.id,
    sharedByClerkUserId: coachClerkUserId,
  });

  return {
    id: share!.id,
    fileId: share!.fileId,
    folderId: share!.folderId,
    clientId: share!.clientId,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    permission: "read",
    sharedByClerkUserId: share!.sharedByClerkUserId,
    createdAt: share!.createdAt.toISOString(),
  };
}

export async function shareDriveFolder(
  organizationId: string,
  folderId: string,
  coachClerkUserId: string,
  input: ShareDriveInput,
): Promise<DriveShareItem> {
  await getFolderOrThrow(organizationId, folderId);
  const client = await getClientOrThrow(organizationId, input.clientId);

  const existing = await getDb().query.driveShares.findFirst({
    where: and(
      eq(driveShares.organizationId, organizationId),
      eq(driveShares.folderId, folderId),
      eq(driveShares.clientId, input.clientId),
    ),
  });

  if (existing) {
    return {
      id: existing.id,
      fileId: existing.fileId,
      folderId: existing.folderId,
      clientId: existing.clientId,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      permission: "read",
      sharedByClerkUserId: existing.sharedByClerkUserId,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  const [share] = await getDb()
    .insert(driveShares)
    .values({
      organizationId,
      folderId,
      clientId: input.clientId,
      sharedByClerkUserId: coachClerkUserId,
    })
    .returning();

  emitHeliosEvent("drive.file.shared", {
    organizationId,
    folderId,
    clientId: input.clientId,
    shareId: share!.id,
    sharedByClerkUserId: coachClerkUserId,
  });

  return {
    id: share!.id,
    fileId: share!.fileId,
    folderId: share!.folderId,
    clientId: share!.clientId,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    permission: "read",
    sharedByClerkUserId: share!.sharedByClerkUserId,
    createdAt: share!.createdAt.toISOString(),
  };
}

export async function listSharesForItem(
  organizationId: string,
  params: { fileId?: string; folderId?: string },
): Promise<DriveShareItem[]> {
  const where = params.fileId
    ? and(
        eq(driveShares.organizationId, organizationId),
        eq(driveShares.fileId, params.fileId),
      )
    : and(
        eq(driveShares.organizationId, organizationId),
        eq(driveShares.folderId, params.folderId!),
      );

  const rows = await getDb().query.driveShares.findMany({
    where,
    orderBy: [desc(driveShares.createdAt)],
    with: {
      client: {
        columns: { firstName: true, lastName: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    fileId: row.fileId,
    folderId: row.folderId,
    clientId: row.clientId,
    clientName: `${row.client?.firstName ?? ""} ${row.client?.lastName ?? ""}`.trim(),
    permission: "read",
    sharedByClerkUserId: row.sharedByClerkUserId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function revokeShare(
  organizationId: string,
  shareId: string,
): Promise<void> {
  const share = await getDb().query.driveShares.findFirst({
    where: and(
      eq(driveShares.id, shareId),
      eq(driveShares.organizationId, organizationId),
    ),
  });

  if (!share) {
    throw problem({
      type: "not-found",
      title: "Share not found",
      status: 404,
      detail: "The requested share does not exist.",
    });
  }

  await getDb().delete(driveShares).where(eq(driveShares.id, shareId));
}

export async function listClientDrive(
  organizationId: string,
  clientId: string,
): Promise<ClientDriveFileItem[]> {
  await getClientOrThrow(organizationId, clientId);

  const shares = await getDb().query.driveShares.findMany({
    where: and(
      eq(driveShares.organizationId, organizationId),
      eq(driveShares.clientId, clientId),
    ),
  });

  const directFileIds = shares
    .filter((share) => share.fileId)
    .map((share) => share.fileId!);

  const folderIds = shares
    .filter((share) => share.folderId)
    .map((share) => share.folderId!);

  const descendantFolderIds = await getDescendantFolderIds(
    organizationId,
    folderIds,
  );

  const folderFileRows =
    descendantFolderIds.length > 0
      ? await getDb().query.driveFiles.findMany({
          where: and(
            eq(driveFiles.organizationId, organizationId),
            inArray(driveFiles.folderId, descendantFolderIds),
          ),
        })
      : [];

  const directFileRows =
    directFileIds.length > 0
      ? await getDb().query.driveFiles.findMany({
          where: and(
            eq(driveFiles.organizationId, organizationId),
            inArray(driveFiles.id, directFileIds),
          ),
        })
      : [];

  const sharedFolderIdSet = new Set(descendantFolderIds);
  const items = new Map<string, ClientDriveFileItem>();

  for (const file of directFileRows) {
    const mapped = await mapFileItem(organizationId, file);
    items.set(file.id, {
      ...mapped,
      sharedVia: "file",
      folderPath: await buildFolderPath(organizationId, file.folderId),
    });
  }

  for (const file of folderFileRows) {
    if (items.has(file.id)) {
      continue;
    }
    const mapped = await mapFileItem(organizationId, file);
    items.set(file.id, {
      ...mapped,
      sharedVia: "folder",
      folderPath: await buildFolderPath(organizationId, file.folderId),
    });
  }

  // Files in shared folders that are also directly shared keep file badge
  for (const file of folderFileRows) {
    if (directFileIds.includes(file.id)) {
      const existing = items.get(file.id);
      if (existing) {
        existing.sharedVia = "file";
      }
    } else if (file.folderId && sharedFolderIdSet.has(file.folderId)) {
      // already marked as folder
    }
  }

  return [...items.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listClientOwnDrive(
  organizationId: string,
  clientId: string,
): Promise<ClientDriveFileItem[]> {
  return listClientDrive(organizationId, clientId);
}

async function getAncestorFolderIds(
  organizationId: string,
  folderId: string,
): Promise<string[]> {
  const allFolders = await getDb().query.driveFolders.findMany({
    where: eq(driveFolders.organizationId, organizationId),
    columns: { id: true, parentId: true },
  });

  const byId = new Map(allFolders.map((row) => [row.id, row]));
  const pathIds: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    pathIds.push(currentId);
    const row = byId.get(currentId);
    currentId = row?.parentId ?? null;
  }

  return pathIds;
}

async function isFolderSharedToClient(
  organizationId: string,
  clientId: string,
  folderId: string | null,
): Promise<boolean> {
  if (!folderId) {
    return false;
  }

  const pathIds = await getAncestorFolderIds(organizationId, folderId);
  if (pathIds.length === 0) {
    return false;
  }

  const share = await getDb().query.driveShares.findFirst({
    where: and(
      eq(driveShares.organizationId, organizationId),
      eq(driveShares.clientId, clientId),
      inArray(driveShares.folderId, pathIds),
    ),
    columns: { id: true },
  });

  return Boolean(share);
}

export async function assertClientFileAccess(
  organizationId: string,
  clientId: string,
  fileId: string,
): Promise<typeof driveFiles.$inferSelect> {
  const file = await getFileOrThrow(organizationId, fileId);

  const directShare = await getDb().query.driveShares.findFirst({
    where: and(
      eq(driveShares.organizationId, organizationId),
      eq(driveShares.clientId, clientId),
      eq(driveShares.fileId, fileId),
    ),
    columns: { id: true },
  });

  if (directShare) {
    return file;
  }

  const folderShared = await isFolderSharedToClient(
    organizationId,
    clientId,
    file.folderId,
  );

  if (!folderShared) {
    throw problem({
      type: "forbidden",
      title: "Forbidden",
      status: 403,
      detail: "You do not have access to this file.",
    });
  }

  return file;
}

export async function getDriveFileForDownload(
  organizationId: string,
  fileId: string,
  actor: { role: "coach" } | { role: "client"; clientId: string },
): Promise<typeof driveFiles.$inferSelect> {
  if (actor.role === "coach") {
    return getFileOrThrow(organizationId, fileId);
  }

  return assertClientFileAccess(organizationId, actor.clientId, fileId);
}

export async function deleteDriveFile(
  organizationId: string,
  fileId: string,
): Promise<void> {
  const file = await getFileOrThrow(organizationId, fileId);

  try {
    await del(file.blobPathname);
  } catch {
    // Blob may already be gone; continue with DB cleanup.
  }

  await getDb().delete(driveFiles).where(eq(driveFiles.id, fileId));
}

export async function getDriveFileBlobStream(pathname: string) {
  return getDriveFileBlob(pathname);
}
