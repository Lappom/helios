import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getFoodIdFromPath } from "@/lib/api/food-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  getFoodById,
  updateCustomFood,
} from "@/lib/foods/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { updateFoodSchema } from "@/lib/validators/foods";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getFoodIdFromPath(request);
  const food = await getFoodById(org.organizationId, id);

  return jsonOk(food);
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getFoodIdFromPath(request);
  const body = await parseJsonBody(updateFoodSchema, request);
  const food = await updateCustomFood(org.organizationId, id, body);

  return jsonOk(food);
});
