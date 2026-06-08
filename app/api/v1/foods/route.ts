import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createCustomFood, listCustomFoods } from "@/lib/foods/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createFoodSchema,
  parseSearchFoodsQuery,
} from "@/lib/validators/foods";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseSearchFoodsQuery(searchParams, pagination);

  const { items, total } = await listCustomFoods(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createFoodSchema, request);
  const food = await createCustomFood(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(food, { status: 201 });
});
