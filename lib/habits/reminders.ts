import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, habitAssignments, habitLogs } from "@/lib/db/schema";
import { getOrganizationPlanTier } from "@/lib/notifications/cron";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getActiveEventTemplate } from "@/lib/notifications/service";
import { utcToday } from "./stats";

export type HabitReminderPayload = {
  eventType: "habit_reminder";
  organizationId: string;
  clientId: string;
  assignmentId: string;
  habitName: string;
  reminderTime: string;
};

export async function enqueueNotification(
  payload: HabitReminderPayload,
): Promise<void> {
  const template = await getActiveEventTemplate(
    payload.organizationId,
    "habit_reminder",
    "push",
  );

  if (!template) {
    return;
  }

  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, payload.organizationId),
      eq(clients.id, payload.clientId),
    ),
    columns: { id: true, email: true },
  });

  if (!client) {
    return;
  }

  const planTier = await getOrganizationPlanTier(payload.organizationId);

  await dispatchNotification({
    organizationId: payload.organizationId,
    planTier,
    channel: template.channel,
    subject: template.subject ?? undefined,
    content: template.content,
    templateId: template.id,
    eventType: "habit_reminder",
    recipients: [{ clientId: client.id, email: client.email }],
    metadata: {
      habitName: payload.habitName,
      url: "/client/habits",
    },
    idempotencyKey: `habit_reminder:${payload.assignmentId}:${utcToday()}`,
  });
}

export async function processHabitReminders(now: Date = new Date()): Promise<{
  processed: number;
  skipped: number;
}> {
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const currentTime = `${hour}:${minute}`;
  const today = utcToday();

  const assignments = await getDb().query.habitAssignments.findMany({
    where: and(
      eq(habitAssignments.status, "active"),
      eq(habitAssignments.reminderTime, currentTime),
    ),
    with: {
      habit: true,
      logs: {
        where: and(
          eq(habitLogs.logDate, today),
          eq(habitLogs.completed, true),
        ),
        columns: { id: true },
      },
    },
  });

  let processed = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    if (assignment.logs.length > 0) {
      skipped += 1;
      continue;
    }

    if (assignment.startDate > today) {
      skipped += 1;
      continue;
    }

    if (assignment.endDate && assignment.endDate < today) {
      skipped += 1;
      continue;
    }

    await enqueueNotification({
      eventType: "habit_reminder",
      organizationId: assignment.organizationId,
      clientId: assignment.clientId,
      assignmentId: assignment.id,
      habitName: assignment.habit.name,
      reminderTime: assignment.reminderTime ?? currentTime,
    });
    processed += 1;
  }

  return { processed, skipped };
}
