import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import {
  coachingPathways,
  pathwayEnrollments,
  pathwaySteps,
} from "@/lib/db/schema";
import type {
  CreatePathwayInput,
  ListPathwayEnrollmentsQuery,
  ListPathwaysQuery,
  PatchPathwayInput,
} from "@/lib/validators/pathways";
import { validatePathwaySteps } from "@/lib/validators/pathways";
import type {
  PathwayEnrollmentItem,
  PathwayListItem,
  PathwayStepDetail,
  PathwayTree,
} from "./types";
import type { PathwayEnrollmentStatus } from "@/lib/validators/pathways";

function mapStep(row: typeof pathwaySteps.$inferSelect): PathwayStepDetail {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    stepType: row.stepType,
    delayDays: row.delayDays,
    stepConfig: (row.stepConfig ?? {}) as Record<string, unknown>,
  };
}

async function getLastEnrollment(
  organizationId: string,
  pathwayId: string,
): Promise<{ at: string; status: PathwayEnrollmentStatus } | null> {
  const row = await getDb().query.pathwayEnrollments.findFirst({
    where: and(
      eq(pathwayEnrollments.organizationId, organizationId),
      eq(pathwayEnrollments.pathwayId, pathwayId),
    ),
    orderBy: [desc(pathwayEnrollments.createdAt)],
    columns: { createdAt: true, status: true },
  });
  if (!row) return null;
  return {
    at: row.createdAt.toISOString(),
    status: row.status,
  };
}

