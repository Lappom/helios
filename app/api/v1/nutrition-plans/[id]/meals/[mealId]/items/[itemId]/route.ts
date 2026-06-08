import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMealIdFromPath,
  getMealItemIdFromPath,
  getNutritionPlanIdFromPath,
} from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { deleteMealItem, patchMealItem } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchMealItemSchema } from "@/lib/validators/nutrition-plans";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);
  const mealId = getMealIdFromPath(request);
  const itemId = getMealItemIdFromPath(request);

  if (!planId || !mealId || !itemId) {
    throw problem({
      type: "validation-error",
      title: "Invalid meal item id",
      status: 400,
      detail: "Nutrition plan id, meal id and item id are required.",
    });
  }

  const body = await parseJsonBody(patchMealItemSchema, request);
  const plan = await patchMealItem(
    org.organizationId,
    planId,
    mealId,
    itemId,
    body,
  );

  return jsonOk(plan);
});

export const DELETE = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);
  const mealId = getMealIdFromPath(request);
  const itemId = getMealItemIdFromPath(request);

  if (!planId || !mealId || !itemId) {
    throw problem({
      type: "validation-error",
      title: "Invalid meal item id",
      status: 400,
      detail: "Nutrition plan id, meal id and item id are required.",
    });
  }

  const plan = await deleteMealItem(
    org.organizationId,
    planId,
    mealId,
    itemId,
  );

  return jsonOk(plan);
});
