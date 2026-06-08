import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromAssessmentsPath } from "@/lib/api/assessment-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { compareClientAssessments } from "@/lib/assessments/service";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const clientId = getClientIdFromAssessmentsPath(request);

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const searchParams = new URL(request.url).searchParams;
  const a = searchParams.get("a") ?? undefined;
  const b = searchParams.get("b") ?? undefined;

  const result = await compareClientAssessments(
    org.organizationId,
    clientId,
    a,
    b,
  );

  return jsonOk(result);
});
