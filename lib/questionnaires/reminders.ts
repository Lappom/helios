import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { getOrganizationPlanTier } from "@/lib/notifications/cron";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getActiveEventTemplate } from "@/lib/notifications/service";

export type QuestionnaireNotificationPayload = {
  organizationId: string;
  clientId: string;
  submissionId: string;
  questionnaireName: string;
  eventType: "questionnaire_due" | "questionnaire_reminder";
};

export async function dispatchQuestionnaireNotification(
  payload: QuestionnaireNotificationPayload,
): Promise<void> {
  const template = await getActiveEventTemplate(
    payload.organizationId,
    payload.eventType,
    "email",
  );

  if (!template) {
    return;
  }

  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, payload.organizationId),
      eq(clients.id, payload.clientId),
    ),
    columns: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!client) {
    return;
  }

  const planTier = await getOrganizationPlanTier(payload.organizationId);
  const clientName = `${client.firstName} ${client.lastName}`.trim();

  await dispatchNotification({
    organizationId: payload.organizationId,
    planTier,
    channel: template.channel,
    subject: template.subject ?? undefined,
    content: template.content,
    templateId: template.id,
    eventType: payload.eventType,
    recipients: [{ clientId: client.id, email: client.email }],
    metadata: {
      clientName,
      questionnaireName: payload.questionnaireName,
      url: `/client/questionnaires/${payload.submissionId}`,
    },
    idempotencyKey: `${payload.eventType}:${payload.submissionId}`,
  });
}
