import { getPublicResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { getPublicSessionLog } from "@/lib/integrations/public-read";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const sessionLogId = getPublicResourceIdFromPath(request, "sessions");

  if (!sessionLogId) {
    throw problem({
      type: "validation-error",
      title: "Invalid session id",
      status: 400,
      detail: "Session id is required.",
    });
  }

  const session = await getPublicSessionLog(
    apiKey.organizationId,
    sessionLogId,
  );
  return jsonOk(session);
});
