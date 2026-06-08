import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAssessmentIdFromPath } from "@/lib/api/assessment-route";
import { problem } from "@/lib/api/response";
import { getClientIdForUser, requireClient } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getOrgContext } from "@/lib/auth/org-context";
import { getAssessmentDetail } from "@/lib/assessments/service";

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
  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid assessment id",
      status: 400,
      detail: "Assessment id is required.",
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
        detail: "You cannot access this assessment.",
      });
    }
  } else {
    await requireCoachRead();
  }

  return jsonOk(detail);
});
