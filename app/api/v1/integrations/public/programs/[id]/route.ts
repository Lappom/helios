import { getPublicResourceIdFromPath } from "@/lib/api/integration-route";
import { problem } from "@/lib/api/response";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { getPublicProgram } from "@/lib/integrations/public-read";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const programId = getPublicResourceIdFromPath(request, "programs");

  if (!programId) {
    throw problem({
      type: "validation-error",
      title: "Invalid program id",
      status: 400,
      detail: "Program id is required.",
    });
  }

  const program = await getPublicProgram(apiKey.organizationId, programId);
  return jsonOk(program);
});
