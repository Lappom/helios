import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { hasFeature } from "@/lib/billing/access";
import { problem } from "@/lib/api/response";
import { getClientReferralInfo } from "@/lib/referrals/service";

export const GET = withApiHandler(
  { requireOrg: true },
  async () => {
    const client = await requireClient();
    const enabled = await hasFeature("referral_program");

    if (!enabled) {
      throw problem({
        type: "forbidden",
        title: "Feature not available",
        status: 403,
        detail: "Referral program is not available for this organization.",
      });
    }

    const info = await getClientReferralInfo(
      client.organizationId,
      client.clientId,
    );

    return jsonOk(info);
  },
);
