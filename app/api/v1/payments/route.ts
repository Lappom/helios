import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import {
  buildRevenueCsv,
  getRevenueByClient,
  getRevenueDashboard,
  listPayments,
} from "@/lib/revenue/service";
import {
  parseListPaymentsQuery,
  parseRevenueByClientQuery,
  parseRevenueDashboardQuery,
  parseRevenueExportQuery,
} from "@/lib/validators/payments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const searchParams = new URL(request.url).searchParams;

  const query = parseListPaymentsQuery(searchParams);
  const { items, total } = await listPayments(org.organizationId, query);

  return jsonOk(
    { items, page: query.page, limit: query.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
