"use client";

import type { MacroTotals, NutritionPlanTree } from "@/lib/nutrition/types";
import { isWithinAllMacroTolerance } from "@/lib/nutrition/macros";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NutritionMacroHeaderProps = {
  plan: NutritionPlanTree;
  disabled?: boolean;
  onTargetsChange: (targets: Partial<MacroTotals>) => void;
};

function MacroCell({
  label,
  value,
  unit,
  highlight = false,
  inZone = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  inZone?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-4 py-3",
        highlight ? "bg-surface-yellow-band" : "bg-surface-elevated",
        inZone && !highlight && "ring-accent-emerald ring-1",
      )}
    >
      <p
        className={cn(
          "text-caption-uppercase",
          highlight ? "text-on-yellow" : "text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-bold tracking-tight",
          highlight ? "text-on-yellow text-stat-display" : "text-on-dark text-title-lg",
        )}
      >
        {Math.round(value * 10) / 10}
        <span
          className={cn(
            "text-body-sm ml-1 font-medium",
            highlight ? "text-on-yellow/80" : "text-muted",
          )}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}

export function NutritionMacroHeader({
  plan,
  disabled,
  onTargetsChange,
}: NutritionMacroHeaderProps) {
  const targets = {
    calories: plan.targetCalories,
    proteinG: plan.targetProteinG,
    carbsG: plan.targetCarbsG,
    fatG: plan.targetFatG,
  };

  const planned = plan.plannedMacros;
  const inGreenZone = isWithinAllMacroTolerance(planned, targets);

  return (
    <div className="border-hairline bg-surface-card space-y-6 rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold">
            Objectifs macros
          </h2>
          <p className="text-muted text-sm">
            Totaux planifiés vs cibles — zone verte à ±5 %
          </p>
        </div>
        {inGreenZone ? (
          <span className="text-accent-emerald text-caption-uppercase font-semibold">
            Zone verte
          </span>
        ) : (
          <span className="text-muted text-caption-uppercase">
            Hors tolérance
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-caption-uppercase text-muted">Cibles journalières</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-caption-uppercase text-muted">Calories</span>
              <Input
                type="number"
                disabled={disabled}
                value={plan.targetCalories}
                onChange={(event) =>
                  onTargetsChange({
                    calories: Number(event.target.value),
                  })
                }
                className="border-hairline bg-surface-elevated"
              />
            </label>
            <label className="space-y-1">
              <span className="text-caption-uppercase text-muted">Protéines</span>
              <Input
                type="number"
                disabled={disabled}
                value={plan.targetProteinG}
                onChange={(event) =>
                  onTargetsChange({
                    proteinG: Number(event.target.value),
                  })
                }
                className="border-hairline bg-surface-elevated"
              />
            </label>
            <label className="space-y-1">
              <span className="text-caption-uppercase text-muted">Glucides</span>
              <Input
                type="number"
                disabled={disabled}
                value={plan.targetCarbsG}
                onChange={(event) =>
                  onTargetsChange({
                    carbsG: Number(event.target.value),
                  })
                }
                className="border-hairline bg-surface-elevated"
              />
            </label>
            <label className="space-y-1">
              <span className="text-caption-uppercase text-muted">Lipides</span>
              <Input
                type="number"
                disabled={disabled}
                value={plan.targetFatG}
                onChange={(event) =>
                  onTargetsChange({
                    fatG: Number(event.target.value),
                  })
                }
                className="border-hairline bg-surface-elevated"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-caption-uppercase text-muted">Planifié (temps réel)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MacroCell
              label="Calories"
              value={planned.calories}
              unit="kcal"
              highlight
              inZone={isWithinAllMacroTolerance(
                { ...planned },
                { ...targets },
              )}
            />
            <MacroCell
              label="Protéines"
              value={planned.proteinG}
              unit="g"
              inZone={isWithinAllMacroTolerance(planned, targets)}
            />
            <MacroCell
              label="Glucides"
              value={planned.carbsG}
              unit="g"
              inZone={isWithinAllMacroTolerance(planned, targets)}
            />
            <MacroCell
              label="Lipides"
              value={planned.fatG}
              unit="g"
              inZone={isWithinAllMacroTolerance(planned, targets)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
