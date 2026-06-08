import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMealIdFromPath,
  getNutritionPlanIdFromPath,
} from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { deleteMeal, patchMeal } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchMealSchema } from "@/lib/validators/nutrition-plans";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);
  const mealId = getMealIdFromPath(request);

  if (!planId || !mealId) {
    throw problem({
      type: "validation-error",
      title: "Invalid meal id",
      status: 400,
      detail: "Nutrition plan id and meal id are required.",
    });
  }

  const body = await parseJsonBody(patchMealSchema, request);
  const plan = await patchMeal(org.organizationId, planId, mealId, body);

  return jsonOk(plan);
});

export const DELETE = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);
  const mealId = getMealIdFromPath(request);

  if (!planId || !mealId) {
    throw problem({
      type: "validation-error",
      title: "Invalid meal id",
      status: 400,
      detail: "Nutrition plan id and meal id are required.",
    });
  }

  const plan = await deleteMeal(org.organizationId, planId, mealId);
  return jsonOk(plan);
});
