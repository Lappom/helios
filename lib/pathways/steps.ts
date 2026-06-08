import "server-only";

import { and, eq } from "drizzle-orm";
import { sleep } from "workflow";
import { getDb } from "@/lib/db";
import {
  pathwayEnrollments,
  pathwayStepLogs,
} from "@/lib/db/schema";
import { executePathwayStep } from "./actions";
import type { PathwayStepDetail, RunPathwayInput } from "./types";

export async function sleepDelayStep(delayDays: number): Promise<void> {
  "use step";
  await sleep(delayDays * 24 * 60 * 60 * 1000);
}

export async function executePathwayStepStep(
  input: RunPathwayInput,
  step: PathwayStepDetail,
  stepIndex: number,
): Promise<Record<string, unknown>> {
  "use step";

  const existing = await getDb().query.pathwayStepLogs.findFirst({
    where: and(
      eq(pathwayStepLogs.enrollmentId, input.enrollmentId),
      eq(pathwayStepLogs.stepId, step.id),
      eq(pathwayStepLogs.status, "completed"),
    ),
    columns: { id: true, output: true },
  });

  if (existing) {
    return (existing.output ?? {}) as Record<string, unknown>;
  }

  const started = Date.now();

  const [pendingLog] = await getDb()
    .insert(pathwayStepLogs)
    .values({
      organizationId: input.organizationId,
      enrollmentId: input.enrollmentId,
      stepId: step.id,
      status: "pending",
    })
    .onConflictDoNothing()
    .returning();

  if (!pendingLog) {
    const completed = await getDb().query.pathwayStepLogs.findFirst({
      where: and(
        eq(pathwayStepLogs.enrollmentId, input.enrollmentId),
        eq(pathwayStepLogs.stepId, step.id),
      ),
      columns: { output: true, status: true },
    });
    if (completed?.status === "completed") {
      return (completed.output ?? {}) as Record<string, unknown>;
    }
  }

  await getDb()
    .update(pathwayEnrollments)
    .set({ currentStepIndex: stepIndex })
    .where(eq(pathwayEnrollments.id, input.enrollmentId));

  try {
    const output =
      step.stepType === "wait"
        ? { waited: step.delayDays }
        : await executePathwayStep(step, {
            organizationId: input.organizationId,
            clientId: input.clientId,
            coachClerkUserId: input.coachClerkUserId,
            pathwayId: input.pathwayId,
            enrollmentId: input.enrollmentId,
          });

    await getDb()
      .update(pathwayStepLogs)
      .set({
        status: "completed",
        output,
        durationMs: Date.now() - started,
        error: null,
      })
      .where(
        and(
          eq(pathwayStepLogs.enrollmentId, input.enrollmentId),
          eq(pathwayStepLogs.stepId, step.id),
        ),
      );

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Step failed";
    await getDb()
      .update(pathwayStepLogs)
      .set({
        status: "failed",
        error: message,
        durationMs: Date.now() - started,
      })
      .where(
        and(
          eq(pathwayStepLogs.enrollmentId, input.enrollmentId),
          eq(pathwayStepLogs.stepId, step.id),
        ),
      );
    throw error;
  }
}

export async function markEnrollmentRunningStep(
  enrollmentId: string,
): Promise<void> {
  "use step";
  await getDb()
    .update(pathwayEnrollments)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(pathwayEnrollments.id, enrollmentId));
}

export async function markEnrollmentCompletedStep(
  enrollmentId: string,
): Promise<void> {
  "use step";
  await getDb()
    .update(pathwayEnrollments)
    .set({
      status: "completed",
      completedAt: new Date(),
      error: null,
    })
    .where(eq(pathwayEnrollments.id, enrollmentId));
}

export async function markEnrollmentFailedStep(
  enrollmentId: string,
  error: string,
): Promise<void> {
  "use step";
  await getDb()
    .update(pathwayEnrollments)
    .set({
      status: "failed",
      completedAt: new Date(),
      error,
    })
    .where(eq(pathwayEnrollments.id, enrollmentId));
}
