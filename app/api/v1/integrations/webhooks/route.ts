import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createWebhook, listWebhooks } from "@/lib/integrations/webhooks";
import { parseJsonBody } from "@/lib/validators/clients";
import { createWebhookSchema } from "@/lib/validators/integrations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async () => {
    const org = await requireCoachRead();
    const items = await listWebhooks(org.organizationId);
    return jsonOk({ items });
  },
);

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(createWebhookSchema, request);
    const created = await createWebhook(org.organizationId, body);
    return jsonOk(created, { status: 201 });
  },
);
