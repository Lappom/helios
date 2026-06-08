import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getBarcodeFromPath } from "@/lib/api/food-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getFoodByBarcode } from "@/lib/foods/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const code = getBarcodeFromPath(request);

  const food = await getFoodByBarcode(org.organizationId, code);
  return jsonOk(food);
});
