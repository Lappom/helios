import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { withPublicApiHandler, jsonOk } from "@/lib/api/public-api-handler";
import { listPublicPrograms } from "@/lib/integrations/public-read";
import { parseListProgramsQuery } from "@/lib/validators/programs";

export const GET = withPublicApiHandler(async ({ request, apiKey }) => {
  const searchParams = new URL(request.url).searchParams;
  const pagination = parsePagination(searchParams);
  const query = parseListProgramsQuery(searchParams, pagination);
  const { items, total } = await listPublicPrograms(
    apiKey.organizationId,
    query,
  );

  return jsonOk(
    { items, page: pagination.page, limit: pagination.limit },
    { headers: withTotalCountHeaders(undefined, total) },
  );
});
