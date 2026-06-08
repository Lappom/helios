import type { MacrosPer100g, MacrosForPortion } from "./types";

const CALORIE_TOLERANCE_RATIO = 0.1;

export function computeCaloriesFromMacros(macros: MacrosPer100g): number {
  return macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9;
}

export function isCalorieCoherent(macros: MacrosPer100g): boolean {
  const computed = computeCaloriesFromMacros(macros);
  if (computed <= 0) {
    return macros.calories <= 0;
  }

  const delta = Math.abs(macros.calories - computed);
  return delta / computed <= CALORIE_TOLERANCE_RATIO;
}

export function scaleMacrosToPortion(
  per100g: MacrosPer100g,
  servingSize: number,
  servingUnit: string,
): MacrosForPortion {
  const factor = servingSize / 100;

  return {
    servingSize,
    servingUnit,
    calories: roundMacro(per100g.calories * factor),
    proteinG: roundMacro(per100g.proteinG * factor),
    carbsG: roundMacro(per100g.carbsG * factor),
    fatG: roundMacro(per100g.fatG * factor),
    fiberG:
      per100g.fiberG != null ? roundMacro(per100g.fiberG * factor) : null,
    sugarG:
      per100g.sugarG != null ? roundMacro(per100g.sugarG * factor) : null,
  };
}

export function hasCompleteMacros(macros: MacrosPer100g): boolean {
  const values = [
    macros.calories,
    macros.proteinG,
    macros.carbsG,
    macros.fatG,
  ];

  const missingCount = values.filter(
    (value) => value == null || Number.isNaN(value),
  ).length;

  return missingCount < 2 && macros.calories > 0;
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}
