import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getQuestionnaireSubmissionIdFromPath } from "@/lib/api/questionnaire-route";
import { requireClient } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getOrgContext } from "@/lib/auth/org-context";
import { getQuestionnaireSubmissionDetail } from "@/lib/questionnaires/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await getOrgContext();
  if (!org) {
    throw problem({
      type: "unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication required.",
    });
  }

  const submissionId = getQuestionnaireSubmissionIdFromPath(request);
  if (!submissionId) {
    throw problem({
      type: "validation-error",
      title: "Invalid submission id",
      status: 400,
      detail: "Submission id is required.",
    });
  }

  if (org.role === "client") {
    const client = await requireClient();
    const detail = await getQuestionnaireSubmissionDetail(
      client.organizationId,
      submissionId,
      client.clientId,
    );
    return jsonOk(detail);
  }

  await requireCoachRead();
  const detail = await getQuestionnaireSubmissionDetail(
    org.organizationId,
    submissionId,
  );
  return jsonOk(detail);
});
