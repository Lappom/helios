"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightDataPoint } from "@/lib/assessments/types";

type AssessmentWeightChartProps = {
  data: WeightDataPoint[];
};

export function AssessmentWeightChart({ data }: AssessmentWeightChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted text-sm">Pas assez de données pour le graphique.</p>
    );
  }

  const chartData = data.map((point) => ({
    label: new Date(point.date).toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
    }),
    weight: point.weight,
  }));

  return (
    <div className="border-hairline bg-surface-card h-64 rounded-lg border p-4">
      <p className="text-caption-uppercase text-primary mb-3 tracking-widest uppercase">
        Poids · 6 mois
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <XAxis dataKey="label" stroke="#888888" fontSize={12} />
          <YAxis stroke="#888888" fontSize={12} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#fff" }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#faff69"
            strokeWidth={2}
            dot={{ fill: "#faff69", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
