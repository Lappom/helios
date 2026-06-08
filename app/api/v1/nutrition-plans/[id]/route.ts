import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getNutritionPlanIdFromPath } from "@/lib/api/nutrition-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  getNutritionPlanTree,
  patchNutritionPlan,
} from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchNutritionPlanSchema } from "@/lib/validators/nutrition-plans";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const planId = getNutritionPlanIdFromPath(request);

  if (!planId) {
    throw problem({
      type: "validation-error",
      title: "Invalid nutrition plan id",
      status: 400,
      detail: "Nutrition plan id is required.",
    });
  }

  const plan = await getNutritionPlanTree(org.organizationId, planId);
  return jsonOk(plan);
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
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

  const body = await parseJsonBody(patchNutritionPlanSchema, request);
  const plan = await patchNutritionPlan(org.organizationId, planId, body);

  return jsonOk(plan);
});
