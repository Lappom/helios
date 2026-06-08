import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { logMeal } from "@/lib/nutrition/meal-logs";
import { parseJsonBody } from "@/lib/validators/clients";
import { logMealSchema } from "@/lib/validators/nutrition-plans";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const body = await parseJsonBody(logMealSchema, request);
  const log = await logMeal(
    client.organizationId,
    client.clientId,
    body,
  );

  return jsonOk(log, { status: 201 });
});
