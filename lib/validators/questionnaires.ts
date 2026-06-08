import { z } from "zod";

export const QUESTIONNAIRE_TYPES = [
  "onboarding",
  "weekly_checkin",
  "custom",
] as const;

export const QUESTIONNAIRE_QUESTION_TYPES = [
  "scale",
  "text",
  "boolean",
  "select",
] as const;

export const QUESTIONNAIRE_SCHEDULE_TRIGGERS = [
  "on_client_created",
  "weekly_cron",
] as const;

export const QUESTIONNAIRE_SUBMISSION_STATUSES = [
  "pending",
  "submitted",
  "overdue",
] as const;

const scaleValueSchema = z.number().min(1).max(10);

export const createQuestionnaireSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(QUESTIONNAIRE_TYPES).optional().default("custom"),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const patchQuestionnaireSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createQuestionnaireQuestionSchema = z.object({
  type: z.enum(QUESTIONNAIRE_QUESTION_TYPES),
  label: z.string().trim().min(1).max(200),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1)).nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const patchQuestionnaireQuestionSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).nullable().optional(),
    config: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderQuestionnaireQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(20),
});

export const patchQuestionnaireScheduleSchema = z.object({
  triggerType: z.enum(QUESTIONNAIRE_SCHEDULE_TRIGGERS),
  sendDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  sendHourUtc: z.number().int().min(0).max(23).nullable().optional(),
  reminderDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  reminderHourUtc: z.number().int().min(0).max(23).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const questionnaireResponseSchema = z.object({
  questionId: z.string().min(1),
  textValue: z.string().max(5000).nullable().optional(),
  numberValue: scaleValueSchema.nullable().optional(),
  booleanValue: z.boolean().nullable().optional(),
});

export const submitQuestionnaireSchema = z.object({
  responses: z.array(questionnaireResponseSchema).min(1),
});

export function parseListQuestionnairesQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  const type = searchParams.get("type");
  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
    type:
      type && QUESTIONNAIRE_TYPES.includes(type as (typeof QUESTIONNAIRE_TYPES)[number])
        ? (type as (typeof QUESTIONNAIRE_TYPES)[number])
        : undefined,
    search: searchParams.get("search")?.trim() || undefined,
  };
}

export function parseListQuestionnaireSubmissionsQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  const status = searchParams.get("status");
  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
    status:
      status &&
      QUESTIONNAIRE_SUBMISSION_STATUSES.includes(
        status as (typeof QUESTIONNAIRE_SUBMISSION_STATUSES)[number],
      )
        ? (status as (typeof QUESTIONNAIRE_SUBMISSION_STATUSES)[number])
        : undefined,
    questionnaireId: searchParams.get("questionnaireId") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
  };
}

export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>;
export type PatchQuestionnaireInput = z.infer<typeof patchQuestionnaireSchema>;
export type CreateQuestionnaireQuestionInput = z.infer<
  typeof createQuestionnaireQuestionSchema
>;
export type PatchQuestionnaireQuestionInput = z.infer<
  typeof patchQuestionnaireQuestionSchema
>;
export type PatchQuestionnaireScheduleInput = z.infer<
  typeof patchQuestionnaireScheduleSchema
>;
export type SubmitQuestionnaireInput = z.infer<typeof submitQuestionnaireSchema>;
