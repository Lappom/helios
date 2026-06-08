import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getConversationIdFromPath } from "@/lib/api/conversation-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  addGroupParticipants,
  getGroupParticipants,
} from "@/lib/messaging/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { addGroupParticipantsSchema } from "@/lib/validators/messaging";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "group_messaging" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const conversationId = getConversationIdFromPath(request);

    const participants = await getGroupParticipants(
      org.organizationId,
      conversationId,
    );

    return jsonOk({ items: participants });
  },
);

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "group_messaging" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const conversationId = getConversationIdFromPath(request);
    const body = await parseJsonBody(addGroupParticipantsSchema, request);

    const participants = await addGroupParticipants(
      org.organizationId,
      conversationId,
      body,
    );

    return jsonOk({ items: participants });
  },
);
