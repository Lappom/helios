"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReferralDashboard } from "@/lib/referrals/types";
import { formatPriceCents } from "@/lib/validators/coach-profile";

type ReferralDashboardPanelProps = {
  dashboard: ReferralDashboard;
};

function formatMonthLabel(month: string) {
  const parsed = new Date(`${month}-01T00:00:00`);
  return parsed.toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function ReferralDashboardPanel({
  dashboard,
}: ReferralDashboardPanelProps) {
  const chartData = useMemo(
    () =>
      dashboard.monthlyConversions.map((point) => ({
        ...point,
        label: formatMonthLabel(point.month),
      })),
    [dashboard.monthlyConversions],
  );

  const kpis = [
    {
      label: "Conversions",
      value: String(dashboard.totalConversions),
      highlight: true,
    },
    {
      label: "Commissions",
      value: formatPriceCents(dashboard.totalCommissionsCents),
      highlight: true,
    },
    {
      label: "Taux",
      value: `${dashboard.conversionRate} %`,
      highlight: true,
    },
    {
      label: "En attente",
      value: String(dashboard.pendingConversions),
      highlight: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-yellow-band grid gap-6 rounded-lg p-6 sm:grid-cols-3">
        {kpis.slice(0, 3).map((kpi) => (
          <div key={kpi.label}>
            <p className="text-caption-uppercase text-on-yellow/70 tracking-widest uppercase">
              {kpi.label}
            </p>
            <p className="text-stat-display text-on-yellow mt-1 font-bold tracking-tight">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border-hairline bg-surface-card rounded-lg border p-6"
          >
            <p className="text-caption-uppercase text-muted">{kpi.label}</p>
            <p
              className={
                kpi.highlight
                  ? "text-primary text-stat-display mt-2 font-bold tracking-tight"
                  : "text-on-dark text-title-lg mt-2 font-bold"
              }
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-hairline bg-surface-card rounded-lg border p-6">
        <h2 className="text-title-md text-on-dark mb-4 font-semibold">
          Conversions — 12 derniers mois
        </h2>
        <div className="h-56">
          {chartData.length === 0 ? (
            <p className="text-body-sm text-muted">Aucune conversion pour l&apos;instant.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="label" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="#faff69" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {dashboard.topReferrers.length > 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <h2 className="text-title-md text-on-dark mb-4 font-semibold">
            Top parrains
          </h2>
          <ul className="space-y-3">
            {dashboard.topReferrers.map((referrer) => (
              <li
                key={referrer.clientId}
                className="border-hairline flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-body-md text-on-dark font-medium">
                  {referrer.clientName}
                </span>
                <span className="text-body-sm text-muted">
                  {referrer.conversionCount} conversion
                  {referrer.conversionCount > 1 ? "s" : ""} ·{" "}
                  {formatPriceCents(referrer.commissionsCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
