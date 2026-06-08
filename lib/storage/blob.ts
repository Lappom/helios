import { get, put } from "@vercel/blob";
import { createId } from "@/lib/db/id";
import type { PlanTier } from "@/lib/auth/types";
import { getPlanLimit } from "@/lib/billing/plans";
import { problem } from "@/lib/api/response";
import { ALLOWED_VIDEO_MIME_TYPES } from "@/lib/validators/exercises";

const VIDEO_MIME_TO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const PHOTO_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function assertExerciseVideoUploadAllowed(
  planTier: PlanTier,
  file: File,
): void {
  if (!ALLOWED_VIDEO_MIME_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_MIME_TYPES)[number])) {
    throw problem({
      type: "validation-error",
      title: "Unsupported video format",
      status: 400,
      detail: "Allowed formats: MP4, MOV, WebM.",
    });
  }

  const maxBytes = getPlanLimit(planTier, "exerciseVideo");
  if (file.size > maxBytes) {
    throw problem({
      type: "quota-exceeded",
      title: "Video too large",
      status: 413,
      detail: `Maximum video size for your plan is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }
}

export async function putExerciseVideo(
  file: File,
  organizationId: string,
): Promise<{ url: string; pathname: string }> {
  const extension = VIDEO_MIME_TO_EXTENSION[file.type] ?? "mp4";
  const pathname = `exercises/${organizationId}/${createId()}.${extension}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return { url: blob.url, pathname: blob.pathname };
}

export function assertAssessmentPhotoUploadAllowed(file: File): void {
  if (
    !ALLOWED_PHOTO_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number],
    )
  ) {
    throw problem({
      type: "validation-error",
      title: "Unsupported image format",
      status: 400,
      detail: "Allowed formats: JPEG, PNG, WebP.",
    });
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw problem({
      type: "quota-exceeded",
      title: "Image too large",
      status: 413,
      detail: "Maximum photo size is 10 MB.",
    });
  }
}

export async function putAssessmentPhoto(
  file: File,
  params: {
    organizationId: string;
    clientId: string;
    assessmentId: string;
    fieldId: string;
  },
): Promise<{ pathname: string }> {
  assertAssessmentPhotoUploadAllowed(file);
  const extension = PHOTO_MIME_TO_EXTENSION[file.type] ?? "jpg";
  const pathname = `assessments/${params.organizationId}/${params.clientId}/${params.assessmentId}/${params.fieldId}.${extension}`;

  await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return { pathname };
}

export async function putCoachProfilePhoto(
  file: File,
  organizationId: string,
  profileId: string,
): Promise<{ url: string; pathname: string }> {
  assertAssessmentPhotoUploadAllowed(file);
  const extension = PHOTO_MIME_TO_EXTENSION[file.type] ?? "jpg";
  const pathname = `coach-profiles/${organizationId}/${profileId}.${extension}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return { url: blob.url, pathname: blob.pathname };
}

export async function getAssessmentPhotoBlob(pathname: string) {
  return get(pathname, { access: "private" });
}

const AUDIO_MIME_TO_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
};

const FILE_MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
};

export const ALLOWED_MESSAGE_IMAGE_MIME_TYPES = ALLOWED_PHOTO_MIME_TYPES;
export const ALLOWED_MESSAGE_VIDEO_MIME_TYPES = ALLOWED_VIDEO_MIME_TYPES;
export const ALLOWED_MESSAGE_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
] as const;

export const ALLOWED_MESSAGE_FILE_MIME_TYPES = [
  "application/pdf",
  "text/plain",
] as const;

const MAX_MESSAGE_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_MESSAGE_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_MESSAGE_FILE_BYTES = 25 * 1024 * 1024;

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

export function inferMessageMediaType(
  mimeType: string,
): "image" | "video" | "audio" | "file" {
  if (
    ALLOWED_MESSAGE_IMAGE_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MESSAGE_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return "image";
  }
  if (
    ALLOWED_MESSAGE_VIDEO_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MESSAGE_VIDEO_MIME_TYPES)[number],
    )
  ) {
    return "video";
  }
  if (
    ALLOWED_MESSAGE_AUDIO_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MESSAGE_AUDIO_MIME_TYPES)[number],
    )
  ) {
    return "audio";
  }
  return "file";
}

export function assertMessageMediaUploadAllowed(file: File): void {
  const mediaType = inferMessageMediaType(file.type);

  if (mediaType === "image") {
    assertAssessmentPhotoUploadAllowed(file);
    return;
  }

  if (mediaType === "video") {
    if (
      !ALLOWED_MESSAGE_VIDEO_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MESSAGE_VIDEO_MIME_TYPES)[number],
      )
    ) {
      throw problem({
        type: "validation-error",
        title: "Unsupported video format",
        status: 400,
        detail: "Allowed formats: MP4, MOV, WebM.",
      });
    }
    if (file.size > MAX_MESSAGE_VIDEO_BYTES) {
      throw problem({
        type: "quota-exceeded",
        title: "Video too large",
        status: 413,
        detail: "Maximum video size is 100 MB.",
      });
    }
    return;
  }

  if (mediaType === "audio") {
    if (
      !ALLOWED_MESSAGE_AUDIO_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MESSAGE_AUDIO_MIME_TYPES)[number],
      )
    ) {
      throw problem({
        type: "validation-error",
        title: "Unsupported audio format",
        status: 400,
        detail: "Allowed formats: WebM, MP4, MP3, OGG.",
      });
    }
    if (file.size > MAX_MESSAGE_AUDIO_BYTES) {
      throw problem({
        type: "quota-exceeded",
        title: "Audio too large",
        status: 413,
        detail: "Maximum audio size is 10 MB.",
      });
    }
    return;
  }

  if (
    !ALLOWED_MESSAGE_FILE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MESSAGE_FILE_MIME_TYPES)[number],
    )
  ) {
    throw problem({
      type: "validation-error",
      title: "Unsupported file format",
      status: 400,
      detail: "Allowed formats: PDF, TXT.",
    });
  }

  if (file.size > MAX_MESSAGE_FILE_BYTES) {
    throw problem({
      type: "quota-exceeded",
      title: "File too large",
      status: 413,
      detail: "Maximum file size is 25 MB.",
    });
  }
}

export async function putMessageMedia(
  file: File,
  params: {
    organizationId: string;
    conversationId: string;
    messageId: string;
  },
): Promise<{ pathname: string; mimeType: string; fileName: string }> {
  assertMessageMediaUploadAllowed(file);

  const extension = extensionForMime(
    file.type,
    [PHOTO_MIME_TO_EXTENSION, VIDEO_MIME_TO_EXTENSION, AUDIO_MIME_TO_EXTENSION, FILE_MIME_TO_EXTENSION],
    "bin",
  );
  const pathname = `messages/${params.organizationId}/${params.conversationId}/${params.messageId}.${extension}`;

  await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return {
    pathname,
    mimeType: file.type,
    fileName: file.name,
  };
}

export async function getMessageMediaBlob(pathname: string) {
  return get(pathname, { access: "private" });
}
