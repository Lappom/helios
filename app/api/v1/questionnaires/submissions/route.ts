import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { parsePagination, withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import { listQuestionnaireSubmissions } from "@/lib/questionnaires/service";
import { parseListQuestionnaireSubmissionsQuery } from "@/lib/validators/questionnaires";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseListQuestionnaireSubmissionsQuery(
      searchParams,
      pagination,
    );

    const { items, total } = await listQuestionnaireSubmissions(
      org.organizationId,
      query,
    );

    return jsonOk(
      { items, page: pagination.page, limit: pagination.limit },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);
