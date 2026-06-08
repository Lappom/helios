import { and, eq, inArray } from "drizzle-orm";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { getDb } from "@/lib/db";
import { assessments, clients } from "@/lib/db/schema";
import { getOrganizationPlanTier } from "@/lib/notifications/cron";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getActiveEventTemplate } from "@/lib/notifications/service";

export async function processAssessmentReminders(
  now: Date = new Date(),
): Promise<{ dueToday: number; overdue: number; skipped: number }> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));

  const pendingAssessments = await getDb().query.assessments.findMany({
    where: and(
      eq(assessments.status, "pending"),
      inArray(assessments.source, ["manual", "cron"]),
    ),
    columns: {
      id: true,
      organizationId: true,
      clientId: true,
      dueAt: true,
    },
  });

  let dueToday = 0;
  let overdue = 0;
  let skipped = 0;

  for (const assessment of pendingAssessments) {
    if (!assessment.dueAt) {
      skipped += 1;
      continue;
    }

    const dueAt = assessment.dueAt;
    const isDueToday = dueAt >= todayStart && dueAt <= todayEnd;
    const isOverdue =
      dueAt >= yesterdayStart && dueAt <= yesterdayEnd;

    if (!isDueToday && !isOverdue) {
      skipped += 1;
      continue;
    }

    const template = await getActiveEventTemplate(
      assessment.organizationId,
      "assessment_due",
    );
    if (!template) {
      skipped += 1;
      continue;
    }

    const client = await getDb().query.clients.findFirst({
      where: and(
        eq(clients.organizationId, assessment.organizationId),
        eq(clients.id, assessment.clientId),
      ),
      columns: { id: true, email: true },
    });

    if (!client) {
      skipped += 1;
      continue;
    }

    const variant = isDueToday ? "due" : "overdue";
    const planTier = await getOrganizationPlanTier(assessment.organizationId);

    await dispatchNotification({
      organizationId: assessment.organizationId,
      planTier,
      channel: template.channel,
      subject: template.subject ?? undefined,
      content: template.content,
      templateId: template.id,
      eventType: "assessment_due",
      recipients: [{ clientId: client.id, email: client.email }],
      metadata: {
        dueDate: dueAt.toLocaleDateString("fr-FR"),
        url: `/client/assessments/${assessment.id}`,
      },
      idempotencyKey: `assessment_due:${variant}:${assessment.id}`,
    });

    if (isDueToday) {
      dueToday += 1;
    } else {
      overdue += 1;
    }
  }

  return { dueToday, overdue, skipped };
}
