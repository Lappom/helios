import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getConversationIdFromPath } from "@/lib/api/conversation-route";
import { requireCoachWrite } from "@/lib/api/require-coach";

function getClientIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("participants");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  return segments[index + 1]!;
}

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "group_messaging" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const conversationId = getConversationIdFromPath(request);
    const clientId = getClientIdFromPath(request);

    const { removeGroupParticipant } = await import("@/lib/messaging/service");
    const participants = await removeGroupParticipant(
      org.organizationId,
      conversationId,
      clientId,
    );

    return jsonOk({ items: participants });
  },
);
