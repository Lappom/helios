import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getQuestionnaireIdFromPath } from "@/lib/api/questionnaire-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteQuestionnaire,
  getQuestionnaireTree,
  patchQuestionnaire,
} from "@/lib/questionnaires/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchQuestionnaireSchema } from "@/lib/validators/questionnaires";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const questionnaireId = getQuestionnaireIdFromPath(request);

    if (!questionnaireId) {
      throw problem({
        type: "validation-error",
        title: "Invalid questionnaire id",
        status: 400,
        detail: "Questionnaire id is required.",
      });
    }

    const questionnaire = await getQuestionnaireTree(
      org.organizationId,
      questionnaireId,
    );
    return jsonOk(questionnaire);
  },
);

export const PATCH = withApiHandler(
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

    const body = await parseJsonBody(patchQuestionnaireSchema, request);
    const questionnaire = await patchQuestionnaire(
      org.organizationId,
      questionnaireId,
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

    if (!questionnaireId) {
      throw problem({
        type: "validation-error",
        title: "Invalid questionnaire id",
        status: 400,
        detail: "Questionnaire id is required.",
      });
    }

    await deleteQuestionnaire(org.organizationId, questionnaireId);
    return jsonOk({ deleted: true });
  },
);
