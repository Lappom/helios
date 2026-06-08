import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getRevenueDashboard } from "@/lib/revenue/service";
import { parseRevenueDashboardQuery } from "@/lib/validators/payments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const query = parseRevenueDashboardQuery(
    new URL(request.url).searchParams,
  );
  const dashboard = await getRevenueDashboard(org.organizationId, query.months);

  return jsonOk(dashboard);
});
