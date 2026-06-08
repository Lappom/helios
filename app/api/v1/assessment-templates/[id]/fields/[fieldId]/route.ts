import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getAssessmentTemplateIdFromPath,
  getAssessmentTemplateFieldIdFromPath,
} from "@/lib/api/assessment-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteAssessmentField,
  patchAssessmentField,
} from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchAssessmentFieldSchema } from "@/lib/validators/assessments";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const templateId = getAssessmentTemplateIdFromPath(request);
  const fieldId = getAssessmentTemplateFieldIdFromPath(request);

  if (!templateId || !fieldId) {
    throw problem({
      type: "validation-error",
      title: "Invalid ids",
      status: 400,
      detail: "Template id and field id are required.",
    });
  }

  const body = await parseJsonBody(patchAssessmentFieldSchema, request);
  const template = await patchAssessmentField(
    org.organizationId,
    templateId,
    fieldId,
    body,
  );
  return jsonOk(template);
});

export const DELETE = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const templateId = getAssessmentTemplateIdFromPath(request);
  const fieldId = getAssessmentTemplateFieldIdFromPath(request);

  if (!templateId || !fieldId) {
    throw problem({
      type: "validation-error",
      title: "Invalid ids",
      status: 400,
      detail: "Template id and field id are required.",
    });
  }

  const template = await deleteAssessmentField(
    org.organizationId,
    templateId,
    fieldId,
  );
  return jsonOk(template);
});
