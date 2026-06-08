import { z } from "zod";
import type { PaginationParams } from "@/lib/api/pagination";

export const PATHWAY_STEP_TYPES = [
  "program",
  "assessment",
  "message",
  "wait",
] as const;

export const PATHWAY_ENROLLMENT_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type PathwayStepType = (typeof PATHWAY_STEP_TYPES)[number];
export type PathwayEnrollmentStatus =
  (typeof PATHWAY_ENROLLMENT_STATUSES)[number];

const assignProgramConfigSchema = z.object({
  programId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  startMesocycleId: z.string().min(1).optional(),
});

const createAssessmentConfigSchema = z.object({
  templateId: z.string().min(1),
  dueAt: z.string().datetime().optional(),
});

const sendMessageConfigSchema = z.object({
  content: z.string().min(1),
});

const waitConfigSchema = z.object({}).default({});

export const pathwayStepInputSchema = z
  .object({
    id: z.string().optional(),
    stepType: z.enum(PATHWAY_STEP_TYPES),
    delayDays: z.number().int().min(0).max(365).default(0),
    stepConfig: z.record(z.string(), z.unknown()).default({}),
    sortOrder: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.stepType === "wait" && value.delayDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wait steps require delayDays >= 1.",
        path: ["delayDays"],
      });
    }
  });

export const createPathwaySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  autoEnrollOnClientCreated: z.boolean().optional(),
  steps: z.array(pathwayStepInputSchema).min(1).max(30),
});

export const patchPathwaySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    autoEnrollOnClientCreated: z.boolean().optional(),
    steps: z.array(pathwayStepInputSchema).min(1).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const togglePathwaySchema = z.object({
  isActive: z.boolean(),
});

export function validateStepConfig(
  stepType: PathwayStepType,
  config: Record<string, unknown>,
): void {
  switch (stepType) {
    case "program":
      assignProgramConfigSchema.parse(config);
      break;
    case "assessment":
      createAssessmentConfigSchema.parse(config);
      break;
    case "message":
      sendMessageConfigSchema.parse(config);
      break;
    case "wait":
      waitConfigSchema.parse(config);
      break;
    default: {
      const _exhaustive: never = stepType;
      throw new Error(`Unknown step type: ${_exhaustive}`);
    }
  }
}

export function validatePathwaySteps(
  steps: z.infer<typeof pathwayStepInputSchema>[],
): void {
  for (const step of steps) {
    validateStepConfig(step.stepType, step.stepConfig);
  }
}

export type ListPathwaysQuery = PaginationParams & {
  search?: string;
  isActive?: boolean;
};

export function parseListPathwaysQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListPathwaysQuery {
  const search = searchParams.get("search")?.trim() || undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true"
      ? true
      : isActiveParam === "false"
        ? false
        : undefined;

  return {
    ...pagination,
    search,
    isActive,
  };
}

export type ListPathwayEnrollmentsQuery = PaginationParams;

export function parseListPathwayEnrollmentsQuery(
  _searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListPathwayEnrollmentsQuery {
  return { ...pagination };
}

export type CreatePathwayInput = z.infer<typeof createPathwaySchema>;
export type PatchPathwayInput = z.infer<typeof patchPathwaySchema>;
