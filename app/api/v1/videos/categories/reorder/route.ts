import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { reorderCategories } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderCategoriesSchema } from "@/lib/validators/videos";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(reorderCategoriesSchema, request);
  const items = await reorderCategories(org.organizationId, body);
  return jsonOk({ items });
});
