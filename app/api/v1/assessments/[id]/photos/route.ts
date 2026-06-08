import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentIdFromPath } from "@/lib/api/assessment-route";
import { requireClient } from "@/lib/api/require-client";
import { problem } from "@/lib/api/response";
import {
  getAssessmentDetail,
  upsertAssessmentPhotoResponse,
} from "@/lib/assessments/service";
import { putAssessmentPhoto } from "@/lib/storage/blob";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const id = getAssessmentIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid assessment id",
      status: 400,
      detail: "Assessment id is required.",
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const fieldId = formData.get("fieldId");

  if (!(file instanceof File)) {
    throw problem({
      type: "validation-error",
      title: "Missing file",
      status: 400,
      detail: "Multipart field 'file' is required.",
    });
  }

  if (typeof fieldId !== "string" || !fieldId) {
    throw problem({
      type: "validation-error",
      title: "Missing fieldId",
      status: 400,
      detail: "Multipart field 'fieldId' is required.",
    });
  }

  const detail = await getAssessmentDetail(client.organizationId, id);
  if (detail.clientId !== client.clientId) {
    throw problem({
      type: "forbidden",
      title: "Forbidden",
      status: 403,
      detail: "This assessment belongs to another client.",
    });
  }

  const uploaded = await putAssessmentPhoto(file, {
    organizationId: client.organizationId,
    clientId: client.clientId,
    assessmentId: id,
    fieldId,
  });

  await upsertAssessmentPhotoResponse(
    client.organizationId,
    client.clientId,
    id,
    fieldId,
    uploaded.pathname,
  );

  const updated = await getAssessmentDetail(client.organizationId, id);
  const response = updated.responses.find((entry) => entry.fieldId === fieldId);

  return jsonOk({
    pathname: uploaded.pathname,
    responseId: response?.id ?? null,
  });
});
