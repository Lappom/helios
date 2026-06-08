import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getFeedbackQuestionIdFromPath,
  getFeedbackTemplateIdFromPath,
} from "@/lib/api/session-feedback-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteFeedbackQuestion,
  patchFeedbackQuestion,
} from "@/lib/session-feedback/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchFeedbackQuestionSchema } from "@/lib/validators/session-feedback";

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "custom_session_feedback" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const templateId = getFeedbackTemplateIdFromPath(request);
    const questionId = getFeedbackQuestionIdFromPath(request);

    if (!templateId || !questionId) {
      throw problem({
        type: "validation-error",
        title: "Invalid ids",
        status: 400,
        detail: "Template id and question id are required.",
      });
    }

    const body = await parseJsonBody(patchFeedbackQuestionSchema, request);
    const template = await patchFeedbackQuestion(
      org.organizationId,
      templateId,
      questionId,
      body,
    );
    return jsonOk(template);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "custom_session_feedback" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const templateId = getFeedbackTemplateIdFromPath(request);
    const questionId = getFeedbackQuestionIdFromPath(request);

    if (!templateId || !questionId) {
      throw problem({
        type: "validation-error",
        title: "Invalid ids",
        status: 400,
        detail: "Template id and question id are required.",
      });
    }

    const template = await deleteFeedbackQuestion(
      org.organizationId,
      templateId,
      questionId,
    );
    return jsonOk(template);
  },
);
