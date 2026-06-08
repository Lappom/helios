"use client";

import { scaleMacrosToPortion } from "@/lib/foods/macros";
import type { FoodListItem } from "@/lib/foods/types";
import { cn } from "@/lib/utils";

type FoodMacroPanelProps = {
  food: FoodListItem;
  mode: "per100g" | "portion";
  servingSize: number;
};

function MacroCell({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-4 py-3",
        highlight ? "bg-surface-yellow-band" : "bg-surface-elevated",
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
        {value}
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

export function FoodMacroPanel({
  food,
  mode,
  servingSize,
}: FoodMacroPanelProps) {
  const macros =
    mode === "per100g"
      ? food.per100g
      : scaleMacrosToPortion(
          food.per100g,
          servingSize,
          food.servingUnit,
        );

  const contextLabel =
    mode === "per100g"
      ? "pour 100 g"
      : `pour ${servingSize} ${food.servingUnit}`;

  return (
    <div className="space-y-4">
      <p className="text-caption-uppercase text-muted">{contextLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <MacroCell
          label="Calories"
          value={macros.calories}
          unit="kcal"
          highlight
        />
        <MacroCell label="Protéines" value={macros.proteinG} unit="g" />
        <MacroCell label="Glucides" value={macros.carbsG} unit="g" />
        <MacroCell label="Lipides" value={macros.fatG} unit="g" />
        {macros.fiberG != null ? (
          <MacroCell label="Fibres" value={macros.fiberG} unit="g" />
        ) : null}
        {macros.sugarG != null ? (
          <MacroCell label="Sucres" value={macros.sugarG} unit="g" />
        ) : null}
      </div>
      {food.isPartialData ? (
        <p className="text-body-sm text-muted">
          Données nutritionnelles partielles — vérifiez avant utilisation.
        </p>
      ) : null}
    </div>
  );
}
