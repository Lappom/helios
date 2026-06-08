import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { createApiKey, listApiKeys } from "@/lib/integrations/api-keys";
import { parseJsonBody } from "@/lib/validators/clients";
import { createApiKeySchema } from "@/lib/validators/integrations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async () => {
    const org = await requireCoachRead();
    const items = await listApiKeys(org.organizationId);
    return jsonOk({ items });
  },
);

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(createApiKeySchema, request);
    const created = await createApiKey(
      org.organizationId,
      org.clerkUserId,
      body,
    );
    return jsonOk(created, { status: 201 });
  },
);
