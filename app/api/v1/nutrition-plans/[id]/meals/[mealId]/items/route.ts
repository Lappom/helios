import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMealIdFromPath,
  getNutritionPlanIdFromPath,
} from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { createMealItem } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createMealItemSchema } from "@/lib/validators/nutrition-plans";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
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

  const body = await parseJsonBody(createMealItemSchema, request);
  const plan = await createMealItem(
    org.organizationId,
    planId,
    mealId,
    body,
  );

  return jsonOk(plan, { status: 201 });
});
