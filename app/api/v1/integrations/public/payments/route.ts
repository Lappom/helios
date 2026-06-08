import { withTotalCountHeaders } from "@/lib/api/pagination";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { listPublicPayments } from "@/lib/integrations/public-read";
import { parseListPaymentsQuery } from "@/lib/validators/payments";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const searchParams = new URL(request.url).searchParams;
  const query = parseListPaymentsQuery(searchParams);
  const { items, total } = await listPublicPayments(
    apiKey.organizationId,
    query,
  );

  return jsonOk(
    { items, page: query.page, limit: query.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
