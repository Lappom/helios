import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { regenerateCodeForClient } from "@/lib/referrals/service";

function getClientIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const codesIndex = segments.indexOf("codes");
  return codesIndex >= 0 ? (segments[codesIndex + 1] ?? "") : "";
}

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "referral_program" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const clientId = getClientIdFromPath(request);
    const code = await regenerateCodeForClient(
      org.organizationId,
      org.clerkUserId,
      clientId,
    );
    return jsonOk(code);
  },
);
