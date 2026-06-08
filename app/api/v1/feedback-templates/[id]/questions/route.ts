import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getFeedbackTemplateIdFromPath } from "@/lib/api/session-feedback-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  createFeedbackQuestion,
  reorderFeedbackQuestions,
} from "@/lib/session-feedback/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createFeedbackQuestionSchema,
  reorderFeedbackQuestionsSchema,
} from "@/lib/validators/session-feedback";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "custom_session_feedback" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const templateId = getFeedbackTemplateIdFromPath(request);

    if (!templateId) {
      throw problem({
        type: "validation-error",
        title: "Invalid template id",
        status: 400,
        detail: "Template id is required.",
      });
    }

    const body = await parseJsonBody(createFeedbackQuestionSchema, request);
    const template = await createFeedbackQuestion(
      org.organizationId,
      templateId,
      body,
    );
    return jsonOk(template, { status: 201 });
  },
);

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "custom_session_feedback" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const templateId = getFeedbackTemplateIdFromPath(request);

    if (!templateId) {
      throw problem({
        type: "validation-error",
        title: "Invalid template id",
        status: 400,
        detail: "Template id is required.",
      });
    }

    const body = await parseJsonBody(reorderFeedbackQuestionsSchema, request);
    const template = await reorderFeedbackQuestions(
      org.organizationId,
      templateId,
      body.questionIds,
    );
    return jsonOk(template);
  },
);
