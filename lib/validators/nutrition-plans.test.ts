import { describe, expect, it } from "vitest";
import {
  createMealItemSchema,
  createNutritionPlanSchema,
  logMealSchema,
} from "@/lib/validators/nutrition-plans";

describe("nutrition plan validators", () => {
  it("validates create nutrition plan payload", () => {
    const result = createNutritionPlanSchema.parse({
      name: "Plan prise de masse",
      targetCalories: 2800,
      targetProteinG: 180,
      targetCarbsG: 320,
      targetFatG: 80,
    });

    expect(result.name).toBe("Plan prise de masse");
    expect(result.targetCalories).toBe(2800);
  });

  it("requires foodId for food meal items", () => {
    const result = createMealItemSchema.safeParse({
      itemType: "food",
      quantity: 100,
      unit: "g",
    });

    expect(result.success).toBe(false);
  });

  it("requires recipeId for recipe meal items", () => {
    const result = createMealItemSchema.safeParse({
      itemType: "recipe",
      quantity: 1,
      unit: "portion",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid food meal item", () => {
    const result = createMealItemSchema.parse({
      itemType: "food",
      foodId: "food_123",
      quantity: 150,
      unit: "g",
    });

    expect(result.foodId).toBe("food_123");
  });

  it("rejects mixed food and recipe ids", () => {
    const result = createMealItemSchema.safeParse({
      itemType: "food",
      foodId: "food_123",
      recipeId: "recipe_456",
      quantity: 100,
      unit: "g",
    });

    expect(result.success).toBe(false);
  });

  it("validates log meal payload", () => {
    const result = logMealSchema.parse({
      loggedDate: "2026-06-08",
      mealId: "meal_1",
      items: [
        {
          itemType: "food",
          foodId: "food_123",
          quantity: 200,
          unit: "g",
        },
      ],
    });

    expect(result.loggedDate).toBe("2026-06-08");
    expect(result.items).toHaveLength(1);
  });
});
