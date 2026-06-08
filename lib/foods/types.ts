export function buildFoodSearchVector(
  name: string,
  brand?: string | null,
  barcode?: string | null,
): string {
  return [name, brand, barcode]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();
}

export type MacrosPer100g = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
};

export type MacrosForPortion = MacrosPer100g & {
  servingSize: number;
  servingUnit: string;
};

export type FoodSource = "off" | "usda" | "custom";

export type FoodListItem = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  servingSize: number;
  servingUnit: string;
  per100g: MacrosPer100g;
  isPartialData: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FoodDetail = FoodListItem & {
  externalId: string | null;
  createdByClerkUserId: string | null;
  offSyncedAt: Date | null;
};

export type OffFoodInput = {
  externalId: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  servingSize: number;
  servingUnit: string;
  per100g: MacrosPer100g;
};
