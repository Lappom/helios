import { z } from "zod";

export const ASSESSMENT_FIELD_TYPES = [
  "text",
  "number",
  "select",
  "photo",
  "measurement",
] as const;

export const ASSESSMENT_FREQUENCIES = [
  "once",
  "weekly",
  "monthly",
  "custom",
] as const;

export const ASSESSMENT_STATUSES = [
  "pending",
  "submitted",
  "reviewed",
] as const;

const fieldConfigSchema = z
  .object({
    measurementKeys: z.array(z.string().min(1)).optional(),
    photoPose: z.string().trim().max(100).optional(),
    criticalWhen: z
      .object({
        op: z.enum(["gte", "lte", "eq"]),
        value: z.union([z.number(), z.string()]),
      })
      .optional(),
  })
  .nullable()
  .optional();

export const createAssessmentTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  frequency: z.enum(ASSESSMENT_FREQUENCIES).optional().default("monthly"),
  autoAssignOnProgramStart: z.boolean().optional().default(true),
  daysAfterProgramStart: z.number().int().min(1).max(365).optional().default(30),
  isDefault: z.boolean().optional().default(false),
});

export const patchAssessmentTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    frequency: z.enum(ASSESSMENT_FREQUENCIES).optional(),
    autoAssignOnProgramStart: z.boolean().optional(),
    daysAfterProgramStart: z.number().int().min(1).max(365).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createAssessmentFieldSchema = z.object({
  type: z.enum(ASSESSMENT_FIELD_TYPES),
  label: z.string().trim().min(1).max(200),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1)).nullable().optional(),
  config: fieldConfigSchema,
});

export const patchAssessmentFieldSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).nullable().optional(),
    config: fieldConfigSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderAssessmentFieldsSchema = z.object({
  fieldIds: z.array(z.string().min(1)).min(1),
});

export const createAssessmentSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  dueAt: z.string().datetime().optional(),
  programAssignmentId: z.string().min(1).optional(),
});

export const submitResponseSchema = z.object({
  fieldId: z.string().min(1),
  textValue: z.string().max(5000).nullable().optional(),
  numberValue: z.number().nullable().optional(),
  jsonValue: z.record(z.string(), z.number()).nullable().optional(),
  photoBlobPath: z.string().max(500).nullable().optional(),
});

export const submitAssessmentSchema = z.object({
  responses: z.array(submitResponseSchema).min(1),
});

export const reviewAssessmentSchema = z.object({
  coachNotes: z.string().trim().max(5000).optional(),
});

export function parseListAssessmentTemplatesQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  return {
    search: searchParams.get("search")?.trim() || undefined,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

export function parseListAssessmentsQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  const status = searchParams.get("status");
  return {
    status:
      status && ASSESSMENT_STATUSES.includes(status as (typeof ASSESSMENT_STATUSES)[number])
        ? (status as (typeof ASSESSMENT_STATUSES)[number])
        : undefined,
    clientId: searchParams.get("clientId")?.trim() || undefined,
    templateId: searchParams.get("templateId")?.trim() || undefined,
    criticalOnly: searchParams.get("criticalOnly") === "true",
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

export type CreateAssessmentTemplateInput = z.infer<
  typeof createAssessmentTemplateSchema
>;
export type PatchAssessmentTemplateInput = z.infer<
  typeof patchAssessmentTemplateSchema
>;
export type CreateAssessmentFieldInput = z.infer<
  typeof createAssessmentFieldSchema
>;
export type PatchAssessmentFieldInput = z.infer<
  typeof patchAssessmentFieldSchema
>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
export type ReviewAssessmentInput = z.infer<typeof reviewAssessmentSchema>;
