"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReferralCodeListItem } from "@/lib/referrals/types";

type ReferralCodesPanelProps = {
  codes: ReferralCodeListItem[];
  coachSlug: string | null;
};

function buildShareUrl(coachSlug: string, code: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://helios.lappom.fr";
  return `${base}/find/coaches/${coachSlug}?ref=${encodeURIComponent(code)}`;
}

export function ReferralCodesPanel({
  codes,
  coachSlug,
}: ReferralCodesPanelProps) {
  if (codes.length === 0) {
    return (
      <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
        <p className="text-body-md text-muted">
          Activez le programme pour générer des codes clients.
        </p>
      </div>
    );
  }

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
      <table className="w-full text-left text-sm">
        <thead className="border-hairline bg-surface-elevated border-b">
          <tr>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Client
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Code
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 font-semibold tracking-widest uppercase">
              Conversions
            </th>
            <th className="text-caption-uppercase text-muted px-4 py-3 text-right font-semibold tracking-widest uppercase">
              Lien
            </th>
          </tr>
        </thead>
        <tbody>
          {codes.map((item) => {
            const shareUrl =
              coachSlug && item.isActive
                ? buildShareUrl(coachSlug, item.code)
                : null;

            return (
              <tr
                key={item.id}
                className="border-hairline border-b last:border-0"
              >
                <td className="text-body-sm text-on-dark px-4 py-3">
                  {item.clientName}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-primary font-mono text-sm font-semibold hover:underline"
                    onClick={() => void copyText(item.code, "Code")}
                  >
                    {item.code}
                  </button>
                </td>
                <td className="text-body-sm text-muted px-4 py-3">
                  {item.conversionCount}
                </td>
                <td className="px-4 py-3 text-right">
                  {shareUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-hairline"
                      onClick={() => void copyText(shareUrl, "Lien")}
                    >
                      <Copy className="mr-1 size-3.5" />
                      Copier
                    </Button>
                  ) : (
                    <span className="text-body-sm text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
