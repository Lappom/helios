import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { listPublicSessionLogs } from "@/lib/integrations/public-read";
import { parseListSessionLogsQuery } from "@/lib/validators/integrations";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListSessionLogsQuery(searchParams, pagination);
  const { items, total } = await listPublicSessionLogs(
    apiKey.organizationId,
    query,
  );

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
