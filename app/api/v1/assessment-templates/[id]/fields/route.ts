import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentTemplateIdFromPath } from "@/lib/api/assessment-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  createAssessmentField,
  reorderAssessmentFields,
} from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import {
  createAssessmentFieldSchema,
  reorderAssessmentFieldsSchema,
} from "@/lib/validators/assessments";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const templateId = getAssessmentTemplateIdFromPath(request);

  if (!templateId) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  const body = await parseJsonBody(createAssessmentFieldSchema, request);
  const template = await createAssessmentField(org.organizationId, templateId, body);
  return jsonOk(template, { status: 201 });
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const templateId = getAssessmentTemplateIdFromPath(request);

  if (!templateId) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  const body = await parseJsonBody(reorderAssessmentFieldsSchema, request);
  const template = await reorderAssessmentFields(
    org.organizationId,
    templateId,
    body.fieldIds,
  );
  return jsonOk(template);
});
