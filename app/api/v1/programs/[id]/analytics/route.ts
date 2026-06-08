import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getProgramAnalytics } from "@/lib/sessions/analytics";
import { analyticsQuerySchema } from "@/lib/validators/sessions";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const programId = getProgramIdFromPath(request);
  const params = new URL(request.url).searchParams;
  const query = analyticsQuerySchema.safeParse({
    clientId: params.get("clientId"),
    groupBy: params.get("groupBy") ?? undefined,
  });

  if (!query.success) {
    throw problem({
      type: "validation-error",
      title: "Invalid query",
      status: 400,
      detail: "Query parameter clientId is required.",
    });
  }

  const analytics = await getProgramAnalytics(
    org.organizationId,
    programId,
    query.data.clientId,
    { groupBy: query.data.groupBy },
  );

  return jsonOk(analytics);
});
