import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getNutritionPlanIdFromPath } from "@/lib/api/nutrition-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getPlanAdherence } from "@/lib/nutrition/adherence";
import { adherenceQuerySchema } from "@/lib/validators/nutrition-plans";

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

  const searchParams = new URL(request.url).searchParams;
  const query = adherenceQuerySchema.parse({
    start: searchParams.get("start"),
    end: searchParams.get("end"),
    clientId: searchParams.get("clientId") ?? undefined,
  });

  const report = await getPlanAdherence(org.organizationId, planId, query);
  return jsonOk(report);
});
