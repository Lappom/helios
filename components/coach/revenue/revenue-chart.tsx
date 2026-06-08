"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueDashboard } from "@/lib/revenue/types";
import { formatPriceCents } from "@/lib/validators/coach-profile";

type RevenueChartProps = {
  dashboard: RevenueDashboard;
};

function formatMonthLabel(month: string) {
  const parsed = new Date(`${month}T00:00:00`);
  return parsed.toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function RevenueChart({ dashboard }: RevenueChartProps) {
  const chartData = useMemo(
    () =>
      dashboard.series.map((point) => ({
        ...point,
        label: formatMonthLabel(point.month),
        mrrEuros: point.mrrCents / 100,
        oneTimeEuros: point.oneTimeRevenueCents / 100,
      })),
    [dashboard.series],
  );

  return (
    <div className="border-hairline bg-surface-card rounded-lg border p-6">
      <h2 className="text-title-md text-on-dark mb-4 font-semibold">
        Revenus — 12 derniers mois
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="label" stroke="#888888" fontSize={12} />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickFormatter={(value: number) => `${value} €`}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#ffffff",
              }}
              formatter={(value, name) => {
                const numeric =
                  typeof value === "number" ? value : Number(value ?? 0);
                const label = name === "mrrEuros" ? "MRR" : "One-shot";
                return [formatPriceCents(Math.round(numeric * 100)), label];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "mrrEuros" ? "MRR" : "One-shot / externe"
              }
            />
            <Bar
              dataKey="mrrEuros"
              stackId="revenue"
              fill="#faff69"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="oneTimeEuros"
              stackId="revenue"
              fill="#888888"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
