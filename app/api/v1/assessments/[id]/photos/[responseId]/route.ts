import { withApiHandler } from "@/lib/api/handler";
import {
  getAssessmentIdFromPath,
  getAssessmentResponseIdFromPath,
} from "@/lib/api/assessment-route";
import { problem } from "@/lib/api/response";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getOrgContext } from "@/lib/auth/org-context";
import { getAssessmentDetail } from "@/lib/assessments/service";
import { getAssessmentPhotoBlob } from "@/lib/storage/blob";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await getOrgContext();
  if (!org) {
    throw problem({
      type: "unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication required.",
    });
  }

  const id = getAssessmentIdFromPath(request);
  const responseId = getAssessmentResponseIdFromPath(request);

  if (!id || !responseId) {
    throw problem({
      type: "validation-error",
      title: "Invalid ids",
      status: 400,
      detail: "Assessment id and response id are required.",
    });
  }

  const detail = await getAssessmentDetail(org.organizationId, id);

  if (org.role === "client") {
    const clientId = await getClientIdForUser(
      org.organizationId,
      org.clerkUserId,
    );
    if (!clientId || detail.clientId !== clientId) {
      throw problem({
        type: "forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You cannot access this photo.",
      });
    }
  } else {
    await requireCoachRead();
  }

  const response = detail.responses.find((entry) => entry.id === responseId);
  if (!response?.photoBlobPath) {
    throw problem({
      type: "not-found",
      title: "Photo not found",
      status: 404,
      detail: "No photo is linked to this response.",
    });
  }

  const blob = await getAssessmentPhotoBlob(response.photoBlobPath);
  if (!blob || blob.statusCode !== 200) {
    throw problem({
      type: "not-found",
      title: "Photo not found",
      status: 404,
      detail: "Photo blob could not be retrieved.",
    });
  }

  const contentType =
    blob.blob.contentType ?? blob.headers.get("content-type") ?? "image/jpeg";

  return new Response(blob.stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
