"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/billing/feature-gate";
import { ReferralsPageClient } from "./referrals-page-client";
import type {
  ReferralCodeListItem,
  ReferralConversionListItem,
  ReferralDashboard,
  ReferralProgramDto,
} from "@/lib/referrals/types";

type ReferralsPageGateProps = {
  initialProgram: ReferralProgramDto;
  initialDashboard: ReferralDashboard;
  initialCodes: ReferralCodeListItem[];
  initialConversions: ReferralConversionListItem[];
  coachSlug: string | null;
};

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Parrainage &amp; affiliation — Business+
      </p>
      <p className="text-body-sm text-muted mx-auto max-w-md">
        Lancez un programme de parrainage : réduction filleul, commission parrain
        en crédit et suivi des conversions.
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function ReferralsPageGate(props: ReferralsPageGateProps) {
  return (
    <FeatureGate feature="referral_program" fallback={<UpgradeFallback />}>
      <ReferralsPageClient {...props} />
    </FeatureGate>
  );
}
