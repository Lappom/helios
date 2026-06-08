import { withApiHandler } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { buildRevenueCsv } from "@/lib/revenue/service";
import { parseRevenueExportQuery } from "@/lib/validators/payments";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const query = parseRevenueExportQuery(new URL(request.url).searchParams);
  const csv = await buildRevenueCsv(org.organizationId, query);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="revenue-export.csv"',
    },
  });
});
