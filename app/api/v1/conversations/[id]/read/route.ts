import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getConversationIdFromPath } from "@/lib/api/conversation-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import { markConversationRead } from "@/lib/messaging/service";
import type { MessagingActor } from "@/lib/messaging/types";
import { parseJsonBody } from "@/lib/validators/clients";
import { markReadSchema } from "@/lib/validators/messaging";

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

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const conversationId = getConversationIdFromPath(request);
  if (!conversationId) {
    throw problem({
      type: "validation-error",
      title: "Invalid conversation id",
      status: 400,
      detail: "Conversation id is required.",
    });
  }

  const actor = await resolveActor();
  const body = await parseJsonBody(markReadSchema, request);
  const result = await markConversationRead(
    actor.organizationId,
    conversationId,
    actor,
    body.messageId,
  );

  return jsonOk(result);
});
