import { describe, expect, it } from "vitest";
import {
  computeIngredientMacros,
  computeRecipeMacros,
  scaleRecipeIngredients,
  sumMacros,
} from "@/lib/recipes/macros";

const chickenPer100g = {
  calories: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
};

const ricePer100g = {
  calories: 130,
  proteinG: 2.7,
  carbsG: 28,
  fatG: 0.3,
};

const oliveOilPer100g = {
  calories: 884,
  proteinG: 0,
  carbsG: 0,
  fatG: 100,
};

const broccoliPer100g = {
  calories: 34,
  proteinG: 2.8,
  carbsG: 7,
  fatG: 0.4,
};

const garlicPer100g = {
  calories: 149,
  proteinG: 6.4,
  carbsG: 33,
  fatG: 0.5,
};

describe("recipe macros", () => {
  it("computes ingredient macros in grams", () => {
    const macros = computeIngredientMacros(
      { per100g: chickenPer100g, servingSize: 100, servingUnit: "g" },
      150,
      "g",
    );

    expect(macros.calories).toBe(247.5);
    expect(macros.proteinG).toBe(46.5);
  });

  it("computes recipe macros from five ingredients", () => {
    const ingredients = [
      {
        foodId: "1",
        quantity: 150,
        unit: "g",
        food: { per100g: chickenPer100g, servingSize: 100, servingUnit: "g" },
      },
      {
        foodId: "2",
        quantity: 100,
        unit: "g",
        food: { per100g: ricePer100g, servingSize: 100, servingUnit: "g" },
      },
      {
        foodId: "3",
        quantity: 10,
        unit: "g",
        food: { per100g: oliveOilPer100g, servingSize: 100, servingUnit: "g" },
      },
      {
        foodId: "4",
        quantity: 80,
        unit: "g",
        food: { per100g: broccoliPer100g, servingSize: 100, servingUnit: "g" },
      },
      {
        foodId: "5",
        quantity: 5,
        unit: "g",
        food: { per100g: garlicPer100g, servingSize: 100, servingUnit: "g" },
      },
    ];

    const { total, perServing } = computeRecipeMacros(ingredients, 2);

    const expectedTotal = sumMacros(
      ingredients.map((ingredient) =>
        computeIngredientMacros(
          ingredient.food,
          ingredient.quantity,
          ingredient.unit,
        ),
      ),
    );

    expect(total).toEqual(expectedTotal);
    expect(perServing.calories).toBe(round(total.calories / 2));
    expect(perServing.proteinG).toBe(round(total.proteinG / 2));
  });

  it("scales ingredients and macros by factor 1.5", () => {
    const ingredients = [
      {
        foodId: "1",
        quantity: 100,
        unit: "g",
        food: { per100g: chickenPer100g, servingSize: 100, servingUnit: "g" },
      },
      {
        foodId: "2",
        quantity: 50,
        unit: "g",
        food: { per100g: ricePer100g, servingSize: 100, servingUnit: "g" },
      },
    ];

    const base = computeRecipeMacros(ingredients, 2);
    const scaledIngredients = scaleRecipeIngredients(ingredients, 1.5);
    const scaled = computeRecipeMacros(scaledIngredients, 2);

    expect(scaledIngredients[0]?.quantity).toBe(150);
    expect(scaledIngredients[1]?.quantity).toBe(75);
    expect(scaled.total.calories).toBe(round(base.total.calories * 1.5));
    expect(scaled.perServing.calories).toBe(round(base.perServing.calories * 1.5));
  });
});

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
