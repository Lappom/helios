import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  automationActions,
  automationExecutions,
  automations,
  organizations,
} from "@/lib/db/schema";
import type { HeliosEventName, HeliosEventPayload } from "@/lib/events/types";
import { resolveCoachClerkUserId } from "./service";
import type { AutomationTriggerPayload, RunAutomationInput } from "./types";
import { resolveTriggerEventId } from "./trigger-event-id";
import { runAutomationWorkflow } from "./workflows/run-automation";
import type { AutomationTriggerType } from "@/lib/validators/automations";

export type { AutomationTriggerPayload } from "./types";

const EVENT_TO_TRIGGER: Partial<
  Record<HeliosEventName, AutomationTriggerType>
> = {
  "payment.received": "payment_received",
  "client.created": "client_created",
  "assessment.submitted": "assessment_submitted",
  "session.completed": "session_completed",
  "form.completed": "form_completed",
};

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code: string }).code === "23505") {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : "";
  return message.includes("automation_executions_idempotency_idx");
}

export { resolveTriggerEventId } from "./trigger-event-id";

export async function dispatchAutomationTrigger(
  triggerType: AutomationTriggerType,
  payload: AutomationTriggerPayload,
): Promise<{ started: number; skipped: number }> {
  const { organizationId, clientId } = payload;
  const triggerEventId = resolveTriggerEventId(triggerType, payload);

  const rows = await getDb().query.automations.findMany({
    where: and(
      eq(automations.organizationId, organizationId),
      eq(automations.isActive, true),
      eq(automations.triggerType, triggerType),
    ),
    columns: { id: true, createdByClerkUserId: true },
  });

  let started = 0;
  let skipped = 0;

  for (const automation of rows) {
    try {
      const [execution] = await getDb()
        .insert(automationExecutions)
        .values({
          organizationId,
          automationId: automation.id,
          clientId: clientId ?? null,
          triggerEventId,
          triggerType,
          status: "pending",
        })
        .returning();

      const actionRows = await getDb().query.automationActions.findMany({
        where: and(
          eq(automationActions.organizationId, organizationId),
          eq(automationActions.automationId, automation.id),
        ),
        orderBy: [asc(automationActions.sortOrder)],
      });

      const org = await getDb().query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
        columns: { planTier: true },
      });

      const coachClerkUserId = await resolveCoachClerkUserId(
        organizationId,
        automation.createdByClerkUserId ?? "system",
      );

      const runInput: RunAutomationInput = {
        executionId: execution!.id,
        organizationId,
        automationId: automation.id,
        clientId: clientId ?? null,
        coachClerkUserId,
        planTier: org?.planTier ?? "STARTER",
        actions: actionRows.map((row) => ({
          id: row.id,
          sortOrder: row.sortOrder,
          actionType: row.actionType,
          actionConfig: (row.actionConfig ?? {}) as Record<string, unknown>,
        })),
      };

      const { start } = await import("workflow/api");
      await start(runAutomationWorkflow, [runInput]);
      started += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped += 1;
        continue;
      }
      console.error(
        `[automations] failed to start automation ${automation.id}`,
        error,
      );
    }
  }

  return { started, skipped };
}

export async function handleAutomationEvent<T extends HeliosEventName>(
  name: T,
  payload: HeliosEventPayload[T],
): Promise<void> {
  const triggerType = EVENT_TO_TRIGGER[name];
  if (!triggerType) return;

  const base = payload as {
    organizationId: string;
    clientId?: string;
    paymentId?: string;
    assessmentId?: string;
    sessionLogId?: string;
    feedbackId?: string;
  };

  await dispatchAutomationTrigger(triggerType, {
    organizationId: base.organizationId,
    clientId: base.clientId,
    triggerEventId: resolveTriggerEventId(triggerType, {
      organizationId: base.organizationId,
      clientId: base.clientId,
      triggerEventId: "",
      metadata: base as Record<string, unknown>,
    }),
    metadata: base as Record<string, unknown>,
  });
}
