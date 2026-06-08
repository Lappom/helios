import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  actionLogs,
  automationExecutions,
  organizations,
} from "@/lib/db/schema";
import { executeAutomationAction } from "./actions";
import type { AutomationActionDetail, RunAutomationInput } from "./types";

export async function executeAutomationActionStep(
  input: RunAutomationInput,
  action: AutomationActionDetail,
): Promise<Record<string, unknown>> {
  "use step";

  const existing = await db.query.actionLogs.findFirst({
    where: and(
      eq(actionLogs.executionId, input.executionId),
      eq(actionLogs.actionId, action.id),
      eq(actionLogs.status, "completed"),
    ),
    columns: { id: true, output: true },
  });

  if (existing) {
    return (existing.output ?? {}) as Record<string, unknown>;
  }

  const started = Date.now();

  const [pendingLog] = await db
    .insert(actionLogs)
    .values({
      organizationId: input.organizationId,
      executionId: input.executionId,
      actionId: action.id,
      status: "pending",
    })
    .onConflictDoNothing()
    .returning();

  if (!pendingLog) {
    const completed = await db.query.actionLogs.findFirst({
      where: and(
        eq(actionLogs.executionId, input.executionId),
        eq(actionLogs.actionId, action.id),
      ),
      columns: { output: true, status: true },
    });
    if (completed?.status === "completed") {
      return (completed.output ?? {}) as Record<string, unknown>;
    }
  }

  try {
    const output = await executeAutomationAction(action, {
      organizationId: input.organizationId,
      clientId: input.clientId,
      coachClerkUserId: input.coachClerkUserId,
      planTier: input.planTier,
      automationId: input.automationId,
      executionId: input.executionId,
    });

    await db
      .update(actionLogs)
      .set({
        status: "completed",
        output,
        durationMs: Date.now() - started,
        error: null,
      })
      .where(
        and(
          eq(actionLogs.executionId, input.executionId),
          eq(actionLogs.actionId, action.id),
        ),
      );

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    await db
      .update(actionLogs)
      .set({
        status: "failed",
        error: message,
        durationMs: Date.now() - started,
      })
      .where(
        and(
          eq(actionLogs.executionId, input.executionId),
          eq(actionLogs.actionId, action.id),
        ),
      );
    throw error;
  }
}

export async function markExecutionRunningStep(executionId: string): Promise<void> {
  "use step";
  await db
    .update(automationExecutions)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(automationExecutions.id, executionId));
}

export async function markExecutionCompletedStep(executionId: string): Promise<void> {
  "use step";
  await db
    .update(automationExecutions)
    .set({
      status: "completed",
      completedAt: new Date(),
      error: null,
    })
    .where(eq(automationExecutions.id, executionId));
}

export async function markExecutionFailedStep(
  executionId: string,
  error: string,
): Promise<void> {
  "use step";
  await db
    .update(automationExecutions)
    .set({
      status: "failed",
      completedAt: new Date(),
      error,
    })
    .where(eq(automationExecutions.id, executionId));
}

export async function resolvePlanTierStep(
  organizationId: string,
): Promise<import("@/lib/auth/types").PlanTier> {
  "use step";
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { planTier: true },
  });
  return org?.planTier ?? "STARTER";
}
