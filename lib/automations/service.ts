import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  automationActions,
  automationExecutions,
  automations,
  teamMembers,
} from "@/lib/db/schema";
import type {
  AutomationActionDetail,
  AutomationExecutionItem,
  AutomationListItem,
  AutomationTree,
} from "./types";
import type {
  CreateAutomationInput,
  ListAutomationsQuery,
  ListExecutionsQuery,
  PatchAutomationInput,
} from "@/lib/validators/automations";
import {
  validateActionConfig,
  validateTriggerConfig,
} from "@/lib/validators/automations";

function mapAction(row: typeof automationActions.$inferSelect): AutomationActionDetail {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    actionType: row.actionType,
    actionConfig: (row.actionConfig ?? {}) as Record<string, unknown>,
  };
}

async function getLastExecution(
  organizationId: string,
  automationId: string,
): Promise<{ at: string; status: AutomationExecutionItem["status"] } | null> {
  const row = await db.query.automationExecutions.findFirst({
    where: and(
      eq(automationExecutions.organizationId, organizationId),
      eq(automationExecutions.automationId, automationId),
    ),
    orderBy: [desc(automationExecutions.createdAt)],
    columns: { createdAt: true, status: true },
  });
  if (!row) return null;
  return {
    at: row.createdAt.toISOString(),
    status: row.status,
  };
}

function mapListItem(
  row: typeof automations.$inferSelect,
  actionCount: number,
  lastExecution: { at: string; status: AutomationExecutionItem["status"] } | null,
): AutomationListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerType: row.triggerType,
    triggerConfig: (row.triggerConfig ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    isSystem: row.isSystem,
    actionCount,
    lastExecutionAt: lastExecution?.at ?? null,
    lastExecutionStatus: lastExecution?.status ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getAutomationOrThrow(organizationId: string, automationId: string) {
  const row = await db.query.automations.findFirst({
    where: and(
      eq(automations.organizationId, organizationId),
      eq(automations.id, automationId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Automation not found",
      status: 404,
      detail: `Automation ${automationId} was not found.`,
    });
  }

  return row;
}

async function resolveCoachClerkUserId(
  organizationId: string,
  fallback: string,
): Promise<string> {
  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.organizationId, organizationId),
    columns: { clerkUserId: true },
    orderBy: [asc(teamMembers.createdAt)],
  });
  return member?.clerkUserId ?? fallback;
}

function validateAutomationInput(
  triggerType: CreateAutomationInput["triggerType"],
  triggerConfig: Record<string, unknown>,
  actions: CreateAutomationInput["actions"],
): void {
  validateTriggerConfig(triggerType, triggerConfig);
  for (const action of actions) {
    validateActionConfig(action.actionType, action.actionConfig);
  }
}

async function replaceActions(
  organizationId: string,
  automationId: string,
  actions: CreateAutomationInput["actions"],
): Promise<void> {
  await db
    .delete(automationActions)
    .where(
      and(
        eq(automationActions.organizationId, organizationId),
        eq(automationActions.automationId, automationId),
      ),
    );

  if (actions.length === 0) return;

  await db.insert(automationActions).values(
    actions.map((action, index) => ({
      organizationId,
      automationId,
      sortOrder: action.sortOrder ?? index,
      actionType: action.actionType,
      actionConfig: action.actionConfig,
    })),
  );
}

export async function listAutomations(
  organizationId: string,
  query: ListAutomationsQuery,
): Promise<{ items: AutomationListItem[]; total: number }> {
  const filters: SQL[] = [eq(automations.organizationId, organizationId)];

  if (query.search) {
    filters.push(ilike(automations.name, `%${query.search}%`));
  }
  if (query.isActive !== undefined) {
    filters.push(eq(automations.isActive, query.isActive));
  }

  const whereClause = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db.query.automations.findMany({
      where: whereClause,
      orderBy: [desc(automations.updatedAt)],
      limit: query.limit,
      offset: query.offset,
    }),
    db.select({ value: count() }).from(automations).where(whereClause),
  ]);

  const items = await Promise.all(
    rows.map(async (row) => {
      const actionRows = await db.query.automationActions.findMany({
        where: eq(automationActions.automationId, row.id),
        columns: { id: true },
      });
      const lastExecution = await getLastExecution(organizationId, row.id);
      return mapListItem(row, actionRows.length, lastExecution);
    }),
  );

  return { items, total: totalRow[0]?.value ?? 0 };
}

export async function getAutomationTree(
  organizationId: string,
  automationId: string,
): Promise<AutomationTree> {
  const row = await getAutomationOrThrow(organizationId, automationId);
  const actionRows = await db.query.automationActions.findMany({
    where: and(
      eq(automationActions.organizationId, organizationId),
      eq(automationActions.automationId, automationId),
    ),
    orderBy: [asc(automationActions.sortOrder)],
  });
  const lastExecution = await getLastExecution(organizationId, automationId);
  const base = mapListItem(row, actionRows.length, lastExecution);
  return {
    ...base,
    actions: actionRows.map(mapAction),
  };
}

