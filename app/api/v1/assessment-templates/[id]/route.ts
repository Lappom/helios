import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentTemplateIdFromPath } from "@/lib/api/assessment-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import {
  deleteAssessmentTemplate,
  getAssessmentTemplateTree,
  patchAssessmentTemplate,
} from "@/lib/assessments/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchAssessmentTemplateSchema } from "@/lib/validators/assessments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getAssessmentTemplateIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  const template = await getAssessmentTemplateTree(org.organizationId, id);
  return jsonOk(template);
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getAssessmentTemplateIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  const body = await parseJsonBody(patchAssessmentTemplateSchema, request);
  const template = await patchAssessmentTemplate(org.organizationId, id, body);
  return jsonOk(template);
});

export const DELETE = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getAssessmentTemplateIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid template id",
      status: 400,
      detail: "Template id is required.",
    });
  }

  await deleteAssessmentTemplate(org.organizationId, id);
  return jsonOk({ deleted: true });
});
