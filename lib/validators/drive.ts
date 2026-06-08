import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().trim().min(1).optional().nullable(),
});

export const shareDriveSchema = z.object({
  clientId: z.string().trim().min(1),
});

export const driveShareTargetSchema = z
  .object({
    fileId: z.string().trim().min(1).optional(),
    folderId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasFile = Boolean(value.fileId);
    const hasFolder = Boolean(value.folderId);

    if (hasFile === hasFolder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of fileId or folderId is required.",
      });
    }
  });

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type ShareDriveInput = z.infer<typeof shareDriveSchema>;
