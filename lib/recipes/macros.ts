import type { MacrosPer100g } from "@/lib/foods/types";
import { scaleMacrosToPortion } from "@/lib/foods/macros";

export type IngredientFoodRef = {
  per100g: MacrosPer100g;
  servingSize: number;
  servingUnit: string;
};

export type RecipeIngredientInput = {
  foodId: string;
  quantity: number;
  unit: string;
  sortOrder?: number;
  food?: IngredientFoodRef;
};

export type RecipeMacros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
};

export type ComputedRecipeMacros = {
  total: RecipeMacros;
  perServing: RecipeMacros;
};

export class UnsupportedIngredientUnitError extends Error {
  constructor(
    public readonly unit: string,
    public readonly foodServingUnit: string,
  ) {
    super(
      `Unit "${unit}" is not supported. Use "g" or "${foodServingUnit}".`,
    );
    this.name = "UnsupportedIngredientUnitError";
  }
}

export function computeIngredientMacros(
  food: IngredientFoodRef,
  quantity: number,
  unit: string,
): RecipeMacros {
  const normalizedUnit = unit.trim().toLowerCase();

  if (normalizedUnit === "g") {
    return toRecipeMacros(scaleMacrosToPortion(food.per100g, quantity, "g"));
  }

  if (normalizedUnit === food.servingUnit.trim().toLowerCase()) {
    return toRecipeMacros(
      scaleMacrosToPortion(food.per100g, quantity, food.servingUnit),
    );
  }

  throw new UnsupportedIngredientUnitError(unit, food.servingUnit);
}

export function sumMacros(items: RecipeMacros[]): RecipeMacros {
  const result: RecipeMacros = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
  };

  for (const item of items) {
    result.calories += item.calories;
    result.proteinG += item.proteinG;
    result.carbsG += item.carbsG;
    result.fatG += item.fatG;
    if (item.fiberG != null) {
      result.fiberG = (result.fiberG ?? 0) + item.fiberG;
    }
    if (item.sugarG != null) {
      result.sugarG = (result.sugarG ?? 0) + item.sugarG;
    }
  }

  return {
    calories: roundMacro(result.calories),
    proteinG: roundMacro(result.proteinG),
    carbsG: roundMacro(result.carbsG),
    fatG: roundMacro(result.fatG),
    fiberG: result.fiberG ? roundMacro(result.fiberG) : null,
    sugarG: result.sugarG ? roundMacro(result.sugarG) : null,
  };
}

export function divideMacrosByServings(
  total: RecipeMacros,
  servings: number,
): RecipeMacros {
  const safeServings = Math.max(1, servings);

  return {
    calories: roundMacro(total.calories / safeServings),
    proteinG: roundMacro(total.proteinG / safeServings),
    carbsG: roundMacro(total.carbsG / safeServings),
    fatG: roundMacro(total.fatG / safeServings),
    fiberG:
      total.fiberG != null
        ? roundMacro(total.fiberG / safeServings)
        : null,
    sugarG:
      total.sugarG != null
        ? roundMacro(total.sugarG / safeServings)
        : null,
  };
}

export function computeRecipeMacros(
  ingredients: Array<RecipeIngredientInput & { food: IngredientFoodRef }>,
  servings: number,
): ComputedRecipeMacros {
  const ingredientMacros = ingredients.map((ingredient) =>
    computeIngredientMacros(
      ingredient.food,
      ingredient.quantity,
      ingredient.unit,
    ),
  );

  const total = sumMacros(ingredientMacros);
  const perServing = divideMacrosByServings(total, servings);

  return { total, perServing };
}

export function scaleRecipeIngredients<
  T extends RecipeIngredientInput,
>(ingredients: T[], scaleFactor: number): T[] {
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: roundMacro(ingredient.quantity * scaleFactor),
  }));
}

function toRecipeMacros(macros: MacrosPer100g): RecipeMacros {
  return {
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    sugarG: macros.sugarG,
  };
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}
