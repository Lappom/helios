import { describe, expect, it } from "vitest";
import { buildFoodSearchVector } from "@/lib/foods/types";
import {
  createFoodSchema,
  parseSearchFoodsQuery,
  updateFoodSchema,
} from "@/lib/validators/foods";

describe("food validators", () => {
  it("validates create food payload", () => {
    const result = createFoodSchema.parse({
      name: "Poulet grillé",
      brand: "Maison",
      servingSize: 120,
      servingUnit: "g",
      per100g: {
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
      },
    });

    expect(result.name).toBe("Poulet grillé");
    expect(result.servingSize).toBe(120);
  });

  it("rejects incoherent calories on create", () => {
    const result = createFoodSchema.safeParse({
      name: "Test",
      per100g: {
        calories: 10,
        proteinG: 30,
        carbsG: 10,
        fatG: 10,
      },
    });

    expect(result.success).toBe(false);
  });

  it("parses search query", () => {
    const params = new URLSearchParams({
      q: "poulet",
      source: "custom",
      page: "2",
      limit: "24",
    });

    const query = parseSearchFoodsQuery(params, {
      page: 2,
      limit: 24,
      offset: 24,
    });

    expect(query.q).toBe("poulet");
    expect(query.source).toBe("custom");
  });

  it("validates partial update", () => {
    const result = updateFoodSchema.parse({
      name: "Nouveau nom",
    });

    expect(result.name).toBe("Nouveau nom");
  });
});

describe("food search vector", () => {
  it("normalizes searchable text", () => {
    expect(buildFoodSearchVector("Yaourt", "Danone", "3017620422003")).toBe(
      "yaourt danone 3017620422003",
    );
  });
});
