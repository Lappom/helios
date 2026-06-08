import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, notificationLogs } from "@/lib/db/schema";
import { consumeNotifications } from "@/lib/billing/notification-quota";
import { contentToHtml, sendNotificationEmail } from "./email";
import { sendInAppNotification } from "./in-app";
import { sendPushToClient } from "./push";
import {
  renderNotificationContent,
  renderNotificationSubject,
} from "./render";
import type {
  DispatchNotificationInput,
  RenderVariables,
  SendChannelResult,
} from "./types";

async function resolveClientVariables(
  organizationId: string,
  clientId: string,
  metadata?: Record<string, unknown>,
): Promise<RenderVariables> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const clientName = client
    ? [client.firstName, client.lastName].filter(Boolean).join(" ").trim() ||
      client.email
    : "";

  return {
    clientName,
    clientEmail: client?.email,
    habitName: metadata?.habitName as string | undefined,
    sessionName: metadata?.sessionName as string | undefined,
    dueDate: metadata?.dueDate as string | undefined,
    programName: metadata?.programName as string | undefined,
    bookingTime: metadata?.bookingTime as string | undefined,
    amount: metadata?.amount as string | undefined,
  };
}

async function sendViaChannel(
  input: DispatchNotificationInput,
  recipient: DispatchNotificationInput["recipients"][number],
  renderedSubject: string | undefined,
  renderedContent: string,
): Promise<SendChannelResult> {
  switch (input.channel) {
    case "email": {
      if (!recipient.email) {
        return { ok: false, error: "Recipient email is missing." };
      }
      const result = await sendNotificationEmail({
        to: recipient.email,
        subject: renderedSubject ?? "Notification Helios",
        html: contentToHtml(renderedContent),
        tags: input.templateId
          ? [{ name: "template_id", value: input.templateId }]
          : undefined,
      });
      return result.ok
        ? { ok: true, externalId: result.id }
        : { ok: false, error: result.error };
    }
    case "in_app":
      return sendInAppNotification();
    case "push": {
      if (!recipient.clientId) {
        return { ok: false, error: "Client id is required for push." };
      }
      return sendPushToClient({
        organizationId: input.organizationId,
        clientId: recipient.clientId,
        title: renderedSubject ?? "Helios",
        body: renderedContent,
        url: (input.metadata?.url as string | undefined) ?? "/client",
      });
    }
    default:
      return { ok: false, error: "Unsupported channel." };
  }
}

export async function dispatchNotification(
  input: DispatchNotificationInput,
): Promise<{ sent: number; failed: number; logIds: string[] }> {
  if (input.recipients.length === 0) {
    return { sent: 0, failed: 0, logIds: [] };
  }

  if (input.idempotencyKey) {
    const existing = await getDb().query.notificationLogs.findFirst({
      where: eq(notificationLogs.idempotencyKey, input.idempotencyKey),
      columns: { id: true },
    });
    if (existing) {
      return { sent: 0, failed: 0, logIds: [existing.id] };
    }
  }

  await consumeNotifications(
    input.organizationId,
    input.recipients.length,
    input.planTier,
  );

  let sent = 0;
  let failed = 0;
  const logIds: string[] = [];

  for (const [index, recipient] of input.recipients.entries()) {
    const variables = recipient.clientId
      ? await resolveClientVariables(
          input.organizationId,
          recipient.clientId,
          input.metadata,
        )
      : (input.metadata as RenderVariables | undefined) ?? {};

    const renderedContent = renderNotificationContent(
      input.content,
      variables,
    );
    const renderedSubject = renderNotificationSubject(input.subject, variables);

    const idempotencyKey = input.idempotencyKey
      ? `${input.idempotencyKey}:${index}`
      : undefined;

    if (idempotencyKey) {
      const duplicate = await getDb().query.notificationLogs.findFirst({
        where: eq(notificationLogs.idempotencyKey, idempotencyKey),
        columns: { id: true },
      });
      if (duplicate) {
        logIds.push(duplicate.id);
        continue;
      }
    }

    const channelResult = await sendViaChannel(
      input,
      recipient,
      renderedSubject,
      renderedContent,
    );

    const now = new Date();
    const [log] = await getDb()
      .insert(notificationLogs)
      .values({
        organizationId: input.organizationId,
        templateId: input.templateId,
        clientId: recipient.clientId,
        recipientEmail: recipient.email,
        channel: input.channel,
        eventType: input.eventType,
        status: channelResult.ok ? "sent" : "failed",
        subject: renderedSubject,
        content: renderedContent,
        metadata: input.metadata,
        idempotencyKey,
        externalId: channelResult.externalId,
        sentAt: channelResult.ok ? now : undefined,
        failureReason: channelResult.error,
      })
      .returning({ id: notificationLogs.id });

    logIds.push(log.id);
    if (channelResult.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { sent, failed, logIds };
}
