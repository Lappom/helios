import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createCategory, listCategories } from "@/lib/videos/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createCategorySchema } from "@/lib/validators/videos";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const org = await requireCoachRead();
  const items = await listCategories(org.organizationId);
  return jsonOk({ items });
});

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createCategorySchema, request);
  const category = await createCategory(org.organizationId, body);
  return jsonOk(category, { status: 201 });
});
