import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireClient } from "@/lib/api/require-client";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { hasFeature } from "@/lib/billing/access";
import { problem } from "@/lib/api/response";
import {
  createGroupConversation,
  findOrCreateDirectConversation,
  listConversationsForClient,
  listConversationsForCoach,
} from "@/lib/messaging/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createConversationSchema } from "@/lib/validators/messaging";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const mine = searchParams.get("mine") === "true";
  const pagination = parsePagination(searchParams);

  if (mine) {
    const client = await requireClient();
    const items = await listConversationsForClient(
      client.organizationId,
      client.clientId,
      client.clerkUserId,
    );

    return jsonOk({
      items,
      page: 1,
      limit: items.length,
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
  const body = await parseJsonBody(createConversationSchema, request);

  if (body.type === "group") {
    const allowed = await hasFeature("group_messaging");
    if (!allowed) {
      throw problem({
        type: "forbidden",
        title: "Feature not available",
        status: 403,
        detail: "Feature 'group_messaging' is not available on your plan.",
      });
    }

    const conversation = await createGroupConversation(
      org.organizationId,
      org.clerkUserId,
      body,
    );

    return jsonOk(conversation, { status: 201 });
  }

  const conversation = await findOrCreateDirectConversation(
    org.organizationId,
    body.clientId,
    org.clerkUserId,
  );

  return jsonOk(conversation, { status: 201 });
});
