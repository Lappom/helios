import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getConversationIdFromPath } from "@/lib/api/conversation-route";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import { createId } from "@/lib/db/id";
import {
  assertConversationAccess,
} from "@/lib/messaging/service";
import type { MessagingActor } from "@/lib/messaging/types";
import {
  assertMessageMediaUploadAllowed,
  inferMessageMediaType,
  putMessageMedia,
} from "@/lib/storage/blob";

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
  await assertConversationAccess(
    actor.organizationId,
    conversationId,
    actor,
  );

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw problem({
      type: "validation-error",
      title: "Missing file",
      status: 400,
      detail: "Multipart field 'file' is required.",
    });
  }

  assertMessageMediaUploadAllowed(file);

  const messageId = createId();
  const uploaded = await putMessageMedia(file, {
    organizationId: actor.organizationId,
    conversationId,
    messageId,
  });

  return jsonOk({
    pathname: uploaded.pathname,
    mimeType: uploaded.mimeType,
    fileName: uploaded.fileName,
    mediaType: inferMessageMediaType(uploaded.mimeType),
  });
});
