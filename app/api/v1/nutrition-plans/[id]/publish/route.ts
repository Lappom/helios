import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getNutritionPlanIdFromPath } from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { publishNutritionPlan } from "@/lib/nutrition/service";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
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

  const plan = await publishNutritionPlan(org.organizationId, planId);
  return jsonOk(plan);
});
