import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getRecipeIdFromPath } from "@/lib/api/recipe-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { getRecipeById, updateRecipe } from "@/lib/recipes/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { updateRecipeSchema } from "@/lib/validators/recipes";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getRecipeIdFromPath(request);
  const recipe = await getRecipeById(org.organizationId, id);

  return jsonOk(recipe);
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getRecipeIdFromPath(request);
  const body = await parseJsonBody(updateRecipeSchema, request);
  const recipe = await updateRecipe(org.organizationId, id, body);

  return jsonOk(recipe);
});
