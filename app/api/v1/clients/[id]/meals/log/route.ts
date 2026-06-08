import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromPath } from "@/lib/api/client-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { logMeal } from "@/lib/nutrition/meal-logs";
import { parseJsonBody } from "@/lib/validators/clients";
import { logMealSchema } from "@/lib/validators/nutrition-plans";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const clientId = getClientIdFromPath(request);

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const body = await parseJsonBody(logMealSchema, request);
  const log = await logMeal(org.organizationId, clientId, body);

  return jsonOk(log, { status: 201 });
});
