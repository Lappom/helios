import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { getClientIdForUser, requireClient } from "@/lib/api/require-client";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { getOrgContext } from "@/lib/auth/org-context";
import {
  findOrCreateDirectConversation,
  getClientConversation,
  listConversationsForCoach,
} from "@/lib/messaging/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createDirectConversationSchema } from "@/lib/validators/messaging";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const mine = searchParams.get("mine") === "true";
  const pagination = parsePagination(searchParams);

  if (mine) {
    const client = await requireClient();
    const conversation = await getClientConversation(
      client.organizationId,
      client.clientId,
      client.clerkUserId,
    );

    return jsonOk({
      items: conversation ? [conversation] : [],
      page: 1,
      limit: 1,
    });
  }

  const org = await requireCoachRead();
  const { items, total } = await listConversationsForCoach(
    org.organizationId,
    org.clerkUserId,
    pagination,
  );

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createDirectConversationSchema, request);
  const conversation = await findOrCreateDirectConversation(
    org.organizationId,
    body.clientId,
    org.clerkUserId,
  );

  return jsonOk(conversation, { status: 201 });
});
