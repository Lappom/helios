import { getPublicResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { getPublicClient } from "@/lib/integrations/public-read";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const clientId = getPublicResourceIdFromPath(request, "clients");

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const client = await getPublicClient(apiKey.organizationId, clientId);
  return jsonOk(client);
});
