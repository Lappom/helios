import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getNutritionPlanIdFromPath } from "@/lib/api/nutrition-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { assignNutritionPlan } from "@/lib/nutrition/assignments";
import { parseJsonBody } from "@/lib/validators/clients";
import { assignNutritionPlanSchema } from "@/lib/validators/nutrition-plans";

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

  const body = await parseJsonBody(assignNutritionPlanSchema, request);
  const result = await assignNutritionPlan(
    org.organizationId,
    planId,
    org.clerkUserId,
    body,
  );

  return jsonOk(result);
});
