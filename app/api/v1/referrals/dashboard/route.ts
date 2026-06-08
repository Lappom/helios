import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getReferralDashboard } from "@/lib/referrals/service";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "referral_program" },
  async () => {
    const org = await requireCoachRead();
    const dashboard = await getReferralDashboard(org.organizationId);
    return jsonOk(dashboard);
  },
);
