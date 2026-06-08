import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clientTags,
  notificationTemplates,
  organizations,
  programs,
  nutritionPlans,
  assessmentTemplates,
} from "@/lib/db/schema";
import { createAssessment } from "@/lib/assessments/service";
import { addClientTag, addClientTagById } from "@/lib/clients/service";
import { createCoachTask } from "@/lib/coach-tasks/service";
import { findOrCreateDirectConversation, sendMessage } from "@/lib/messaging/service";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { assignNutritionPlan } from "@/lib/nutrition/assignments";
import { assignProgram } from "@/lib/programs/assignments";
import type { PlanTier } from "@/lib/auth/types";
import type { AutomationActionDetail, ActionPreview } from "./types";
import type { AutomationActionType } from "@/lib/validators/automations";
import { validateActionConfig } from "@/lib/validators/automations";

export type ExecuteActionContext = {
  organizationId: string;
  clientId: string | null;
  coachClerkUserId: string;
  planTier: PlanTier;
  automationId: string;
  executionId: string;
  dryRun?: boolean;
};

async function resolvePlanTier(organizationId: string): Promise<PlanTier> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { planTier: true },
  });
  return org?.planTier ?? "STARTER";
}

export async function previewAction(
  action: AutomationActionDetail,
  context: ExecuteActionContext,
): Promise<ActionPreview> {
  try {
    validateActionConfig(action.actionType, action.actionConfig);
  } catch (error) {
    return {
      actionType: action.actionType,
      valid: false,
      message: error instanceof Error ? error.message : "Invalid configuration",
    };
  }

  if (!context.clientId) {
    const needsClient = action.actionType !== "send_notification";
    if (needsClient) {
      return {
        actionType: action.actionType,
        valid: false,
        message: "A client is required for this action.",
      };
    }
  }

  const resolved: Record<string, unknown> = {};

  switch (action.actionType) {
    case "assign_program": {
      const programId = String(action.actionConfig.programId ?? "");
      const program = await db.query.programs.findFirst({
        where: and(
          eq(programs.organizationId, context.organizationId),
          eq(programs.id, programId),
        ),
        columns: { id: true, name: true, status: true },
      });
      if (!program) {
        return {
          actionType: action.actionType,
          valid: false,
          message: "Program not found.",
        };
      }
      resolved.programName = program.name;
      resolved.programStatus = program.status;
      break;
    }
    case "assign_nutrition": {
      const planId = String(action.actionConfig.planId ?? "");
      const plan = await db.query.nutritionPlans.findFirst({
        where: and(
          eq(nutritionPlans.organizationId, context.organizationId),
          eq(nutritionPlans.id, planId),
        ),
        columns: { id: true, name: true, status: true },
      });
      if (!plan) {
        return {
          actionType: action.actionType,
          valid: false,
          message: "Nutrition plan not found.",
        };
      }
      resolved.planName = plan.name;
      break;
    }
    case "create_assessment": {
      const templateId = String(action.actionConfig.templateId ?? "");
      const template = await db.query.assessmentTemplates.findFirst({
        where: and(
          eq(assessmentTemplates.organizationId, context.organizationId),
          eq(assessmentTemplates.id, templateId),
        ),
        columns: { id: true, name: true },
      });
      if (!template) {
        return {
          actionType: action.actionType,
          valid: false,
          message: "Assessment template not found.",
        };
      }
      resolved.templateName = template.name;
      break;
    }
    case "send_notification": {
      if (action.actionConfig.templateId) {
        const template = await db.query.notificationTemplates.findFirst({
          where: and(
            eq(notificationTemplates.organizationId, context.organizationId),
            eq(notificationTemplates.id, String(action.actionConfig.templateId)),
          ),
          columns: { id: true, name: true, channel: true },
        });
        if (!template) {
          return {
            actionType: action.actionType,
            valid: false,
            message: "Notification template not found.",
          };
        }
        resolved.templateName = template.name;
        resolved.channel = template.channel;
      }
      break;
    }
    case "add_tag": {
      if (action.actionConfig.tagId) {
        const tag = await db.query.clientTags.findFirst({
          where: and(
            eq(clientTags.organizationId, context.organizationId),
            eq(clientTags.id, String(action.actionConfig.tagId)),
          ),
          columns: { id: true, name: true },
        });
        if (!tag) {
          return {
            actionType: action.actionType,
            valid: false,
            message: "Tag not found.",
          };
        }
        resolved.tagName = tag.name;
      } else {
        resolved.tagName = action.actionConfig.tagName;
      }
      break;
    }
    default:
      break;
  }

  return {
    actionType: action.actionType,
    valid: true,
    message: "Ready to execute.",
    resolved,
  };
}

