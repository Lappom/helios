import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getQuestionnaireIdFromPath } from "@/lib/api/questionnaire-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { createQuestionnaireQuestion } from "@/lib/questionnaires/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createQuestionnaireQuestionSchema } from "@/lib/validators/questionnaires";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const questionnaireId = getQuestionnaireIdFromPath(request);

    if (!questionnaireId) {
      throw problem({
        type: "validation-error",
        title: "Invalid questionnaire id",
        status: 400,
        detail: "Questionnaire id is required.",
      });
    }

    const body = await parseJsonBody(createQuestionnaireQuestionSchema, request);
    const questionnaire = await createQuestionnaireQuestion(
      org.organizationId,
      questionnaireId,
      body,
    );
    return jsonOk(questionnaire, { status: 201 });
  },
);
