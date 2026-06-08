import { and, eq } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { addMinutes, endOfDay, startOfDay } from "date-fns";
import { getDb } from "@/lib/db";
import { clients, programAssignments } from "@/lib/db/schema";
import { getOrganizationPlanTier } from "@/lib/notifications/cron";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getActiveEventTemplate } from "@/lib/notifications/service";
import { getEnrichedSchedule } from "./service";

export async function processSessionReminders(
  now: Date = new Date(),
  variant: "d0" | "h1" = "d0",
): Promise<{ processed: number; skipped: number }> {
  const timezone = "Europe/Paris";
  const nowTz = new TZDate(now, timezone);

  const assignments = await getDb().query.programAssignments.findMany({
    where: eq(programAssignments.status, "active"),
    columns: {
      id: true,
      organizationId: true,
      clientId: true,
    },
  });

  let processed = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    let schedule;
    try {
      schedule = await getEnrichedSchedule(
        assignment.organizationId,
        assignment.clientId,
        {
          start: startOfDay(nowTz),
          end: endOfDay(nowTz),
        },
      );
    } catch {
      skipped += 1;
      continue;
    }

    const client = await getDb().query.clients.findFirst({
      where: and(
        eq(clients.organizationId, assignment.organizationId),
        eq(clients.id, assignment.clientId),
      ),
      columns: { id: true, email: true },
    });

    if (!client) {
      skipped += 1;
      continue;
    }

    for (const session of schedule.sessions) {
      if (session.status === "completed") {
        continue;
      }

      const sessionStart = new TZDate(session.scheduledDate, timezone);

      if (variant === "d0") {
        const isToday =
          sessionStart >= startOfDay(nowTz) &&
          sessionStart <= endOfDay(nowTz);
        if (!isToday) {
          continue;
        }
      } else {
        const h1WindowStart = addMinutes(nowTz, 55);
        const h1WindowEnd = addMinutes(nowTz, 65);
        if (sessionStart < h1WindowStart || sessionStart > h1WindowEnd) {
          continue;
        }
      }

      const template = await getActiveEventTemplate(
        assignment.organizationId,
        "session_due",
      );
      if (!template) {
        skipped += 1;
        continue;
      }

      const planTier = await getOrganizationPlanTier(assignment.organizationId);
      const idempotencyKey = `session_due:${variant}:${assignment.id}:${session.programSessionId}:${session.scheduledDateKey}`;

      await dispatchNotification({
        organizationId: assignment.organizationId,
        planTier,
        channel: template.channel,
        subject: template.subject ?? undefined,
        content: template.content,
        templateId: template.id,
        eventType: "session_due",
        recipients: [{ clientId: client.id, email: client.email }],
        metadata: {
          sessionName: session.name,
          url: `/client/session/${session.programSessionId}?scheduledDate=${session.scheduledDateKey}`,
        },
        idempotencyKey,
      });

      processed += 1;
    }
  }

  return { processed, skipped };
}
