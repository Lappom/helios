import { eq } from "drizzle-orm";
import { ReferralsPageGate } from "@/components/coach/referrals/referrals-page-gate";
import { requireRole } from "@/lib/auth/org-context";
import { db } from "@/lib/db";
import { coachProfiles } from "@/lib/db/schema";
import {
  getOrCreateProgram,
  getReferralDashboard,
  listReferralCodes,
  listReferralConversions,
} from "@/lib/referrals/service";

export default async function CoachReferralsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach");

  const [program, dashboard, codesResult, conversionsResult, profile] =
    await Promise.all([
      getOrCreateProgram(org.organizationId, org.clerkUserId),
      getReferralDashboard(org.organizationId),
      listReferralCodes(org.organizationId, { page: 1, limit: 100 }),
      listReferralConversions(org.organizationId, { page: 1, limit: 100 }),
      db.query.coachProfiles.findFirst({
        where: eq(coachProfiles.organizationId, org.organizationId),
        columns: { slug: true, isPublished: true },
      }),
    ]);

  const coachSlug =
    profile?.isPublished && profile.slug ? profile.slug : null;

  return (
    <ReferralsPageGate
      initialProgram={program}
      initialDashboard={dashboard}
      initialCodes={codesResult.items}
      initialConversions={conversionsResult.items}
      coachSlug={coachSlug}
    />
  );
}
