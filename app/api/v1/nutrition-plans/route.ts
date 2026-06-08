import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createNutritionPlan,
  listNutritionPlans,
} from "@/lib/nutrition/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createNutritionPlanSchema,
  parseListNutritionPlansQuery,
} from "@/lib/validators/nutrition-plans";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListNutritionPlansQuery(searchParams, pagination);

  const { items, total } = await listNutritionPlans(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createNutritionPlanSchema, request);
  const plan = await createNutritionPlan(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(plan, { status: 201 });
});
