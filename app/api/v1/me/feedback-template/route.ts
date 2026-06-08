import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { getActiveFeedbackTemplateForClient } from "@/lib/session-feedback/service";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const client = await requireClient();
  const template = await getActiveFeedbackTemplateForClient(
    client.organizationId,
    client.clerkUserId,
  );

  return jsonOk({
    id: template.id,
    name: template.name,
    questions: template.questions,
  });
});
