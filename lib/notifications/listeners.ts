import { and, eq, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  clients,
  conversationParticipants,
  programs,
  teamMembers,
} from "@/lib/db/schema";
import type {
  DriveFileSharedPayload,
  HeliosEventName,
  HeliosEventPayload,
  PaymentReceivedPayload,
} from "@/lib/events/emit";
import { getOrganizationPlanTier } from "./cron";
import { dispatchNotification } from "./dispatch";
import { getActiveEventTemplate } from "./service";

async function dispatchEventNotification(
  organizationId: string,
  eventType: Parameters<typeof getActiveEventTemplate>[1],
  recipients: {
    clientId?: string;
    email?: string;
    clerkUserId?: string;
  }[],
  metadata?: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const template = await getActiveEventTemplate(organizationId, eventType);
  if (!template || recipients.length === 0) {
    return;
  }

  const planTier = await getOrganizationPlanTier(organizationId);

  await dispatchNotification({
    organizationId,
    planTier,
    channel: template.channel,
    subject: template.subject ?? undefined,
    content: template.content,
    templateId: template.id,
    eventType,
    recipients,
    metadata,
    idempotencyKey,
  });
}

async function getCoachRecipientEmails(
  organizationId: string,
): Promise<{ email: string; clerkUserId: string }[]> {
  const members = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.organizationId, organizationId),
      inArray(teamMembers.role, ["owner", "admin", "coach"]),
    ),
    columns: { clerkUserId: true },
  });

  const clerk = await clerkClient();
  const recipients: { email: string; clerkUserId: string }[] = [];

  for (const member of members) {
    try {
      const user = await clerk.users.getUser(member.clerkUserId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) {
        recipients.push({ email, clerkUserId: member.clerkUserId });
      }
    } catch {
      // Skip members that cannot be resolved.
    }
  }

  return recipients;
}

export async function handleHeliosNotificationEvent<
  T extends HeliosEventName,
