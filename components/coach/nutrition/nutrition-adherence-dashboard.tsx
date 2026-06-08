"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { fetchPlanAdherence } from "@/lib/nutrition/api-client";
import type { PlanAdherenceReport } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

type NutritionAdherenceDashboardProps = {
  planId: string;
  planName: string;
};

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function getRange(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function NutritionAdherenceDashboard({
  planId,
  planName,
}: NutritionAdherenceDashboardProps) {
  const [periodDays, setPeriodDays] = useState(7);
  const [report, setReport] = useState<PlanAdherenceReport | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getRange(periodDays), [periodDays]);

  useEffect(() => {
    setLoading(true);
    fetchPlanAdherence(planId, range)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [planId, range]);

  const chartData = useMemo(() => {
    if (!report) {
      return [];
    }

    const byDate = new Map<string, number[]>();
    for (const day of report.days) {
      const current = byDate.get(day.date) ?? [];
      current.push(day.adherencePercent);
      byDate.set(day.date, current);
    }

    return [...byDate.entries()].map(([date, values]) => ({
      date,
      label: formatDateLabel(date),
      adherence:
        values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
  }, [report]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Adhésion — {planName}
        </h1>
        <p className="text-body-md text-muted mt-1">
          Suivi hebdomadaire des écarts macros (tolérance ±5 %).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[7, 14, 30].map((days) => (
          <Button
            key={days}
            variant="outline"
            className={cn(
              "border-hairline",
              periodDays === days && "bg-primary text-on-primary border-primary",
            )}
            onClick={() => setPeriodDays(days)}
          >
            {days} jours
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Chargement…</p>
      ) : !report ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-muted">Impossible de charger les données.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border-hairline bg-surface-card rounded-lg border p-6">
              <p className="text-caption-uppercase text-muted">Moyenne</p>
              <p className="text-primary text-stat-display mt-2 font-bold">
                {report.averageAdherencePercent}%
              </p>
            </div>
            <div className="border-hairline bg-surface-card rounded-lg border p-6">
              <p className="text-caption-uppercase text-muted">Zone verte</p>
              <p className="text-on-dark text-title-lg mt-2 font-bold">
                {report.greenZoneDays} / {report.totalDays}
              </p>
            </div>
            <div className="border-hairline bg-surface-card rounded-lg border p-6">
              <p className="text-caption-uppercase text-muted">Période</p>
              <p className="text-on-dark text-title-lg mt-2 font-bold">
                {formatDateLabel(report.start)} → {formatDateLabel(report.end)}
              </p>
            </div>
          </div>

          <div className="border-hairline bg-surface-card rounded-lg border p-6">
            <h2 className="text-title-md text-on-dark mb-4 font-semibold">
              Adhésion par jour
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="adherence" fill="#faff69" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-hairline bg-surface-card overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-hairline border-b">
                <tr>
                  <th className="text-muted px-4 py-3 font-medium">Date</th>
                  <th className="text-muted px-4 py-3 font-medium">Client</th>
                  <th className="text-muted px-4 py-3 font-medium">Adhésion</th>
                  <th className="text-muted px-4 py-3 font-medium">kcal</th>
                  <th className="text-muted px-4 py-3 font-medium">P / G / L</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((day) => (
                  <tr
                    key={`${day.date}-${day.clientId}`}
                    className="border-hairline border-b last:border-0"
                  >
                    <td className="text-on-dark px-4 py-3">
                      {formatDateLabel(day.date)}
                    </td>
                    <td className="text-on-dark px-4 py-3">
                      {day.clientName ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 font-semibold",
                        day.inGreenZone
                          ? "text-accent-emerald"
                          : "text-accent-rose",
                      )}
                    >
                      {day.adherencePercent}%
                    </td>
                    <td className="text-on-dark px-4 py-3">
                      {Math.round(day.consumed.calories)} /{" "}
                      {Math.round(day.targets.calories)}
                    </td>
                    <td className="text-on-dark px-4 py-3">
                      {day.consumed.proteinG}/{day.targets.proteinG} ·{" "}
                      {day.consumed.carbsG}/{day.targets.carbsG} ·{" "}
                      {day.consumed.fatG}/{day.targets.fatG}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
