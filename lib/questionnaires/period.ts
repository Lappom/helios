export function getIsoWeekKey(date: Date): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function isUtcDayAndHour(
  date: Date,
  dayOfWeek: number,
  hourUtc: number,
): boolean {
  return date.getUTCDay() === dayOfWeek && date.getUTCHours() === hourUtc;
}

export function shouldCreateWeeklySubmission(params: {
  now: Date;
  sendDayOfWeek: number;
  sendHourUtc: number;
  hasExistingForPeriod: boolean;
}): boolean {
  if (!isUtcDayAndHour(params.now, params.sendDayOfWeek, params.sendHourUtc)) {
    return false;
  }
  return !params.hasExistingForPeriod;
}

export function shouldSendWeeklyReminder(params: {
  now: Date;
  reminderDayOfWeek: number;
  reminderHourUtc: number;
  alreadyReminded: boolean;
  status: "pending" | "submitted" | "overdue";
}): boolean {
  if (params.status !== "pending" || params.alreadyReminded) {
    return false;
  }
  return isUtcDayAndHour(
    params.now,
    params.reminderDayOfWeek,
    params.reminderHourUtc,
  );
}
