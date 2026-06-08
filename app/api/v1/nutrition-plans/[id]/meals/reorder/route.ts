import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getNutritionPlanIdFromPath } from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { reorderMeals } from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderMealsSchema } from "@/lib/validators/nutrition-plans";

export const PUT = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const planId = getNutritionPlanIdFromPath(request);

  if (!planId) {
    throw problem({
      type: "validation-error",
      title: "Invalid nutrition plan id",
      status: 400,
      detail: "Nutrition plan id is required.",
    });
  }

  const body = await parseJsonBody(reorderMealsSchema, request);
  const plan = await reorderMeals(
    org.organizationId,
    planId,
    body.mealIds,
  );

  return jsonOk(plan);
});
