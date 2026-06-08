import { z } from "zod";
import { isValidYoutubeUrl } from "@/lib/videos/youtube";

export const videoVisibilitySchema = z.enum(["all_clients", "selected"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().trim().min(1)).min(1),
});

const videoMetadataFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  visibility: videoVisibilitySchema.default("all_clients"),
  clientIds: z.array(z.string().trim().min(1)).optional(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
};

export const createYoutubeVideoSchema = z
  .object({
    ...videoMetadataFields,
    youtubeUrl: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    if (!isValidYoutubeUrl(value.youtubeUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid YouTube URL.",
        path: ["youtubeUrl"],
      });
    }

    if (
      value.visibility === "selected" &&
      (!value.clientIds || value.clientIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one client is required for selected visibility.",
        path: ["clientIds"],
      });
    }
  });

export const createUploadVideoMetadataSchema = z
  .object(videoMetadataFields)
  .superRefine((value, ctx) => {
    if (
      value.visibility === "selected" &&
      (!value.clientIds || value.clientIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one client is required for selected visibility.",
        path: ["clientIds"],
      });
    }
  });

export const updateVideoSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  visibility: videoVisibilitySchema.optional(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
});

export const setVideoAccessSchema = z.object({
  clientIds: z.array(z.string().trim().min(1)),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type CreateYoutubeVideoInput = z.infer<typeof createYoutubeVideoSchema>;
export type CreateUploadVideoMetadataInput = z.infer<
  typeof createUploadVideoMetadataSchema
>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type SetVideoAccessInput = z.infer<typeof setVideoAccessSchema>;
