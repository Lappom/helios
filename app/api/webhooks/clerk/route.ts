import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/api/logger";
import { getDb, runWithDbScope } from "@/lib/db";
import {
  handleOrganizationCreated,
  handleOrganizationDeleted,
  handleOrganizationMembershipDeleted,
  handleOrganizationMembershipUpsert,
  handleOrganizationUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionUpsert,
  handleUserDeleted,
  handleUserUpdated,
} from "@/lib/db/sync/clerk";

export async function POST(req: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(req);
  } catch (error) {
    logger.error("Clerk webhook verification failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Verification failed", { status: 400 });
  }

  const eventType = event.type as string;
  const data = event.data as unknown as Record<string, unknown>;

  try {
    await runWithDbScope({ bypass: true }, async () => {
    if (eventType === "organization.created") {
      await handleOrganizationCreated({
        id: String(data.id),
        name: String(data.name ?? ""),
        slug: String(data.slug ?? data.id),
      });
    } else if (eventType === "organization.updated") {
      await handleOrganizationUpdated({
        id: String(data.id),
        name: String(data.name ?? ""),
        slug: String(data.slug ?? data.id),
      });
    } else if (eventType === "organization.deleted") {
      await handleOrganizationDeleted({
        id: data.id ? String(data.id) : undefined,
      });
    } else if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated"
    ) {
      const organization = data.organization as { id: string };
      const publicUserData = data.public_user_data as { user_id: string };
      await handleOrganizationMembershipUpsert({
        organization,
        public_user_data: publicUserData,
        role: String(data.role ?? "org:member"),
      });
    } else if (eventType === "organizationMembership.deleted") {
      const organization = data.organization as { id: string };
      const publicUserData = data.public_user_data as { user_id: string };
      await handleOrganizationMembershipDeleted({
        organization,
        public_user_data: publicUserData,
        role: data.role ? String(data.role) : undefined,
      });
    } else if (eventType === "user.updated") {
      await handleUserUpdated({
        id: String(data.id),
        email_addresses: data.email_addresses as
          | Array<{ email_address: string }>
          | undefined,
      });
    } else if (eventType === "user.deleted") {
      await handleUserDeleted({
        id: String(data.id),
      });
    } else if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated" ||
      eventType === "subscriptionItem.created" ||
      eventType === "subscriptionItem.updated"
    ) {
      await handleSubscriptionUpsert(
        data as Parameters<typeof handleSubscriptionUpsert>[0],
      );
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "subscriptionItem.canceled" ||
      eventType === "subscriptionItem.ended"
    ) {
      await handleSubscriptionDeleted(
        data as Parameters<typeof handleSubscriptionDeleted>[0],
      );
    } else {
      logger.debug("Unhandled Clerk webhook event", { type: eventType });
    }
    });
  } catch (error) {
    logger.captureException(error, { eventType });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