function mapListItem(
  row: typeof coachingPathways.$inferSelect,
  stepCount: number,
  lastEnrollment: { at: string; status: PathwayEnrollmentStatus } | null,
): PathwayListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    autoEnrollOnClientCreated: row.autoEnrollOnClientCreated,
    stepCount,
    lastEnrollmentAt: lastEnrollment?.at ?? null,
    lastEnrollmentStatus: lastEnrollment?.status ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getPathwayOrThrow(organizationId: string, pathwayId: string) {
  const row = await getDb().query.coachingPathways.findFirst({
    where: and(
      eq(coachingPathways.organizationId, organizationId),
      eq(coachingPathways.id, pathwayId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Pathway not found",
      status: 404,
      detail: `Pathway ${pathwayId} was not found.`,
    });
  }

  return row;
}

async function clearOtherAutoEnroll(
  organizationId: string,
  excludePathwayId: string,
): Promise<void> {
  await getDb()
    .update(coachingPathways)
    .set({ autoEnrollOnClientCreated: false })
    .where(
      and(
        eq(coachingPathways.organizationId, organizationId),
        eq(coachingPathways.autoEnrollOnClientCreated, true),
        ne(coachingPathways.id, excludePathwayId),
      ),
    );
}

async function replaceSteps(
  organizationId: string,
  pathwayId: string,
  steps: CreatePathwayInput["steps"],
): Promise<void> {
  await getDb()
    .delete(pathwaySteps)
    .where(
      and(
        eq(pathwaySteps.organizationId, organizationId),
        eq(pathwaySteps.pathwayId, pathwayId),
      ),
    );

  if (steps.length === 0) return;

  await getDb().insert(pathwaySteps).values(
    steps.map((step, index) => ({
      organizationId,
      pathwayId,
      sortOrder: step.sortOrder ?? index,
      stepType: step.stepType,
      delayDays: step.delayDays ?? 0,
      stepConfig: step.stepConfig,
    })),
  );
}

export async function listPathways(
  organizationId: string,
  query: ListPathwaysQuery,
): Promise<{ items: PathwayListItem[]; total: number }> {
  const filters: SQL[] = [eq(coachingPathways.organizationId, organizationId)];

  if (query.search) {
    filters.push(ilike(coachingPathways.name, `%${query.search}%`));
  }
  if (query.isActive !== undefined) {
    filters.push(eq(coachingPathways.isActive, query.isActive));
  }

  const whereClause = and(...filters);

  const [rows, totalRow] = await Promise.all([
    getDb().query.coachingPathways.findMany({
      where: whereClause,
      orderBy: [desc(coachingPathways.updatedAt)],
      limit: query.limit,
      offset: query.offset,
    }),
    getDb().select({ value: count() }).from(coachingPathways).where(whereClause),
  ]);

  const items = await Promise.all(
    rows.map(async (row) => {
      const stepRows = await getDb().query.pathwaySteps.findMany({
        where: eq(pathwaySteps.pathwayId, row.id),
        columns: { id: true },
      });
      const lastEnrollment = await getLastEnrollment(organizationId, row.id);
      return mapListItem(row, stepRows.length, lastEnrollment);
    }),
  );

  return { items, total: totalRow[0]?.value ?? 0 };
}

export async function getPathwayTree(
  organizationId: string,
  pathwayId: string,
): Promise<PathwayTree> {
  const row = await getPathwayOrThrow(organizationId, pathwayId);
  const stepRows = await getDb().query.pathwaySteps.findMany({
    where: and(
      eq(pathwaySteps.organizationId, organizationId),
      eq(pathwaySteps.pathwayId, pathwayId),
    ),
    orderBy: [asc(pathwaySteps.sortOrder)],
  });
  const lastEnrollment = await getLastEnrollment(organizationId, pathwayId);
  const base = mapListItem(row, stepRows.length, lastEnrollment);
  return {
    ...base,
    steps: stepRows.map(mapStep),
  };
}

export async function createPathway(
  organizationId: string,
  coachClerkUserId: string,
  input: CreatePathwayInput,
): Promise<PathwayTree> {
  validatePathwaySteps(input.steps);

  const [created] = await getDb()
    .insert(coachingPathways)
    .values({
      organizationId,
      coachClerkUserId,
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? false,
      autoEnrollOnClientCreated: input.autoEnrollOnClientCreated ?? false,
    })
    .returning();

  if (created!.autoEnrollOnClientCreated) {
    await clearOtherAutoEnroll(organizationId, created!.id);
  }

  await replaceSteps(organizationId, created!.id, input.steps);
  return getPathwayTree(organizationId, created!.id);
}

export async function patchPathway(
  organizationId: string,
  pathwayId: string,
  input: PatchPathwayInput,
): Promise<PathwayTree> {
  await getPathwayOrThrow(organizationId, pathwayId);

  if (input.steps) {
    validatePathwaySteps(input.steps);
  }

  if (input.autoEnrollOnClientCreated) {
    await clearOtherAutoEnroll(organizationId, pathwayId);
  }

  await getDb()
    .update(coachingPathways)
    .set({
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      isActive: input.isActive,
      autoEnrollOnClientCreated: input.autoEnrollOnClientCreated,
    })
    .where(
      and(
        eq(coachingPathways.organizationId, organizationId),
        eq(coachingPathways.id, pathwayId),
      ),
    );

  if (input.steps) {
    await replaceSteps(organizationId, pathwayId, input.steps);
  }

  return getPathwayTree(organizationId, pathwayId);
}

export async function deletePathway(
  organizationId: string,
  pathwayId: string,
): Promise<void> {
  await getPathwayOrThrow(organizationId, pathwayId);

  await getDb()
    .delete(coachingPathways)
    .where(
      and(
        eq(coachingPathways.organizationId, organizationId),
        eq(coachingPathways.id, pathwayId),
      ),
    );
}

export async function togglePathway(
  organizationId: string,
  pathwayId: string,
  isActive: boolean,
): Promise<PathwayTree> {
  const existing = await getPathwayOrThrow(organizationId, pathwayId);

  if (isActive) {
    const stepRows = await getDb().query.pathwaySteps.findMany({
      where: and(
        eq(pathwaySteps.organizationId, organizationId),
        eq(pathwaySteps.pathwayId, pathwayId),
      ),
      orderBy: [asc(pathwaySteps.sortOrder)],
    });

    if (stepRows.length === 0) {
      throw problem({
        type: "validation-error",
        title: "Pathway has no steps",
        status: 422,
        detail: "Add at least one step before activating the pathway.",
      });
    }

    validatePathwaySteps(
      stepRows.map((row) => ({
        stepType: row.stepType,
        delayDays: row.delayDays,
        stepConfig: (row.stepConfig ?? {}) as Record<string, unknown>,
      })),
    );
  }

  await getDb()
    .update(coachingPathways)
    .set({ isActive })
    .where(
      and(
        eq(coachingPathways.organizationId, organizationId),
        eq(coachingPathways.id, pathwayId),
      ),
    );

  if (!isActive && existing.autoEnrollOnClientCreated) {
    await getDb()
      .update(coachingPathways)
      .set({ autoEnrollOnClientCreated: false })
      .where(
        and(
          eq(coachingPathways.organizationId, organizationId),
          eq(coachingPathways.id, pathwayId),
        ),
      );
  }

  return getPathwayTree(organizationId, pathwayId);
}

export async function listPathwayEnrollments(
  organizationId: string,
  pathwayId: string,
  query: ListPathwayEnrollmentsQuery,
): Promise<{ items: PathwayEnrollmentItem[]; total: number }> {
  await getPathwayOrThrow(organizationId, pathwayId);

  const whereClause = and(
    eq(pathwayEnrollments.organizationId, organizationId),
    eq(pathwayEnrollments.pathwayId, pathwayId),
  );

  const [rows, totalRow] = await Promise.all([
    getDb().query.pathwayEnrollments.findMany({
      where: whereClause,
      orderBy: [desc(pathwayEnrollments.createdAt)],
      limit: query.limit,
      offset: query.offset,
      with: {
        client: {
          columns: { firstName: true, lastName: true, email: true },
        },
        stepLogs: {
          with: {
            step: {
              columns: { stepType: true },
            },
          },
        },
      },
    }),
    getDb()
      .select({ value: count() })
      .from(pathwayEnrollments)
      .where(whereClause),
  ]);

  const items: PathwayEnrollmentItem[] = rows.map((row) => {
    const clientName = row.client
      ? [row.client.firstName, row.client.lastName].filter(Boolean).join(" ") ||
        row.client.email
      : null;

    return {
      id: row.id,
      pathwayId: row.pathwayId,
      clientId: row.clientId,
      clientName,
      triggerEventId: row.triggerEventId,
      status: row.status,
      currentStepIndex: row.currentStepIndex,
      error: row.error,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      stepLogs: row.stepLogs.map((log) => ({
        id: log.id,
        stepId: log.stepId,
        stepType: log.step.stepType,
        status: log.status,
        error: log.error,
        durationMs: log.durationMs,
      })),
    };
  });

  return { items, total: totalRow[0]?.value ?? 0 };
}
