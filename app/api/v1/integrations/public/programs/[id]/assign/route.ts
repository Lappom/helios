import { getPublicResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { assignProgramViaIntegration } from "@/lib/integrations/public-write";
import { parseJsonBody } from "@/lib/validators/clients";
import { assignProgramViaIntegrationSchema } from "@/lib/validators/integrations";

export const POST = withPublicApiHandler(async ({ request, apiKey }) => {
  const programId = getPublicResourceIdFromPath(request, "programs");

  if (!programId) {
    throw problem({
      type: "validation-error",
      title: "Invalid program id",
      status: 400,
      detail: "Program id is required.",
    });
  }

  const body = await parseJsonBody(assignProgramViaIntegrationSchema, request);
  const result = await assignProgramViaIntegration(
    apiKey.organizationId,
    programId,
    body,
  );

  return jsonOk(result, { status: 201 });
});
