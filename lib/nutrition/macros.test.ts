import { describe, expect, it } from "vitest";
import {
  computeAdherencePercent,
  computeMacroDeltaPercent,
  isWithinAllMacroTolerance,
  isWithinMacroTolerance,
  sumMacros,
} from "@/lib/nutrition/macros";

describe("nutrition macros", () => {
  it("sums macro totals", () => {
    const result = sumMacros([
      { calories: 100, proteinG: 10, carbsG: 20, fatG: 5 },
      { calories: 200, proteinG: 15, carbsG: 25, fatG: 8 },
    ]);

    expect(result.calories).toBe(300);
    expect(result.proteinG).toBe(25);
  });

  it("detects within 5% tolerance", () => {
    expect(isWithinMacroTolerance(1950, 2000)).toBe(true);
    expect(isWithinMacroTolerance(2110, 2000)).toBe(false);
  });

  it("checks all macros in green zone", () => {
    expect(
      isWithinAllMacroTolerance(
        { calories: 1980, proteinG: 148, carbsG: 202, fatG: 64 },
        { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 },
      ),
    ).toBe(true);
  });

  it("computes macro delta percent", () => {
    expect(computeMacroDeltaPercent(2100, 2000)).toBe(5);
  });

  it("computes adherence percent from macro checks", () => {
    const percent = computeAdherencePercent(
      { calories: 1980, proteinG: 148, carbsG: 202, fatG: 64 },
      { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 },
    );

    expect(percent).toBe(100);
  });
});
