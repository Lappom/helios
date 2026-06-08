import { z } from "zod";

export const FEEDBACK_QUESTION_TYPES = ["scale", "text", "boolean"] as const;

export const STANDARD_FEEDBACK_FIELDS = [
  "feeling",
  "difficulty",
  "fatigue",
  "motivation",
] as const;

const scaleValueSchema = z.number().int().min(1).max(10);

export const feedbackResponseSchema = z.object({
  questionId: z.string().min(1),
  textValue: z.string().max(5000).nullable().optional(),
  numberValue: scaleValueSchema.nullable().optional(),
  booleanValue: z.boolean().nullable().optional(),
});

export const submitSessionFeedbackSchema = z.object({
  feeling: scaleValueSchema,
  difficulty: scaleValueSchema,
  fatigue: scaleValueSchema,
  motivation: scaleValueSchema,
  painReported: z.boolean(),
  painDetails: z.string().max(2000).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  customResponses: z.array(feedbackResponseSchema).optional().default([]),
});

export const createFeedbackTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  isDefault: z.boolean().optional().default(false),
});

export const patchFeedbackTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createFeedbackQuestionSchema = z.object({
  type: z.enum(FEEDBACK_QUESTION_TYPES),
  label: z.string().trim().min(1).max(200),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1)).nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const patchFeedbackQuestionSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).nullable().optional(),
    config: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderFeedbackQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(5),
});

export function parseListClientFeedbacksQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

export function parseListFeedbackAlertsQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

export type SubmitSessionFeedbackInput = z.infer<
  typeof submitSessionFeedbackSchema
>;
export type CreateFeedbackTemplateInput = z.infer<
  typeof createFeedbackTemplateSchema
>;
export type PatchFeedbackTemplateInput = z.infer<
  typeof patchFeedbackTemplateSchema
>;
export type CreateFeedbackQuestionInput = z.infer<
  typeof createFeedbackQuestionSchema
>;
export type PatchFeedbackQuestionInput = z.infer<
  typeof patchFeedbackQuestionSchema
>;
