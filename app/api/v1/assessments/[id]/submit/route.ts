import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentIdFromPath } from "@/lib/api/assessment-route";
import { requireClient } from "@/lib/api/require-client";
import { problem } from "@/lib/api/response";
import { submitAssessment } from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { submitAssessmentSchema } from "@/lib/validators/assessments";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const id = getAssessmentIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid assessment id",
      status: 400,
      detail: "Assessment id is required.",
    });
  }

  const body = await parseJsonBody(submitAssessmentSchema, request);
  const assessment = await submitAssessment(
    client.organizationId,
    client.clientId,
    id,
    body,
  );
  return jsonOk(assessment);
});
