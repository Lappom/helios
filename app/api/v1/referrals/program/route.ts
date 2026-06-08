import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  getOrCreateProgram,
  updateProgram,
} from "@/lib/referrals/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchReferralProgramSchema } from "@/lib/validators/referrals";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "referral_program" },
  async () => {
    const org = await requireCoachRead();
    const program = await getOrCreateProgram(
      org.organizationId,
      org.clerkUserId,
    );
    return jsonOk(program);
  },
);

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "referral_program" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const body = await parseJsonBody(patchReferralProgramSchema, request);
    const program = await updateProgram(
      org.organizationId,
      org.clerkUserId,
      body,
    );
    return jsonOk(program);
  },
);
