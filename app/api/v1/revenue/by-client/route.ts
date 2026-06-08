import { withApiHandler } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getRevenueByClient } from "@/lib/revenue/service";
import { parseRevenueByClientQuery } from "@/lib/validators/payments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const query = parseRevenueByClientQuery(new URL(request.url).searchParams);
  const report = await getRevenueByClient(org.organizationId, query);

  return Response.json(report);
});
