import { ReferralShareCard } from "@/components/client/referral/referral-share-card";
import { hasFeature } from "@/lib/billing/access";
import { getClientReferralInfo } from "@/lib/referrals/service";

type ClientReferralSectionProps = {
  organizationId: string;
  clientId: string;
};

export async function ClientReferralSection({
  organizationId,
  clientId,
}: ClientReferralSectionProps) {
  const referralEnabled = await hasFeature("referral_program");
  if (!referralEnabled) {
    return null;
  }

  const referral = await getClientReferralInfo(organizationId, clientId);
  if (!referral) {
    return null;
  }

  return <ReferralShareCard referral={referral} />;
}
