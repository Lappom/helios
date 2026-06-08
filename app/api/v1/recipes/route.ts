import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  createRecipe,
  listRecipes,
} from "@/lib/recipes/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createRecipeSchema,
  parseListRecipesQuery,
} from "@/lib/validators/recipes";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListRecipesQuery(searchParams, pagination);

  const { items, total } = await listRecipes(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createRecipeSchema, request);
  const recipe = await createRecipe(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  return jsonOk(recipe, { status: 201 });
});
