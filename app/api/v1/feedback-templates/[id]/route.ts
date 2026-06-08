import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getFeedbackTemplateIdFromPath } from "@/lib/api/session-feedback-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteFeedbackTemplate,
  getFeedbackTemplateTree,
  patchFeedbackTemplate,
} from "@/lib/session-feedback/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchFeedbackTemplateSchema } from "@/lib/validators/session-feedback";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const templateId = getFeedbackTemplateIdFromPath(request);

  if (!templateId) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  const template = await getFeedbackTemplateTree(
    org.organizationId,
    templateId,
  );
  return jsonOk(template);
});

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

    const body = await parseJsonBody(patchFeedbackTemplateSchema, request);
    const template = await patchFeedbackTemplate(
      org.organizationId,
      templateId,
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

    if (!templateId) {
      throw problem({
        type: "validation-error",
        title: "Invalid template id",
        status: 400,
        detail: "Template id is required.",
      });
    }

    await deleteFeedbackTemplate(org.organizationId, templateId);
    return jsonOk({ ok: true });
  },
);
