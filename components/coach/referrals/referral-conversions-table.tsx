"use client";

import type { ReferralConversionListItem } from "@/lib/referrals/types";
import { formatPriceCents } from "@/lib/validators/coach-profile";
import { cn } from "@/lib/utils";

type ReferralConversionsTableProps = {
  conversions: ReferralConversionListItem[];
};

const STATUS_LABELS: Record<
  ReferralConversionListItem["status"],
  string
> = {
  pending: "En attente",
  converted: "Converti",
  cancelled: "Annulé",
};

export function ReferralConversionsTable({
  conversions,
}: ReferralConversionsTableProps) {
  if (conversions.length === 0) {
    return (
      <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
        <p className="text-body-md text-muted">Aucune conversion enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="border-hairline bg-surface-card overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-hairline bg-surface-elevated border-b">
          <tr>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Parrain
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Filleul
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Réduction
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Commission
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {conversions.map((conversion) => (
            <tr
              key={conversion.id}
              className="border-hairline border-b last:border-0"
            >
              <td className="text-body-sm text-on-dark px-4 py-3">
                {conversion.referrerName}
              </td>
              <td className="text-body-sm text-on-dark px-4 py-3">
                {conversion.referredName}
              </td>
              <td className="text-body-sm text-muted px-4 py-3">
                {formatPriceCents(conversion.refereeDiscountCents)}
              </td>
              <td className="text-body-sm text-primary px-4 py-3 font-semibold">
                {formatPriceCents(conversion.commissionCents)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "text-caption rounded-md px-2 py-1 font-medium",
                    conversion.status === "converted" &&
                      "bg-accent-emerald/15 text-accent-emerald",
                    conversion.status === "pending" &&
                      "bg-surface-elevated text-muted",
                    conversion.status === "cancelled" &&
                      "bg-accent-rose/15 text-accent-rose",
                  )}
                >
                  {STATUS_LABELS[conversion.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
