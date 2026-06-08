import type { TrainingPhaseFocus } from "@/lib/validators/programs";

export type ScheduleSessionInput = {
  programSessionId: string;
  name: string;
  weekLabel: string;
  weekSortOrder: number;
  sessionSortOrder: number;
  dayOfWeek: number | null;
  mesocycleId?: string;
  mesocycleName?: string;
  macrocycleId?: string;
  macrocycleName?: string;
  microcycleId?: string;
  microcycleName?: string;
  focus?: TrainingPhaseFocus | null;
  weekIndexInMicrocycle?: number;
  weeksInMicrocycle?: number;
};

export type ScheduleOverride = {
  programSessionId: string;
  scheduledDate: Date;
};

export type ScheduledSession = {
  programSessionId: string;
  name: string;
  weekLabel: string;
  weekSortOrder: number;
  sessionSortOrder: number;
  scheduledDate: Date;
  status: "planned";
  hasOverride: boolean;
  mesocycleId?: string;
  mesocycleName?: string;
  macrocycleId?: string;
  macrocycleName?: string;
  microcycleId?: string;
  microcycleName?: string;
  focus?: TrainingPhaseFocus | null;
  weekIndexInMicrocycle?: number;
  weeksInMicrocycle?: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Monday-based week start (0 = Monday, 6 = Sunday). */
export function startOfWeekMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function computeSessionDate(
  startDate: Date,
  weekSortOrder: number,
  sessionSortOrder: number,
  dayOfWeek: number | null,
): Date {
  const weekStart = startOfWeekMonday(startDate);
  const programWeekStart = addDays(weekStart, weekSortOrder * 7);

  if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
    return addDays(programWeekStart, dayOfWeek);
  }

  return addDays(programWeekStart, sessionSortOrder);
}

export function buildAssignmentSchedule(
  startDate: Date,
  sessions: ScheduleSessionInput[],
  overrides: ScheduleOverride[] = [],
): ScheduledSession[] {
  const overrideMap = new Map(
    overrides.map((item) => [item.programSessionId, item.scheduledDate]),
  );

  return sessions
    .map((session) => {
      const override = overrideMap.get(session.programSessionId);
      const scheduledDate =
        override ??
        computeSessionDate(
          startDate,
          session.weekSortOrder,
          session.sessionSortOrder,
          session.dayOfWeek,
        );

      return {
        programSessionId: session.programSessionId,
        name: session.name,
        weekLabel: session.weekLabel,
        weekSortOrder: session.weekSortOrder,
        sessionSortOrder: session.sessionSortOrder,
        scheduledDate,
        status: "planned" as const,
        hasOverride: override !== undefined,
        mesocycleId: session.mesocycleId,
        mesocycleName: session.mesocycleName,
        macrocycleId: session.macrocycleId,
        macrocycleName: session.macrocycleName,
        microcycleId: session.microcycleId,
        microcycleName: session.microcycleName,
        focus: session.focus,
        weekIndexInMicrocycle: session.weekIndexInMicrocycle,
        weeksInMicrocycle: session.weeksInMicrocycle,
      };
    })
    .sort(
      (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
    );
}

export function isDateInRange(
  date: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const time = date.getTime();
  return time >= rangeStart.getTime() && time <= rangeEnd.getTime();
}

export function filterScheduleByRange(
  schedule: ScheduledSession[],
  rangeStart: Date,
  rangeEnd: Date,
): ScheduledSession[] {
  return schedule.filter((session) =>
    isDateInRange(session.scheduledDate, rangeStart, rangeEnd),
  );
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / MS_PER_DAY);
}
