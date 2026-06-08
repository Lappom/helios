import { z } from "zod";

export const MESSAGE_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "file",
] as const;

export const createDirectConversationSchema = z.object({
  clientId: z.string().min(1),
});

export const sendMessageSchema = z
  .object({
    type: z.enum(MESSAGE_TYPES),
    content: z.string().trim().max(10000).optional(),
    mediaPathname: z.string().trim().min(1).optional(),
    fileName: z.string().trim().max(255).optional(),
    mimeType: z.string().trim().max(100).optional(),
    durationSeconds: z.number().int().min(1).max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "text") {
      if (!value.content?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Text content is required for text messages.",
          path: ["content"],
        });
      }
      return;
    }

    if (!value.mediaPathname) {
      ctx.addIssue({
        code: "custom",
        message: "mediaPathname is required for media messages.",
        path: ["mediaPathname"],
      });
    }
  });

export const markReadSchema = z.object({
  messageId: z.string().min(1).optional(),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parseListMessagesQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number },
) {
  return listMessagesQuerySchema.parse({
    page: pagination.page,
    limit: pagination.limit,
  });
}

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
