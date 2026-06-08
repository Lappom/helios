import { ALLOWED_DRIVE_MIME_TYPES } from "@/lib/storage/blob";
import { ALLOWED_VIDEO_MIME_TYPES } from "@/lib/validators/exercises";

const PHOTO_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VIDEO_MIME_TO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const FILE_MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
};

export const BLOB_CLIENT_UPLOAD_URL = "/api/v1/blob/upload";
export const MULTIPART_UPLOAD_THRESHOLD_BYTES = 100 * 1024 * 1024;

function extensionForMime(
  mimeType: string,
  maps: Record<string, string>[],
  fallback: string,
): string {
  for (const map of maps) {
    if (map[mimeType]) {
      return map[mimeType];
    }
  }
  return fallback;
}

export function buildDriveUploadPathname(
  organizationId: string,
  fileId: string,
  mimeType: string,
): string {
  const extension = extensionForMime(
    mimeType,
    [PHOTO_MIME_TO_EXTENSION, VIDEO_MIME_TO_EXTENSION, FILE_MIME_TO_EXTENSION],
    "bin",
  );
  return `drive/${organizationId}/${fileId}.${extension}`;
}

export function buildVodUploadPathname(
  organizationId: string,
  videoId: string,
  mimeType: string,
): string {
  const extension = VIDEO_MIME_TO_EXTENSION[mimeType] ?? "mp4";
  return `vod/${organizationId}/${videoId}.${extension}`;
}

export function buildVodThumbnailPathname(
  organizationId: string,
  videoId: string,
): string {
  return `vod/${organizationId}/${videoId}-thumb.jpg`;
}

export function parseDriveUploadPathname(pathname: string): {
  organizationId: string;
  fileId: string;
} | null {
  const match = /^drive\/([^/]+)\/([^/.]+)\.[^/]+$/.exec(pathname);
  if (!match) {
    return null;
  }

  return {
    organizationId: match[1]!,
    fileId: match[2]!,
  };
}

export function parseVodUploadPathname(pathname: string): {
  organizationId: string;
  videoId: string;
  isThumbnail: boolean;
} | null {
  const thumbMatch = /^vod\/([^/]+)\/([^/]+)-thumb\.jpg$/.exec(pathname);
  if (thumbMatch) {
    return {
      organizationId: thumbMatch[1]!,
      videoId: thumbMatch[2]!,
      isThumbnail: true,
    };
  }

  const match = /^vod\/([^/]+)\/([^/.]+)\.[^/]+$/.exec(pathname);
  if (!match) {
    return null;
  }

  return {
    organizationId: match[1]!,
    videoId: match[2]!,
    isThumbnail: false,
  };
}

export function isAllowedDriveMimeType(mimeType: string): boolean {
  return ALLOWED_DRIVE_MIME_TYPES.includes(
    mimeType as (typeof ALLOWED_DRIVE_MIME_TYPES)[number],
  );
}

export function isAllowedVodMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_MIME_TYPES.includes(
    mimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number],
  );
}