export async function executeAutomationAction(
  action: AutomationActionDetail,
  context: ExecuteActionContext,
): Promise<Record<string, unknown>> {
  if (context.dryRun) {
    const preview = await previewAction(action, context);
    if (!preview.valid) {
      throw new Error(preview.message);
    }
    return preview.resolved ?? {};
  }

  validateActionConfig(action.actionType, action.actionConfig);

  const clientId = context.clientId;
  const {
    organizationId,
    coachClerkUserId,
    planTier,
    automationId,
    executionId,
  } = context;

  switch (action.actionType as AutomationActionType) {
    case "assign_program": {
      if (!clientId) throw new Error("Client is required.");
      const programId = String(action.actionConfig.programId);
      const startDate = action.actionConfig.startDate
        ? new Date(String(action.actionConfig.startDate))
        : new Date();
      const startMesocycleId = action.actionConfig.startMesocycleId
        ? String(action.actionConfig.startMesocycleId)
        : undefined;
      const result = await assignProgram(
        organizationId,
        programId,
        coachClerkUserId,
        { clientIds: [clientId], startDate, startMesocycleId },
      );
      return {
        created: result.created.length,
        skipped: result.skipped,
      };
    }
    case "assign_next_mesocycle": {
      if (!clientId) throw new Error("Client is required.");
      const programId = String(action.actionConfig.programId);
      const completedMesocycleId = String(
        action.actionConfig.completedMesocycleId,
      );
      const { asc, eq, and } = await import("drizzle-orm");
      const { db } = await import("@/lib/db");
      const { programMesocycles } = await import("@/lib/db/schema");
      const completed = await db.query.programMesocycles.findFirst({
        where: and(
          eq(programMesocycles.organizationId, organizationId),
          eq(programMesocycles.programId, programId),
          eq(programMesocycles.id, completedMesocycleId),
        ),
      });
      if (!completed) {
        throw new Error("Completed mesocycle not found.");
      }
      const candidates = await db.query.programMesocycles.findMany({
        where: and(
          eq(programMesocycles.organizationId, organizationId),
          eq(programMesocycles.programId, programId),
        ),
        orderBy: [asc(programMesocycles.sortOrder)],
      });
      const next = candidates.find(
        (row) => row.sortOrder > completed.sortOrder,
      );
      if (!next) {
        return { created: 0, skipped: [{ clientId, reason: "No next mesocycle." }] };
      }
      const startDate = action.actionConfig.startDate
        ? new Date(String(action.actionConfig.startDate))
        : new Date();
      const result = await assignProgram(
        organizationId,
        programId,
        coachClerkUserId,
        {
          clientIds: [clientId],
          startDate,
          startMesocycleId: next.id,
        },
      );
      return {
        created: result.created.length,
        skipped: result.skipped,
        nextMesocycleId: next.id,
      };
    }
    case "assign_nutrition": {
      if (!clientId) throw new Error("Client is required.");
      const planId = String(action.actionConfig.planId);
      const startDate = action.actionConfig.startDate
        ? new Date(String(action.actionConfig.startDate))
        : new Date();
      const result = await assignNutritionPlan(
        organizationId,
        planId,
        coachClerkUserId,
        { clientIds: [clientId], startDate },
      );
      return {
        created: result.created.length,
        skipped: result.skipped,
      };
    }
    case "create_assessment": {
      if (!clientId) throw new Error("Client is required.");
      const assessment = await createAssessment(
        organizationId,
        coachClerkUserId,
        {
          templateId: String(action.actionConfig.templateId),
          clientId,
          dueAt: action.actionConfig.dueAt
            ? String(action.actionConfig.dueAt)
            : undefined,
        },
        "manual",
      );
      return { assessmentId: assessment.id };
    }
    case "send_notification": {
      if (!clientId) throw new Error("Client is required.");
      const tier = planTier ?? (await resolvePlanTier(organizationId));

      if (action.actionConfig.templateId) {
        const template = await db.query.notificationTemplates.findFirst({
          where: and(
            eq(notificationTemplates.organizationId, organizationId),
            eq(notificationTemplates.id, String(action.actionConfig.templateId)),
          ),
        });
        if (!template) throw new Error("Notification template not found.");

        const result = await dispatchNotification({
          organizationId,
          planTier: tier,
          channel: template.channel,
          subject: template.subject ?? undefined,
          content: template.content,
          templateId: template.id,
          recipients: [{ clientId }],
          idempotencyKey: `automation:${executionId}:${action.id}`,
        });
        return { sent: result.sent, failed: result.failed };
      }

      const result = await dispatchNotification({
        organizationId,
        planTier: tier,
        channel: action.actionConfig.channel as "email" | "in_app" | "push",
        subject: action.actionConfig.subject
          ? String(action.actionConfig.subject)
          : undefined,
        content: String(action.actionConfig.content),
        recipients: [{ clientId }],
        idempotencyKey: `automation:${executionId}:${action.id}`,
      });
      return { sent: result.sent, failed: result.failed };
    }
    case "send_message": {
      if (!clientId) throw new Error("Client is required.");
      const conversation = await findOrCreateDirectConversation(
        organizationId,
        clientId,
        coachClerkUserId,
      );
      const message = await sendMessage(
        organizationId,
        conversation.id,
        { role: "coach", organizationId, clerkUserId: coachClerkUserId },
        {
          type: "text",
          content: String(action.actionConfig.content),
        },
      );
      return { messageId: message.id, conversationId: conversation.id };
    }
    case "add_tag": {
      if (!clientId) throw new Error("Client is required.");
      if (action.actionConfig.tagId) {
        const tags = await addClientTagById(
          organizationId,
          clientId,
          String(action.actionConfig.tagId),
        );
        return { tagCount: tags.length };
      }
      const tags = await addClientTag(
        organizationId,
        clientId,
        String(action.actionConfig.tagName),
        action.actionConfig.color
          ? String(action.actionConfig.color)
          : undefined,
      );
      return { tagCount: tags.length };
    }
    case "create_task": {
      if (!clientId) throw new Error("Client is required.");
      const task = await createCoachTask(organizationId, {
        clientId,
        title: String(action.actionConfig.title),
        description: action.actionConfig.description
          ? String(action.actionConfig.description)
          : undefined,
        dueDate: action.actionConfig.dueDate
          ? String(action.actionConfig.dueDate)
          : undefined,
        sourceAutomationId: automationId,
        createdByClerkUserId: coachClerkUserId,
      });
      return { taskId: task.id };
    }
    default:
      throw new Error(`Unsupported action type: ${action.actionType}`);
  }
}
