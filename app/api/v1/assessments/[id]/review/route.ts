import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentIdFromPath } from "@/lib/api/assessment-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { reviewAssessment } from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reviewAssessmentSchema } from "@/lib/validators/assessments";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getAssessmentIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid assessment id",
      status: 400,
      detail: "Assessment id is required.",
    });
  }

  const body = await parseJsonBody(reviewAssessmentSchema, request);
  const assessment = await reviewAssessment(org.organizationId, id, body);
  return jsonOk(assessment);
});
