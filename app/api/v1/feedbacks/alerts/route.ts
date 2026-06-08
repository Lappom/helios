import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import { listFeedbackAlerts } from "@/lib/session-feedback/service";
import { parseListFeedbackAlertsQuery } from "@/lib/validators/session-feedback";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListFeedbackAlertsQuery(searchParams, pagination);

  const { items, total } = await listFeedbackAlerts(org.organizationId, query);

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
