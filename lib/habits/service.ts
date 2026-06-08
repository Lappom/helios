import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import {
  clients,
  habitAssignments,
  habitLogs,
  habits,
  teamMembers,
} from "@/lib/db/schema";
import { PREDEFINED_HABITS } from "./defaults";
import {
  addDaysToDate,
  computeCompletionRate,
  computeCurrentStreak,
  computeLongestStreak,
  computeWeeklyBreakdown,
  resolveStatsWindow,
  utcToday,
} from "./stats";
import type {
  ClientHabitAssignment,
  ClientHabitStatsReport,
  ClientHabitsSummary,
  HabitListItem,
  HabitLogResult,
  OrgWeeklyHabitSummary,
} from "./types";
import type {
  AssignHabitInput,
  CreateHabitInput,
  HabitStatsQueryInput,
  LogHabitInput,
} from "@/lib/validators/habits";

export type ListHabitsOptions = {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  predefinedOnly?: boolean;
};

function mapHabitListItem(
  row: typeof habits.$inferSelect,
  activeAssignmentCount: number,
): HabitListItem {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    message: row.message,
    frequency: row.frequency,
    isPredefined: row.isPredefined,
    activeAssignmentCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveSeedCoachClerkUserId(
  organizationId: string,
  fallbackClerkUserId: string,
): Promise<string> {
  const member = await getDb().query.teamMembers.findFirst({
    where: eq(teamMembers.organizationId, organizationId),
    columns: { clerkUserId: true },
    orderBy: [asc(teamMembers.createdAt)],
  });

  return member?.clerkUserId ?? fallbackClerkUserId;
}

export async function seedPredefinedHabitsIfMissing(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await getDb().query.habits.findFirst({
    where: and(
      eq(habits.organizationId, organizationId),
      eq(habits.isPredefined, true),
    ),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  const seedCoachId = await resolveSeedCoachClerkUserId(
    organizationId,
    coachClerkUserId,
  );

  await getDb().insert(habits).values(
    PREDEFINED_HABITS.map((habit) => ({
      organizationId,
      coachClerkUserId: seedCoachId,
      name: habit.name,
      emoji: habit.emoji,
      message: habit.message,
      frequency: habit.frequency,
      isPredefined: true,
    })),
  );
}

async function getHabitOrThrow(organizationId: string, habitId: string) {
  const habit = await getDb().query.habits.findFirst({
    where: and(
      eq(habits.organizationId, organizationId),
      eq(habits.id, habitId),
    ),
  });

  if (!habit) {
    throw problem({
      type: "not-found",
      title: "Habit not found",
      status: 404,
      detail: `Habit ${habitId} was not found in this organization.`,
    });
  }

  return habit;
}

async function getClientOrThrow(organizationId: string, clientId: string) {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found in this organization.`,
    });
  }

  return client;
}

export async function listHabits(
  organizationId: string,
  options: ListHabitsOptions,
): Promise<{ items: HabitListItem[]; total: number }> {
  const filters: SQL[] = [eq(habits.organizationId, organizationId)];

  if (options.search) {
    filters.push(ilike(habits.name, `%${options.search}%`));
  }

  if (options.predefinedOnly) {
    filters.push(eq(habits.isPredefined, true));
  }

  const where = and(...filters);

  const [rows, totalRow, assignmentCounts] = await Promise.all([
    getDb().query.habits.findMany({
      where,
      orderBy: [desc(habits.isPredefined), asc(habits.name)],
      limit: options.limit,
      offset: options.offset,
    }),
    getDb().select({ total: count() }).from(habits).where(where),
    getDb()
      .select({
        habitId: habitAssignments.habitId,
        total: count(),
      })
      .from(habitAssignments)
      .where(
        and(
          eq(habitAssignments.organizationId, organizationId),
          eq(habitAssignments.status, "active"),
        ),
      )
      .groupBy(habitAssignments.habitId),
  ]);

  const countByHabit = new Map(
    assignmentCounts.map((row) => [row.habitId, Number(row.total)]),
  );

  return {
    items: rows.map((row) =>
      mapHabitListItem(row, countByHabit.get(row.id) ?? 0),
    ),
    total: Number(totalRow[0]?.total ?? 0),
  };
}

export async function createHabit(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateHabitInput,
): Promise<HabitListItem> {
  const [row] = await getDb()
    .insert(habits)
    .values({
      organizationId,
      coachClerkUserId,
      name: input.name,
      emoji: input.emoji ?? "✅",
      message: input.message ?? "",
      frequency: input.frequency ?? "daily",
      isPredefined: false,
    })
    .returning();

  return mapHabitListItem(row, 0);
}

export async function assignHabit(
  organizationId: string,
  habitId: string,
  assignedByClerkUserId: string,
  input: AssignHabitInput,
) {
  await getHabitOrThrow(organizationId, habitId);
  await getClientOrThrow(organizationId, input.clientId);

  const startDate = input.startDate ?? utcToday();

  const [assignment] = await getDb()
    .insert(habitAssignments)
    .values({
      organizationId,
      habitId,
      clientId: input.clientId,
      startDate,
      endDate: input.endDate ?? null,
      reminderTime: input.reminderTime ?? null,
      status: "active",
      assignedByClerkUserId,
    })
    .returning();

  return {
    id: assignment.id,
    habitId: assignment.habitId,
    clientId: assignment.clientId,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    reminderTime: assignment.reminderTime,
    status: assignment.status,
    createdAt: assignment.createdAt.toISOString(),
  };
}

export async function listClientHabits(
  organizationId: string,
  clientId: string,
): Promise<ClientHabitAssignment[]> {
  const today = utcToday();

  const assignments = await getDb().query.habitAssignments.findMany({
    where: and(
      eq(habitAssignments.organizationId, organizationId),
      eq(habitAssignments.clientId, clientId),
      eq(habitAssignments.status, "active"),
    ),
    with: {
      habit: true,
      logs: {
        where: gte(habitLogs.logDate, addDaysToDate(today, -60)),
      },
    },
    orderBy: [asc(habitAssignments.createdAt)],
  });

  return assignments.map((assignment) => {
    const logs = assignment.logs.map((log) => ({
      logDate: log.logDate,
      completed: log.completed,
    }));
    const todayLog = assignment.logs.find((log) => log.logDate === today);

    return {
      assignmentId: assignment.id,
      habitId: assignment.habitId,
      name: assignment.habit.name,
      emoji: assignment.habit.emoji,
      message: assignment.habit.message,
      frequency: assignment.habit.frequency,
      startDate: assignment.startDate,
      reminderTime: assignment.reminderTime,
      todayCompleted: todayLog?.completed ?? false,
      currentStreak: computeCurrentStreak(
        {
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          frequency: assignment.habit.frequency,
        },
        logs,
        today,
      ),
      logDate: today,
    };
  });
}

export async function logHabitCompletion(
  organizationId: string,
  clientId: string,
  input: LogHabitInput,
): Promise<HabitLogResult> {
  const logDate = input.logDate ?? utcToday();

  const assignment = await getDb().query.habitAssignments.findFirst({
    where: and(
      eq(habitAssignments.organizationId, organizationId),
      eq(habitAssignments.id, input.assignmentId),
      eq(habitAssignments.clientId, clientId),
      eq(habitAssignments.status, "active"),
    ),
  });

  if (!assignment) {
    throw problem({
      type: "not-found",
      title: "Habit assignment not found",
      status: 404,
      detail: "Active habit assignment was not found for this client.",
    });
  }

  const existing = await getDb().query.habitLogs.findFirst({
    where: and(
      eq(habitLogs.organizationId, organizationId),
      eq(habitLogs.assignmentId, input.assignmentId),
      eq(habitLogs.logDate, logDate),
    ),
  });

  if (existing) {
    const [updated] = await getDb()
      .update(habitLogs)
      .set({
        completed: input.completed,
        completedAt: input.completed ? new Date() : null,
      })
      .where(eq(habitLogs.id, existing.id))
      .returning();

    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      logDate: updated.logDate,
      completed: updated.completed,
      completedAt: updated.completedAt?.toISOString() ?? null,
    };
  }

  const [created] = await getDb()
    .insert(habitLogs)
    .values({
      organizationId,
      assignmentId: input.assignmentId,
      clientId,
      logDate,
      completed: input.completed,
      completedAt: input.completed ? new Date() : null,
    })
    .returning();

  return {
    id: created.id,
    assignmentId: created.assignmentId,
    logDate: created.logDate,
    completed: created.completed,
    completedAt: created.completedAt?.toISOString() ?? null,
  };
}

export async function getClientHabitStats(
  organizationId: string,
  clientId: string,
  input: HabitStatsQueryInput,
): Promise<ClientHabitStatsReport> {
  await getClientOrThrow(organizationId, clientId);

  const { start, end } = resolveStatsWindow(input);

  const assignments = await getDb().query.habitAssignments.findMany({
    where: and(
      eq(habitAssignments.organizationId, organizationId),
      eq(habitAssignments.clientId, clientId),
      inArray(habitAssignments.status, ["active", "completed", "paused"]),
    ),
    with: {
      habit: true,
      logs: {
        where: and(
          gte(habitLogs.logDate, start),
          lte(habitLogs.logDate, end),
        ),
      },
    },
  });

  const assignmentWindows = assignments.map((assignment) => ({
    assignmentId: assignment.id,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    frequency: assignment.habit.frequency,
  }));

  const logsByAssignment = new Map<string, Array<{ logDate: string; completed: boolean }>>();
  for (const assignment of assignments) {
    logsByAssignment.set(
      assignment.id,
      assignment.logs.map((log) => ({
        logDate: log.logDate,
        completed: log.completed,
      })),
    );
  }

  const assignmentStats = assignments.map((assignment) => {
    const window = {
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      frequency: assignment.habit.frequency,
    };
    const logs = logsByAssignment.get(assignment.id) ?? [];

    return {
      assignmentId: assignment.id,
      habitId: assignment.habitId,
      habitName: assignment.habit.name,
      emoji: assignment.habit.emoji,
      frequency: assignment.habit.frequency,
      currentStreak: computeCurrentStreak(window, logs),
      longestStreak: computeLongestStreak(window, logs, start, end),
      completionRate: computeCompletionRate(window, logs, start, end),
    };
  });

  const weeklyBreakdown = computeWeeklyBreakdown(
    assignmentWindows.map((item) => ({
      startDate: item.startDate,
      endDate: item.endDate,
      frequency: item.frequency,
    })),
    new Map(
      assignmentWindows.map((item, index) => [
        String(index),
        logsByAssignment.get(item.assignmentId) ?? [],
      ]),
    ),
    end,
  );

  const averageCompletionRate =
    assignmentStats.length === 0
      ? 0
      : Math.round(
          assignmentStats.reduce((sum, item) => sum + item.completionRate, 0) /
            assignmentStats.length,
        );

  return {
    clientId,
    start,
    end,
    averageCompletionRate,
    assignments: assignmentStats,
    weeklyBreakdown,
  };
}

export async function getOrgWeeklyHabitSummary(
  organizationId: string,
): Promise<OrgWeeklyHabitSummary> {
  const end = utcToday();
  const start = addDaysToDate(end, -29);

  const assignments = await getDb().query.habitAssignments.findMany({
    where: and(
      eq(habitAssignments.organizationId, organizationId),
      eq(habitAssignments.status, "active"),
    ),
    with: {
      habit: true,
      logs: {
        where: and(
          gte(habitLogs.logDate, addDaysToDate(end, -6)),
          lte(habitLogs.logDate, end),
        ),
      },
    },
  });

  const windows = assignments.map((assignment) => ({
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    frequency: assignment.habit.frequency,
  }));

  const logsByAssignment = new Map<string, Array<{ logDate: string; completed: boolean }>>();
  assignments.forEach((assignment, index) => {
    logsByAssignment.set(
      String(index),
      assignment.logs.map((log) => ({
        logDate: log.logDate,
        completed: log.completed,
      })),
    );
  });

  const weeklyBreakdown = computeWeeklyBreakdown(windows, logsByAssignment, end);
  const averageCompletionRate =
    weeklyBreakdown.length === 0
      ? 0
      : Math.round(
          weeklyBreakdown.reduce((sum, day) => sum + day.completionRate, 0) /
            weeklyBreakdown.length,
        );

  return {
    averageCompletionRate,
    weeklyBreakdown,
    activeAssignments: assignments.length,
  };
}

export async function getClientHabitsSummary(
  organizationId: string,
  clientId: string,
): Promise<ClientHabitsSummary> {
  const items = await listClientHabits(organizationId, clientId);
  const completedToday = items.filter((item) => item.todayCompleted).length;

  return {
    totalToday: items.length,
    completedToday,
    remainingToday: Math.max(items.length - completedToday, 0),
  };
}

export async function listClientActiveHabitAssignments(
  organizationId: string,
  clientId: string,
) {
  await getClientOrThrow(organizationId, clientId);

  const assignments = await getDb().query.habitAssignments.findMany({
    where: and(
      eq(habitAssignments.organizationId, organizationId),
      eq(habitAssignments.clientId, clientId),
      eq(habitAssignments.status, "active"),
    ),
    with: { habit: true },
    orderBy: [desc(habitAssignments.createdAt)],
  });

  return assignments.map((assignment) => ({
    id: assignment.id,
    habitId: assignment.habitId,
    habitName: assignment.habit.name,
    emoji: assignment.habit.emoji,
    frequency: assignment.habit.frequency,
    startDate: assignment.startDate,
    reminderTime: assignment.reminderTime,
  }));
}
