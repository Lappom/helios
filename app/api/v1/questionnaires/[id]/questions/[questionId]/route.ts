import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getQuestionnaireIdFromPath,
  getQuestionnaireQuestionIdFromPath,
} from "@/lib/api/questionnaire-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteQuestionnaireQuestion,
  patchQuestionnaireQuestion,
} from "@/lib/questionnaires/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchQuestionnaireQuestionSchema } from "@/lib/validators/questionnaires";

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const questionnaireId = getQuestionnaireIdFromPath(request);
    const questionId = getQuestionnaireQuestionIdFromPath(request);

    if (!questionnaireId || !questionId) {
      throw problem({
        type: "validation-error",
        title: "Invalid ids",
        status: 400,
        detail: "Questionnaire id and question id are required.",
      });
    }

    const body = await parseJsonBody(patchQuestionnaireQuestionSchema, request);
    const questionnaire = await patchQuestionnaireQuestion(
      org.organizationId,
      questionnaireId,
      questionId,
      body,
    );
    return jsonOk(questionnaire);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const questionnaireId = getQuestionnaireIdFromPath(request);
    const questionId = getQuestionnaireQuestionIdFromPath(request);

    if (!questionnaireId || !questionId) {
      throw problem({
        type: "validation-error",
        title: "Invalid ids",
        status: 400,
        detail: "Questionnaire id and question id are required.",
      });
    }

    const questionnaire = await deleteQuestionnaireQuestion(
      org.organizationId,
      questionnaireId,
      questionId,
    );
    return jsonOk(questionnaire);
  },
);
