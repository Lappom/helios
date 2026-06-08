import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, notificationTemplates } from "@/lib/db/schema";
import { matchesCronExpression } from "./cron-match";
import { getOrganizationPlanTier } from "./cron";
import { dispatchNotification } from "./dispatch";

export async function processScheduledNotificationTemplates(
  now: Date = new Date(),
): Promise<{ processed: number; skipped: number }> {
  const templates = await getDb().query.notificationTemplates.findMany({
    where: and(
      eq(notificationTemplates.trigger, "scheduled"),
      eq(notificationTemplates.isActive, true),
    ),
  });

  let processed = 0;
  let skipped = 0;

  for (const template of templates) {
    if (!template.schedule || !matchesCronExpression(template.schedule, now)) {
      skipped += 1;
      continue;
    }

    const planTier = await getOrganizationPlanTier(template.organizationId);
    const activeClients = await getDb().query.clients.findMany({
      where: and(
        eq(clients.organizationId, template.organizationId),
        eq(clients.status, "ACTIVE"),
      ),
      columns: {
        id: true,
        email: true,
      },
    });

    if (activeClients.length === 0) {
      skipped += 1;
      continue;
    }

    const idempotencyKey = `scheduled:${template.id}:${now.toISOString().slice(0, 13)}`;

    await dispatchNotification({
      organizationId: template.organizationId,
      planTier,
      channel: template.channel,
      subject: template.subject ?? undefined,
      content: template.content,
      templateId: template.id,
      recipients: activeClients.map((client) => ({
        clientId: client.id,
        email: client.email,
      })),
      idempotencyKey,
    });

    processed += 1;
  }

  return { processed, skipped };
}
