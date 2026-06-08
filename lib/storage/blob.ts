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

export async function getAssessmentPhotoBlob(pathname: string) {
  return get(pathname, { access: "private" });
}
