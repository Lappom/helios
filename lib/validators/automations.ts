import { z } from "zod";
import type { PaginationParams } from "@/lib/api/pagination";

export const AUTOMATION_TRIGGER_TYPES = [
  "payment_received",
  "client_created",
  "form_completed",
  "session_completed",
  "assessment_submitted",
  "schedule_cron",
  "subscription_renewal_due",
] as const;

export const AUTOMATION_ACTION_TYPES = [
  "assign_program",
  "assign_nutrition",
  "create_assessment",
  "send_notification",
  "send_message",
  "add_tag",
  "create_task",
] as const;

export const AUTOMATION_EXECUTION_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];
export type AutomationExecutionStatus =
  (typeof AUTOMATION_EXECUTION_STATUSES)[number];

const cronTriggerConfigSchema = z.object({
  cron: z.string().min(1),
  timezone: z.string().optional(),
});

const assignProgramConfigSchema = z.object({
  programId: z.string().min(1),
  startDate: z.string().datetime().optional(),
});

const assignNutritionConfigSchema = z.object({
  planId: z.string().min(1),
  startDate: z.string().datetime().optional(),
});

const createAssessmentConfigSchema = z.object({
  templateId: z.string().min(1),
  dueAt: z.string().datetime().optional(),
});

const sendNotificationTemplateConfigSchema = z.object({
  templateId: z.string().min(1),
});

const sendNotificationInlineConfigSchema = z.object({
  channel: z.enum(["email", "in_app", "push"]),
  subject: z.string().optional(),
  content: z.string().min(1),
});

const sendMessageConfigSchema = z.object({
  content: z.string().min(1),
});

const addTagByIdConfigSchema = z.object({
  tagId: z.string().min(1),
});

const addTagByNameConfigSchema = z.object({
  tagName: z.string().min(1),
  color: z.string().optional(),
});

const createTaskConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export const automationActionInputSchema = z.object({
  id: z.string().optional(),
  actionType: z.enum(AUTOMATION_ACTION_TYPES),
  actionConfig: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().min(0).optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES),
  triggerConfig: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().optional(),
  actions: z.array(automationActionInputSchema).min(1).max(20),
});

export const patchAutomationSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    triggerType: z.enum(AUTOMATION_TRIGGER_TYPES).optional(),
    triggerConfig: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
    actions: z.array(automationActionInputSchema).min(1).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const testAutomationSchema = z.object({
  clientId: z.string().optional(),
});

export function validateActionConfig(
  actionType: AutomationActionType,
  config: Record<string, unknown>,
): void {
  switch (actionType) {
    case "assign_program":
      assignProgramConfigSchema.parse(config);
      break;
    case "assign_nutrition":
      assignNutritionConfigSchema.parse(config);
      break;
    case "create_assessment":
      createAssessmentConfigSchema.parse(config);
      break;
    case "send_notification":
      if ("templateId" in config && config.templateId) {
        sendNotificationTemplateConfigSchema.parse(config);
      } else {
        sendNotificationInlineConfigSchema.parse(config);
      }
      break;
    case "send_message":
      sendMessageConfigSchema.parse(config);
      break;
    case "add_tag":
      if ("tagId" in config && config.tagId) {
        addTagByIdConfigSchema.parse(config);
      } else {
        addTagByNameConfigSchema.parse(config);
      }
      break;
    case "create_task":
      createTaskConfigSchema.parse(config);
      break;
    default:
      break;
  }
}

export function validateTriggerConfig(
  triggerType: AutomationTriggerType,
  config: Record<string, unknown>,
): void {
  if (triggerType === "schedule_cron") {
    cronTriggerConfigSchema.parse(config);
  }
}

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type PatchAutomationInput = z.infer<typeof patchAutomationSchema>;
export type TestAutomationInput = z.infer<typeof testAutomationSchema>;
export type AutomationActionInput = z.infer<typeof automationActionInputSchema>;

export type ListAutomationsQuery = {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  isActive?: boolean;
};

export type ListExecutionsQuery = {
  page: number;
  limit: number;
  offset: number;
  status?: AutomationExecutionStatus;
};

export function parseListAutomationsQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListAutomationsQuery {
  const search = searchParams.get("search")?.trim() || undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true"
      ? true
      : isActiveParam === "false"
        ? false
        : undefined;

  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
    search,
    isActive,
  };
}

export function parseListExecutionsQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListExecutionsQuery {
  const statusParam = searchParams.get("status");
  const status = AUTOMATION_EXECUTION_STATUSES.includes(
    statusParam as AutomationExecutionStatus,
  )
    ? (statusParam as AutomationExecutionStatus)
    : undefined;

  return {
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
    status,
  };
}
