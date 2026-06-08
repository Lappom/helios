import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMealIdFromPath,
  getNutritionPlanIdFromPath,
} from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { reorderMealItems } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderMealItemsSchema } from "@/lib/validators/nutrition-plans";

export const PUT = withApiHandler({ requireOrg: true }, async ({ request }) => {
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

  const body = await parseJsonBody(reorderMealItemsSchema, request);
  const plan = await reorderMealItems(
    org.organizationId,
    planId,
    mealId,
    body.itemIds,
  );

  return jsonOk(plan);
});
