import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getIntegrationResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { revokeApiKey } from "@/lib/integrations/api-keys";

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "api_access" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const apiKeyId = getIntegrationResourceIdFromPath(request, "api-keys");

    if (!apiKeyId) {
      throw problem({
        type: "validation-error",
        title: "Invalid API key id",
        status: 400,
        detail: "API key id is required.",
      });
    }

    await revokeApiKey(org.organizationId, apiKeyId);
    return jsonOk({ ok: true });
  },
);
