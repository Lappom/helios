import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromPath } from "@/lib/api/client-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getActiveClientNutrition } from "@/lib/nutrition/assignments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const clientId = getClientIdFromPath(request);

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const assignment = await getActiveClientNutrition(
    org.organizationId,
    clientId,
  );

  return jsonOk(assignment);
});
