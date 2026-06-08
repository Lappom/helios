import { scaleMacrosToPortion } from "@/lib/foods/macros";
import type { MacrosPer100g } from "@/lib/foods/types";
import {
  computeIngredientMacros,
  computeRecipeMacros,
  type IngredientFoodRef,
  type RecipeIngredientInput,
} from "@/lib/recipes/macros";
import type { MacroTotals } from "./types";

export const MACRO_TOLERANCE = 0.05;

export const EMPTY_MACROS: MacroTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

export function sumMacros(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      calories: roundMacro(acc.calories + item.calories),
      proteinG: roundMacro(acc.proteinG + item.proteinG),
      carbsG: roundMacro(acc.carbsG + item.carbsG),
      fatG: roundMacro(acc.fatG + item.fatG),
    }),
    { ...EMPTY_MACROS },
  );
}

export function subtractMacros(
  targets: MacroTotals,
  consumed: MacroTotals,
): MacroTotals {
  return {
    calories: roundMacro(Math.max(0, targets.calories - consumed.calories)),
    proteinG: roundMacro(Math.max(0, targets.proteinG - consumed.proteinG)),
    carbsG: roundMacro(Math.max(0, targets.carbsG - consumed.carbsG)),
    fatG: roundMacro(Math.max(0, targets.fatG - consumed.fatG)),
  };
}

export function isWithinMacroTolerance(
  actual: number,
  target: number,
  tolerance = MACRO_TOLERANCE,
): boolean {
  if (target <= 0) {
    return actual <= 0;
  }

  const delta = Math.abs(actual - target) / target;
  return delta <= tolerance;
}

export function isWithinAllMacroTolerance(
  actual: MacroTotals,
  target: MacroTotals,
  tolerance = MACRO_TOLERANCE,
): boolean {
  return (
    isWithinMacroTolerance(actual.calories, target.calories, tolerance) &&
    isWithinMacroTolerance(actual.proteinG, target.proteinG, tolerance) &&
    isWithinMacroTolerance(actual.carbsG, target.carbsG, tolerance) &&
    isWithinMacroTolerance(actual.fatG, target.fatG, tolerance)
  );
}

export function computeMacroDeltaPercent(
  actual: number,
  target: number,
): number {
  if (target <= 0) {
    return actual > 0 ? 100 : 0;
  }

  return roundMacro(((actual - target) / target) * 100);
}

export function computeMacroDeltas(
  actual: MacroTotals,
  target: MacroTotals,
): MacroTotals {
  return {
    calories: computeMacroDeltaPercent(actual.calories, target.calories),
    proteinG: computeMacroDeltaPercent(actual.proteinG, target.proteinG),
    carbsG: computeMacroDeltaPercent(actual.carbsG, target.carbsG),
    fatG: computeMacroDeltaPercent(actual.fatG, target.fatG),
  };
}

export function computeAdherencePercent(
  actual: MacroTotals,
  target: MacroTotals,
  tolerance = MACRO_TOLERANCE,
): number {
  const checks = [
    isWithinMacroTolerance(actual.calories, target.calories, tolerance),
    isWithinMacroTolerance(actual.proteinG, target.proteinG, tolerance),
    isWithinMacroTolerance(actual.carbsG, target.carbsG, tolerance),
    isWithinMacroTolerance(actual.fatG, target.fatG, tolerance),
  ];

  const passed = checks.filter(Boolean).length;
  return roundMacro((passed / checks.length) * 100);
}

export function computeFoodItemMacros(
  per100g: MacrosPer100g,
  servingSize: number,
  servingUnit: string,
  quantity: number,
  unit: string,
): MacroTotals {
  const portion = computeIngredientMacros(
    {
      per100g,
      servingSize,
      servingUnit,
    },
    quantity,
    unit,
  );

  return {
    calories: portion.calories,
    proteinG: portion.proteinG,
    carbsG: portion.carbsG,
    fatG: portion.fatG,
  };
}

export function computeRecipeItemMacros(
  ingredients: RecipeIngredientInput[],
  servings: number,
  quantity: number,
  unit: string,
): MacroTotals {
  const resolvedIngredients = ingredients.filter(
    (ingredient): ingredient is RecipeIngredientInput & {
      food: IngredientFoodRef;
    } => ingredient.food != null,
  );
  const computed = computeRecipeMacros(resolvedIngredients, servings);
  const perServing = computed.perServing;

  if (unit.trim().toLowerCase() === "portion" || unit.trim().toLowerCase() === "serving") {
    return {
      calories: roundMacro(perServing.calories * quantity),
      proteinG: roundMacro(perServing.proteinG * quantity),
      carbsG: roundMacro(perServing.carbsG * quantity),
      fatG: roundMacro(perServing.fatG * quantity),
    };
  }

  const total = computed.total;
  const factor = quantity / servings;

  return {
    calories: roundMacro(total.calories * factor),
    proteinG: roundMacro(total.proteinG * factor),
    carbsG: roundMacro(total.carbsG * factor),
    fatG: roundMacro(total.fatG * factor),
  };
}

export function toMacroTotalsFromPortion(
  per100g: MacrosPer100g,
  quantity: number,
  unit: string,
): MacroTotals {
  const portion = scaleMacrosToPortion(per100g, quantity, unit);
  return {
    calories: portion.calories,
    proteinG: portion.proteinG,
    carbsG: portion.carbsG,
    fatG: portion.fatG,
  };
}

export type { IngredientFoodRef };
