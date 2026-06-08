import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { withTotalCountHeaders } from "@/lib/api/pagination";
import { requireCoachRead } from "@/lib/api/require-coach";
import { listReferralConversions } from "@/lib/referrals/service";
import { parseListReferralConversionsQuery } from "@/lib/validators/referrals";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "referral_program" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const query = parseListReferralConversionsQuery(
      new URL(request.url).searchParams,
    );
    const { items, total } = await listReferralConversions(
      org.organizationId,
      query,
    );
    return jsonOk(
      { items },
      { headers: withTotalCountHeaders(undefined, total) },
    );
  },
);
