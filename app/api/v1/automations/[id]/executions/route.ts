import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAutomationIdFromPath } from "@/lib/api/automation-route";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import { listAutomationExecutions } from "@/lib/automations/service";
import { parseListExecutionsQuery } from "@/lib/validators/automations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const id = getAutomationIdFromPath(request);
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseListExecutionsQuery(searchParams, pagination);
    const { items, total } = await listAutomationExecutions(
      org.organizationId,
      id,
      query,
    );

    return jsonOk(
      { items, page: pagination.page, limit: pagination.limit },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);
