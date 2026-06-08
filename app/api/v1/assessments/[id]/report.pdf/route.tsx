import { renderToBuffer } from "@react-pdf/renderer";
import { withApiHandler } from "@/lib/api/handler";
import { getAssessmentIdFromPath } from "@/lib/api/assessment-route";
import { problem } from "@/lib/api/response";
import { getClientIdForUser } from "@/lib/api/require-client";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getOrgContext } from "@/lib/auth/org-context";
import {
  compareClientAssessments,
  getAssessmentDetail,
} from "@/lib/assessments/service";
import { AssessmentReportDocument } from "@/lib/assessments/report-pdf";

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

  const pathname = new URL(request.url).pathname;
  const id = pathname.includes("/assessments/")
    ? pathname.split("/assessments/")[1]?.split("/")[0] ?? ""
    : getAssessmentIdFromPath(request);

  if (!id) {
    throw problem({
      type: "validation-error",
      title: "Invalid assessment id",
      status: 400,
      detail: "Assessment id is required.",
    });
  }

  const assessment = await getAssessmentDetail(org.organizationId, id);

  if (org.role === "client") {
    const clientId = await getClientIdForUser(
      org.organizationId,
      org.clerkUserId,
    );
    if (!clientId || assessment.clientId !== clientId) {
      throw problem({
        type: "forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You cannot access this report.",
      });
    }
  } else {
    await requireCoachRead();
  }

  const compare = await compareClientAssessments(
    org.organizationId,
    assessment.clientId,
    assessment.id,
  );

  const buffer = await renderToBuffer(
    <AssessmentReportDocument
      assessment={assessment}
      measurementDeltas={compare.measurementDeltas}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bilan-${assessment.id}.pdf"`,
    },
  });
});
