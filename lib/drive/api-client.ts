import { upload } from "@vercel/blob/client";
import { createId } from "@/lib/db/id";
import type {
  ClientDriveFileItem,
  DriveFileItem,
  DriveFolderContents,
  DriveFolderTreeNode,
  DriveShareItem,
  DriveStorageQuota,
} from "@/lib/drive/types";
import {
  BLOB_CLIENT_UPLOAD_URL,
  MULTIPART_UPLOAD_THRESHOLD_BYTES,
  buildDriveUploadPathname,
} from "@/lib/storage/client-upload";
import type {
  CreateFolderInput,
  ShareDriveInput,
} from "@/lib/validators/drive";

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

export async function fetchDriveTree(): Promise<{
  items: DriveFolderTreeNode[];
}> {
  const response = await fetch("/api/v1/drive/folders?tree=true");
  return parseResponse(response);
}

export async function fetchFolderContents(params?: {
  parentId?: string | null;
  page?: number;
  limit?: number;
}): Promise<DriveFolderContents> {
  const search = new URLSearchParams();
  if (params?.parentId) {
    search.set("parentId", params.parentId);
  }
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();
  const response = await fetch(
    `/api/v1/drive/folders${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export async function createDriveFolder(
  input: CreateFolderInput,
): Promise<DriveFolderTreeNode> {
  const response = await fetch("/api/v1/drive/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function uploadDriveFileWithProgress(
  organizationId: string,
  file: File,
  options?: {
    folderId?: string | null;
    onProgress?: (percent: number) => void;
  },
): Promise<DriveFileItem> {
  const fileId = createId();
  const pathname = buildDriveUploadPathname(organizationId, fileId, file.type);
  const clientPayload = JSON.stringify({
    uploadType: "drive",
    sizeBytes: file.size,
    mimeType: file.type,
  });

  await upload(pathname, file, {
    access: "private",
    handleUploadUrl: BLOB_CLIENT_UPLOAD_URL,
    clientPayload,
    multipart: file.size > MULTIPART_UPLOAD_THRESHOLD_BYTES,
    onUploadProgress: (event) => {
      if (!options?.onProgress) {
        return;
      }
      options.onProgress(Math.round(event.percentage));
    },
  });

  const response = await fetch("/api/v1/drive/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathname,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      folderId: options?.folderId ?? null,
    }),
  });

  return parseResponse(response);
}

export async function shareDriveFileApi(
  fileId: string,
  input: ShareDriveInput,
): Promise<DriveShareItem> {
  const response = await fetch(`/api/v1/drive/files/${fileId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function shareDriveFolderApi(
  folderId: string,
  input: ShareDriveInput,
): Promise<DriveShareItem> {
  const response = await fetch(`/api/v1/drive/folders/${folderId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchDriveShares(params: {
  fileId?: string;
  folderId?: string;
}): Promise<{ items: DriveShareItem[] }> {
  const search = new URLSearchParams();
  if (params.fileId) {
    search.set("fileId", params.fileId);
  }
  if (params.folderId) {
    search.set("folderId", params.folderId);
  }

  const response = await fetch(`/api/v1/drive/shares?${search.toString()}`);
  return parseResponse(response);
}

export async function revokeDriveShare(shareId: string): Promise<void> {
  const response = await fetch(`/api/v1/drive/shares/${shareId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }
}

export async function deleteDriveFileApi(fileId: string): Promise<void> {
  const response = await fetch(`/api/v1/drive/files/${fileId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }
}

export async function fetchDriveStorageQuota(): Promise<DriveStorageQuota> {
  const response = await fetch("/api/v1/drive/quota");
  return parseResponse(response);
}

export async function fetchClientDrive(
  clientId?: string,
): Promise<{ items: ClientDriveFileItem[] }> {
  const url = clientId
    ? `/api/v1/clients/${clientId}/drive`
    : "/api/v1/drive";
  const response = await fetch(url);
  return parseResponse(response);
}

export function getDriveDownloadUrl(fileId: string): string {
  return `/api/v1/drive/files/${fileId}/download`;
}
