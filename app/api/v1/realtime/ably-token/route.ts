import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext, requireOrg } from "@/lib/auth/org-context";
import {
  listAccessibleConversationIds,
} from "@/lib/messaging/service";
import type { MessagingActor } from "@/lib/messaging/types";
import { createAblyTokenRequest } from "@/lib/realtime/ably-server";
import { organizationConversationCapability } from "@/lib/realtime/channels";

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

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const org = await requireOrg();
  const actor = await resolveActor();

  await listAccessibleConversationIds(org.organizationId, actor);

  const tokenRequest = await createAblyTokenRequest({
    clientId: org.clerkUserId,
    capability: organizationConversationCapability(org.organizationId),
  });

  if (!tokenRequest) {
    throw problem({
      type: "internal-error",
      title: "Realtime unavailable",
      status: 503,
      detail: "Ably is not configured for this environment.",
    });
  }

  return jsonOk({ tokenRequest });
});
