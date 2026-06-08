import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getRecipeIdFromPath } from "@/lib/api/recipe-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { scaleRecipe } from "@/lib/recipes/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { scaleRecipeSchema } from "@/lib/validators/recipes";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getRecipeIdFromPath(request);
  const body = await parseJsonBody(scaleRecipeSchema, request);
  const preview = await scaleRecipe(
    org.organizationId,
    id,
    body.scaleFactor,
  );

  return jsonOk(preview);
});
