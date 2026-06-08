"use client";

import type { MacroTotals } from "@/lib/nutrition/types";
import { isWithinMacroTolerance } from "@/lib/nutrition/macros";
import { cn } from "@/lib/utils";

type MacroRingProps = {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  highlight?: boolean;
  size?: number;
};

function Ring({
  label,
  consumed,
  target,
  unit,
  highlight = false,
  size = 120,
}: MacroRingProps) {
  const progress = target > 0 ? Math.min(consumed / target, 1.2) : 0;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));
  const inZone = isWithinMacroTolerance(consumed, target);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={highlight ? "#faff69" : inZone ? "#22c55e" : "#ef4444"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center">
        <p
          className={cn(
            "text-caption-uppercase",
            highlight ? "text-primary" : "text-muted",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "font-bold tracking-tight",
            highlight ? "text-primary text-stat-display" : "text-on-dark text-title-lg",
          )}
        >
          {Math.round(consumed * 10) / 10}
          <span className="text-muted text-body-sm ml-1 font-medium">
            / {Math.round(target)} {unit}
          </span>
        </p>
      </div>
    </div>
  );
}

type MacroRingsPanelProps = {
  consumed: MacroTotals;
  targets: MacroTotals;
  remaining: MacroTotals;
  inGreenZone: boolean;
};

export function MacroRingsPanel({
  consumed,
  targets,
  remaining,
  inGreenZone,
}: MacroRingsPanelProps) {
  return (
    <div className="border-hairline bg-surface-card rounded-lg border p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold">
            Macros du jour
          </h2>
          <p className="text-muted text-sm">
            Restant : {Math.round(remaining.calories)} kcal
          </p>
        </div>
        {inGreenZone ? (
          <span className="text-accent-emerald text-caption-uppercase font-semibold">
            Zone verte
          </span>
        ) : (
          <span className="text-muted text-caption-uppercase">
            Hors tolérance ±5 %
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Ring
          label="Calories"
          consumed={consumed.calories}
          target={targets.calories}
          unit="kcal"
          highlight
          size={140}
        />
        <Ring
          label="Protéines"
          consumed={consumed.proteinG}
          target={targets.proteinG}
          unit="g"
        />
        <Ring
          label="Glucides"
          consumed={consumed.carbsG}
          target={targets.carbsG}
          unit="g"
        />
        <Ring
          label="Lipides"
          consumed={consumed.fatG}
          target={targets.fatG}
          unit="g"
        />
      </div>
    </div>
  );
}
