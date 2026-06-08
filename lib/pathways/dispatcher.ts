import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  coachingPathways,
  organizations,
  pathwayEnrollments,
  pathwaySteps,
} from "@/lib/db/schema";
import { resolveCoachClerkUserId } from "@/lib/automations/service";
import type { RunPathwayInput } from "./types";
import { runPathwayWorkflow } from "./workflows/run-pathway";

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
  return (
    message.includes("pathway_enrollments_pathway_client_idx") ||
    message.includes("pathway_enrollments_idempotency_idx")
  );
}

export function resolvePathwayTriggerEventId(clientId: string): string {
  return `client.created:${clientId}`;
}

export async function dispatchPathwayEnrollment(
  organizationId: string,
  pathwayId: string,
  clientId: string,
  triggerEventId: string,
): Promise<{ started: boolean; skipped: boolean }> {
  const pathway = await getDb().query.coachingPathways.findFirst({
    where: and(
      eq(coachingPathways.organizationId, organizationId),
      eq(coachingPathways.id, pathwayId),
      eq(coachingPathways.isActive, true),
    ),
    columns: { id: true, coachClerkUserId: true },
  });

  if (!pathway) {
    return { started: false, skipped: true };
  }

  try {
    const [enrollment] = await getDb()
      .insert(pathwayEnrollments)
      .values({
        organizationId,
        pathwayId,
        clientId,
        triggerEventId,
        status: "pending",
      })
      .returning();

    const stepRows = await getDb().query.pathwaySteps.findMany({
      where: and(
        eq(pathwaySteps.organizationId, organizationId),
        eq(pathwaySteps.pathwayId, pathwayId),
      ),
      orderBy: [asc(pathwaySteps.sortOrder)],
    });

    if (stepRows.length === 0) {
      await getDb()
        .update(pathwayEnrollments)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(pathwayEnrollments.id, enrollment!.id));
      return { started: true, skipped: false };
    }

    const org = await getDb().query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { planTier: true },
    });

    const coachClerkUserId = await resolveCoachClerkUserId(
      organizationId,
      pathway.coachClerkUserId,
    );

    const runInput: RunPathwayInput = {
      enrollmentId: enrollment!.id,
      organizationId,
      pathwayId,
      clientId,
      coachClerkUserId,
      planTier: org?.planTier ?? "STARTER",
      steps: stepRows.map((row) => ({
        id: row.id,
        sortOrder: row.sortOrder,
        stepType: row.stepType,
        delayDays: row.delayDays,
        stepConfig: (row.stepConfig ?? {}) as Record<string, unknown>,
      })),
    };

    const { start } = await import("workflow/api");
    await start(runPathwayWorkflow, [runInput]);
    return { started: true, skipped: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { started: false, skipped: true };
    }
    throw error;
  }
}
