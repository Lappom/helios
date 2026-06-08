import { describe, expect, it } from "vitest";
import {
  computeCaloriesFromMacros,
  isCalorieCoherent,
  scaleMacrosToPortion,
} from "@/lib/foods/macros";

describe("food macros", () => {
  it("computes calories from macros", () => {
    expect(
      computeCaloriesFromMacros({
        calories: 0,
        proteinG: 25,
        carbsG: 0,
        fatG: 3,
      }),
    ).toBe(127);
  });

  it("validates calorie coherence within tolerance", () => {
    expect(
      isCalorieCoherent({
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
      }),
    ).toBe(true);
  });

  it("rejects incoherent calories", () => {
    expect(
      isCalorieCoherent({
        calories: 50,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
      }),
    ).toBe(false);
  });

  it("scales macros to portion", () => {
    const portion = scaleMacrosToPortion(
      {
        calories: 200,
        proteinG: 20,
        carbsG: 10,
        fatG: 8,
      },
      50,
      "g",
    );

    expect(portion.calories).toBe(100);
    expect(portion.proteinG).toBe(10);
    expect(portion.carbsG).toBe(5);
    expect(portion.fatG).toBe(4);
    expect(portion.servingSize).toBe(50);
    expect(portion.servingUnit).toBe("g");
  });
});
