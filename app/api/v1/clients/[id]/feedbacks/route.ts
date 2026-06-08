import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromPath } from "@/lib/api/session-feedback-route";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import { problem } from "@/lib/api/response";
import { getClientFeedbacksSummary } from "@/lib/session-feedback/service";
import { parseListClientFeedbacksQuery } from "@/lib/validators/session-feedback";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const clientId = getClientIdFromPath(request);

  if (!clientId) {
    throw problem({
      type: "validation-error",
      title: "Invalid client id",
      status: 400,
      detail: "Client id is required.",
    });
  }

  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListClientFeedbacksQuery(searchParams, pagination);

  const summary = await getClientFeedbacksSummary(
    org.organizationId,
    clientId,
    query,
  );

  return jsonOk(
    {
      feelingAverageLast4: summary.feelingAverageLast4,
      items: summary.items,
      page: pagination.page,
      limit: pagination.limit,
    },
    { headers: withTotalCountHeaders(undefined, summary.total) },
  );
});