>(name: T, payload: HeliosEventPayload[T]): Promise<void> {
  switch (name) {
    case "payment.received": {
      const paymentPayload = payload as PaymentReceivedPayload;
      const coaches = await getCoachRecipientEmails(
        paymentPayload.organizationId,
      );
      await dispatchEventNotification(
        paymentPayload.organizationId,
        "payment_received",
        coaches.map((coach) => ({
          email: coach.email,
          clerkUserId: coach.clerkUserId,
        })),
        {
          amount: `${(paymentPayload.amountCents / 100).toFixed(2)} €`,
        },
        `payment.received:${paymentPayload.paymentId}`,
      );
      return;
    }
    case "assessment.submitted": {
      const assessmentPayload = payload as HeliosEventPayload["assessment.submitted"];
      const coaches = await getCoachRecipientEmails(
        assessmentPayload.organizationId,
      );
      if (coaches.length === 0) {
        return;
      }
      const planTier = await getOrganizationPlanTier(
        assessmentPayload.organizationId,
      );
      await dispatchNotification({
        organizationId: assessmentPayload.organizationId,
        planTier,
        channel: "email",
        subject: "Bilan soumis par un client",
        content:
          "Un client vient de soumettre un bilan. Consultez-le dans votre espace coach.",
        recipients: coaches.map((coach) => ({
          email: coach.email,
          clerkUserId: coach.clerkUserId,
        })),
        metadata: {
          url: `/coach/assessments/${assessmentPayload.assessmentId}`,
        },
        idempotencyKey: `assessment.submitted:${assessmentPayload.assessmentId}`,
      });
      return;
    }
    case "program.published": {
      const programPayload = payload as HeliosEventPayload["program.published"];
      const client = await db.query.clients.findFirst({
        where: and(
          eq(clients.organizationId, programPayload.organizationId),
          eq(clients.id, programPayload.clientId),
        ),
        columns: { id: true, email: true },
      });
      const program = await db.query.programs.findFirst({
        where: and(
          eq(programs.organizationId, programPayload.organizationId),
          eq(programs.id, programPayload.programId),
        ),
        columns: { name: true },
      });

      if (!client) {
        return;
      }

      await dispatchEventNotification(
        programPayload.organizationId,
        "program_published",
        [{ clientId: client.id, email: client.email }],
        {
          programName: program?.name ?? "Programme",
          url: "/client/program",
        },
        `program.published:${programPayload.assignmentId}`,
      );
      return;
    }
    case "message.new": {
      const messagePayload = payload as HeliosEventPayload["message.new"];
      const idempotencyKey = `message.new:${messagePayload.messageId}`;

      if (messagePayload.conversationType === "group") {
        const participants = await db.query.conversationParticipants.findMany({
          where: and(
            eq(
              conversationParticipants.organizationId,
              messagePayload.organizationId,
            ),
            eq(
              conversationParticipants.conversationId,
              messagePayload.conversationId,
            ),
            eq(conversationParticipants.role, "client"),
          ),
          columns: { clerkUserId: true },
        });

        const recipientClerkIds = participants
          .map((participant) => participant.clerkUserId)
          .filter((id) => id !== messagePayload.senderClerkUserId);

        if (recipientClerkIds.length === 0) {
          return;
        }

        const recipientClients = await db.query.clients.findMany({
          where: and(
            eq(clients.organizationId, messagePayload.organizationId),
            inArray(clients.clerkUserId, recipientClerkIds),
          ),
          columns: {
            id: true,
            email: true,
            clerkUserId: true,
            firstName: true,
            lastName: true,
          },
        });

        if (recipientClients.length === 0) {
          return;
        }

        await dispatchEventNotification(
          messagePayload.organizationId,
          "message_new",
          recipientClients.map((client) => ({
            clientId: client.id,
            email: client.email,
          })),
          {
            url: `/client/messages?conversationId=${messagePayload.conversationId}`,
          },
          idempotencyKey,
        );
        return;
      }

      if (!messagePayload.clientId) {
        return;
      }

      const client = await db.query.clients.findFirst({
        where: and(
          eq(clients.organizationId, messagePayload.organizationId),
          eq(clients.id, messagePayload.clientId),
        ),
        columns: {
          id: true,
          email: true,
          clerkUserId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!client) {
        return;
      }

      const senderIsClient =
        client.clerkUserId !== null &&
        client.clerkUserId === messagePayload.senderClerkUserId;

      if (senderIsClient) {
        const coaches = await getCoachRecipientEmails(
          messagePayload.organizationId,
        );
        if (coaches.length === 0) {
          return;
        }

        const planTier = await getOrganizationPlanTier(
          messagePayload.organizationId,
        );
        await dispatchNotification({
          organizationId: messagePayload.organizationId,
          planTier,
          channel: "email",
          subject: "Nouveau message client",
          content:
            "Un client vient de vous envoyer un message. Répondez depuis votre espace coach.",
          recipients: coaches.map((coach) => ({
            email: coach.email,
            clerkUserId: coach.clerkUserId,
          })),
          metadata: {
            url: `/coach/messages?conversationId=${messagePayload.conversationId}`,
          },
          idempotencyKey,
        });
        return;
      }

      await dispatchEventNotification(
        messagePayload.organizationId,
        "message_new",
        [{ clientId: client.id, email: client.email }],
        {
          url: "/client/messages",
          clientName: `${client.firstName} ${client.lastName}`.trim(),
        },
        idempotencyKey,
      );
      return;
    }
    case "drive.file.shared": {
      const drivePayload = payload as DriveFileSharedPayload;
      const client = await db.query.clients.findFirst({
        where: and(
          eq(clients.organizationId, drivePayload.organizationId),
          eq(clients.id, drivePayload.clientId),
        ),
        columns: { id: true, email: true },
      });

      if (!client) {
        return;
      }

      await dispatchEventNotification(
        drivePayload.organizationId,
        "drive_file_shared",
        [{ clientId: client.id, email: client.email }],
        { url: "/client/drive" },
        `drive.file.shared:${drivePayload.shareId}`,
      );
      return;
    }
    default:
      return;
  }
}
