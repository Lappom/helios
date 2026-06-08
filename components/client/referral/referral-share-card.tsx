"use client";

import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ClientReferralInfo } from "@/lib/referrals/types";
import { formatPriceCents } from "@/lib/validators/coach-profile";

type ReferralShareCardProps = {
  referral: ClientReferralInfo;
};

export function ReferralShareCard({ referral }: ReferralShareCardProps) {
  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <div className="border-hairline bg-surface-card overflow-hidden rounded-lg border">
      <div className="bg-surface-yellow-band text-on-yellow px-6 py-4">
        <div className="flex items-center gap-2">
          <Gift className="size-5" />
          <p className="text-title-md font-bold">Parrainez un ami</p>
        </div>
        <p className="text-body-sm mt-1 opacity-80">
          Partagez votre code et gagnez du crédit sur votre prochain achat.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Votre code
          </p>
          <button
            type="button"
            onClick={() => void copyText(referral.code, "Code")}
            className="text-primary mt-1 font-mono text-2xl font-bold tracking-wide hover:underline"
          >
            {referral.code}
          </button>
        </div>

        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Crédit disponible
          </p>
          <p className="text-stat-display text-primary mt-1 font-bold tracking-tight">
            {formatPriceCents(referral.balanceCents)}
          </p>
        </div>

        {referral.shareUrl ? (
          <Button
            type="button"
            variant="outline"
            className="border-hairline w-full"
            onClick={() => void copyText(referral.shareUrl!, "Lien")}
          >
            <Copy className="mr-2 size-4" />
            Copier le lien de parrainage
          </Button>
        ) : null}
      </div>
    </div>
  );
}
