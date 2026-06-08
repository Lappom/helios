import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getQuestionnaireSubmissionIdFromPath } from "@/lib/api/questionnaire-route";
import { requireClient } from "@/lib/api/require-client";
import { problem } from "@/lib/api/response";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import { submitQuestionnaire } from "@/lib/questionnaires/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { submitQuestionnaireSchema } from "@/lib/validators/questionnaires";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const submissionId = getQuestionnaireSubmissionIdFromPath(request);

  if (!submissionId) {
    throw problem({
      type: "validation-error",
      title: "Invalid submission id",
      status: 400,
      detail: "Submission id is required.",
    });
  }

  const body = await parseJsonBody(submitQuestionnaireSchema, request);
  const detail = await submitQuestionnaire(
    client.organizationId,
    client.clientId,
    submissionId,
    body,
  );

  emitHeliosEvent("form.completed", {
    organizationId: client.organizationId,
    clientId: client.clientId,
    submissionId: detail.id,
    questionnaireId: detail.questionnaireId,
  });

  return jsonOk(detail, { status: 201 });
});