export async function createAutomation(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateAutomationInput,
): Promise<AutomationTree> {
  validateAutomationInput(input.triggerType, input.triggerConfig, input.actions);

  const [created] = await db
    .insert(automations)
    .values({
      organizationId,
      name: input.name,
      description: input.description ?? null,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      isActive: input.isActive ?? false,
      createdByClerkUserId: coachClerkUserId,
    })
    .returning();

  await replaceActions(organizationId, created!.id, input.actions);
  return getAutomationTree(organizationId, created!.id);
}

export async function patchAutomation(
  organizationId: string,
  automationId: string,
  input: PatchAutomationInput,
): Promise<AutomationTree> {
  const existing = await getAutomationOrThrow(organizationId, automationId);

  if (existing.isSystem && input.actions) {
    throw problem({
      type: "forbidden",
      title: "System automation",
      status: 403,
      detail: "System automations cannot have their actions replaced entirely.",
    });
  }

  const nextTriggerType = input.triggerType ?? existing.triggerType;
  const nextTriggerConfig =
    input.triggerConfig ??
    ((existing.triggerConfig ?? {}) as Record<string, unknown>);

  if (input.actions) {
    validateAutomationInput(nextTriggerType, nextTriggerConfig, input.actions);
  } else if (input.triggerType || input.triggerConfig) {
    validateTriggerConfig(nextTriggerType, nextTriggerConfig);
  }

  await db
    .update(automations)
    .set({
      name: input.name,
      description:
        input.description === undefined
          ? undefined
          : input.description,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      isActive: input.isActive,
    })
    .where(
      and(
        eq(automations.organizationId, organizationId),
        eq(automations.id, automationId),
      ),
    );

  if (input.actions) {
    await replaceActions(organizationId, automationId, input.actions);
  }

  return getAutomationTree(organizationId, automationId);
}

export async function deleteAutomation(
  organizationId: string,
  automationId: string,
): Promise<void> {
  const existing = await getAutomationOrThrow(organizationId, automationId);
  if (existing.isSystem) {
    throw problem({
      type: "forbidden",
      title: "System automation",
      status: 403,
      detail: "System automations cannot be deleted.",
    });
  }

  await db
    .delete(automations)
    .where(
      and(
        eq(automations.organizationId, organizationId),
        eq(automations.id, automationId),
      ),
    );
}

export async function toggleAutomation(
  organizationId: string,
  automationId: string,
  isActive: boolean,
): Promise<AutomationTree> {
  const existing = await getAutomationOrThrow(organizationId, automationId);

  if (isActive) {
    const actionRows = await db.query.automationActions.findMany({
      where: and(
        eq(automationActions.organizationId, organizationId),
        eq(automationActions.automationId, automationId),
      ),
      orderBy: [asc(automationActions.sortOrder)],
    });
    validateAutomationInput(
      existing.triggerType,
      (existing.triggerConfig ?? {}) as Record<string, unknown>,
      actionRows.map((row) => ({
        actionType: row.actionType,
        actionConfig: (row.actionConfig ?? {}) as Record<string, unknown>,
      })),
    );
  }

  await db
    .update(automations)
    .set({ isActive })
    .where(
      and(
        eq(automations.organizationId, organizationId),
        eq(automations.id, automationId),
      ),
    );
  return getAutomationTree(organizationId, automationId);
}

export async function listAutomationExecutions(
  organizationId: string,
  automationId: string,
  query: ListExecutionsQuery,
): Promise<{ items: AutomationExecutionItem[]; total: number }> {
  await getAutomationOrThrow(organizationId, automationId);

  const filters: SQL[] = [
    eq(automationExecutions.organizationId, organizationId),
    eq(automationExecutions.automationId, automationId),
  ];
  if (query.status) {
    filters.push(eq(automationExecutions.status, query.status));
  }
  const whereClause = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db.query.automationExecutions.findMany({
      where: whereClause,
      orderBy: [desc(automationExecutions.createdAt)],
      limit: query.limit,
      offset: query.offset,
      with: {
        client: {
          columns: { firstName: true, lastName: true, email: true },
        },
        actionLogs: {
          with: {
            action: {
              columns: { actionType: true },
            },
          },
        },
      },
    }),
    db
      .select({ value: count() })
      .from(automationExecutions)
      .where(whereClause),
  ]);

  const items: AutomationExecutionItem[] = rows.map((row) => {
    const clientName = row.client
      ? [row.client.firstName, row.client.lastName].filter(Boolean).join(" ") ||
        row.client.email
      : null;

    return {
      id: row.id,
      automationId: row.automationId,
      clientId: row.clientId,
      clientName,
      triggerEventId: row.triggerEventId,
      triggerType: row.triggerType,
      status: row.status,
      error: row.error,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      actionLogs: row.actionLogs.map((log) => ({
        id: log.id,
        actionId: log.actionId,
        actionType: log.action.actionType,
        status: log.status,
        error: log.error,
        durationMs: log.durationMs,
      })),
    };
  });

  return { items, total: totalRow[0]?.value ?? 0 };
}

export { resolveCoachClerkUserId };
