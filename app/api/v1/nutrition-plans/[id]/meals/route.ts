import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMealIdFromPath,
  getNutritionPlanIdFromPath,
} from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { createMeal } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createMealSchema } from "@/lib/validators/nutrition-plans";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);

  if (!planId || getMealIdFromPath(request)) {
    throw problem({
      type: "validation-error",
      title: "Invalid nutrition plan id",
      status: 400,
      detail: "Nutrition plan id is required.",
    });
  }

  const body = await parseJsonBody(createMealSchema, request);
  const plan = await createMeal(org.organizationId, planId, body);

  return jsonOk(plan, { status: 201 });
});
