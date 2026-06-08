import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { validateCheckoutReferralCode } from "@/lib/checkout/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { validateReferralCodeSchema } from "@/lib/validators/referrals";

export const POST = withApiHandler(
  { requireOrg: false, rateLimit: true },
  async ({ request }) => {
    const body = await parseJsonBody(validateReferralCodeSchema, request);
    const result = await validateCheckoutReferralCode(
      body.serviceId,
      body.code,
      body.prospectEmail,
    );
    return jsonOk(result);
  },
);
