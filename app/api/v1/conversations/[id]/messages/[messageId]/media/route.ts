import { withApiHandler } from "@/lib/api/handler";
import {
  getConversationIdFromPath,
  getMessageIdFromPath,
} from "@/lib/api/conversation-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import { getMessageForMedia } from "@/lib/messaging/service";
import type { MessagingActor } from "@/lib/messaging/types";
import { getMessageMediaBlob } from "@/lib/storage/blob";

async function resolveActor(): Promise<MessagingActor> {
  const org = await getOrgContext();
  if (!org) {
    throw problem({
      type: "unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication required.",
    });
  }

  if (org.role === "client") {
    const clientId = await getClientIdForUser(
      org.organizationId,
      org.clerkUserId,
    );
    if (!clientId) {
      throw problem({
        type: "forbidden",
        title: "Forbidden",
        status: 403,
        detail: "No client profile is linked to this account.",
      });
    }

    return {
      role: "client",
      organizationId: org.organizationId,
      clerkUserId: org.clerkUserId,
      clientId,
    };
  }

  await requireCoachRead();
  return {
    role: "coach",
    organizationId: org.organizationId,
    clerkUserId: org.clerkUserId,
  };
}

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const conversationId = getConversationIdFromPath(request);
  const messageId = getMessageIdFromPath(request);

  if (!conversationId || !messageId) {
    throw problem({
      type: "validation-error",
      title: "Invalid route",
      status: 400,
      detail: "Conversation id and message id are required.",
    });
  }

  const actor = await resolveActor();
  const message = await getMessageForMedia(
    actor.organizationId,
    conversationId,
    messageId,
    actor,
  );

  const blob = await getMessageMediaBlob(message.mediaPathname!);
  if (!blob) {
    throw problem({
      type: "not-found",
      title: "Media not found",
      status: 404,
      detail: "The media file could not be retrieved.",
    });
  }

  const headers = new Headers();
  if (message.mimeType) {
    headers.set("Content-Type", message.mimeType);
  }
  if (message.fileName) {
    headers.set(
      "Content-Disposition",
      `inline; filename="${message.fileName.replace(/"/g, "")}"`,
    );
  }

  return new Response(blob.stream, { headers });
});
