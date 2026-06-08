import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { hasFeature } from "@/lib/billing/access";
import { listPendingQuestionnairesForClient } from "@/lib/questionnaires/service";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const client = await requireClient();
  const enabled = await hasFeature("recurring_questionnaires");

  if (!enabled) {
    return jsonOk([]);
  }

  const items = await listPendingQuestionnairesForClient(
    client.organizationId,
    client.clientId,
  );

  return jsonOk(items);
});
