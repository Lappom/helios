import { z } from "zod";
import { createUploadVideoMetadataSchema } from "@/lib/validators/videos";

export const blobUploadClientPayloadSchema = z.object({
  uploadType: z.enum(["drive", "vod", "vod_thumbnail"]),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().trim().min(1),
});

export const registerDriveFileUploadSchema = z.object({
  pathname: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  folderId: z.string().trim().min(1).nullable().optional(),
});

export const registerVodUploadSchema = z.object({
  pathname: z.string().trim().min(1),
  thumbnailPathname: z.string().trim().min(1).nullable().optional(),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  metadata: createUploadVideoMetadataSchema,
});

export type RegisterDriveFileUploadInput = z.infer<
  typeof registerDriveFileUploadSchema
>;
export type RegisterVodUploadInput = z.infer<typeof registerVodUploadSchema>;
