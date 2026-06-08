"use client";

import { useState } from "react";
import { ReferralCodesPanel } from "./referral-codes-panel";
import { ReferralConversionsTable } from "./referral-conversions-table";
import { ReferralDashboardPanel } from "./referral-dashboard-panel";
import { ReferralProgramPanel } from "./referral-program-panel";
import type {
  ReferralCodeListItem,
  ReferralConversionListItem,
  ReferralDashboard,
  ReferralProgramDto,
} from "@/lib/referrals/types";
import { cn } from "@/lib/utils";

type ReferralsPageClientProps = {
  initialProgram: ReferralProgramDto;
  initialDashboard: ReferralDashboard;
  initialCodes: ReferralCodeListItem[];
  initialConversions: ReferralConversionListItem[];
  coachSlug: string | null;
};

type Tab = "dashboard" | "program" | "conversions" | "codes";

export function ReferralsPageClient({
  initialProgram,
  initialDashboard,
  initialCodes,
  initialConversions,
  coachSlug,
}: ReferralsPageClientProps) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [program, setProgram] = useState(initialProgram);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Parrainage
        </h1>
        <p className="text-body-md text-muted mt-2">
          Réduction filleul, crédit parrain et suivi des conversions.
        </p>
      </div>

      <div className="border-hairline flex flex-wrap gap-1 rounded-lg border p-1">
        {(
          [
            ["dashboard", "Dashboard"],
            ["program", "Programme"],
            ["conversions", "Conversions"],
            ["codes", "Codes parrains"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              tab === value
                ? "bg-primary text-on-primary"
                : "text-muted hover:text-on-dark",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <ReferralDashboardPanel dashboard={initialDashboard} />
      ) : null}

      {tab === "program" ? (
        <ReferralProgramPanel
          initialProgram={program}
          onUpdated={setProgram}
        />
      ) : null}

      {tab === "conversions" ? (
        <ReferralConversionsTable conversions={initialConversions} />
      ) : null}

      {tab === "codes" ? (
        <ReferralCodesPanel codes={initialCodes} coachSlug={coachSlug} />
      ) : null}
    </div>
  );
}
