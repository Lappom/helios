import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { getClientNutritionPayload } from "@/lib/nutrition/meal-logs";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const searchParams = new URL(request.url).searchParams;
  const date =
    searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const payload = await getClientNutritionPayload(
    client.organizationId,
    client.clientId,
    date,
  );

  return jsonOk(payload);
});
