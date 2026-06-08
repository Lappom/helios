import { z } from "zod";
import { isCalorieCoherent } from "@/lib/foods/macros";
import type { PaginationParams } from "@/lib/api/pagination";

export const FOOD_SOURCES = ["off", "usda", "custom"] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

export const foodSourceSchema = z.enum(FOOD_SOURCES);

const macroNumber = z.coerce.number().min(0).max(10000);
const optionalMacroNumber = z.coerce.number().min(0).max(10000).optional().nullable();

export const macrosPer100gSchema = z
  .object({
    calories: macroNumber,
    proteinG: macroNumber,
    carbsG: macroNumber,
    fatG: macroNumber,
    fiberG: optionalMacroNumber,
    sugarG: optionalMacroNumber,
  })
  .superRefine((value, ctx) => {
    if (!isCalorieCoherent(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Calories must be within 10% of 4×protein + 4×carbs + 9×fat.",
        path: ["calories"],
      });
    }
  });

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).optional().nullable(),
  barcode: z.string().trim().max(32).optional().nullable(),
  servingSize: z.coerce.number().positive().max(10000).default(100),
  servingUnit: z.string().trim().min(1).max(20).default("g"),
  per100g: macrosPer100gSchema,
});

export const updateFoodSchema = createFoodSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;

export type SearchFoodsQuery = PaginationParams & {
  q?: string;
  source?: FoodSource;
};

export function parseSearchFoodsQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): SearchFoodsQuery {
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const sourceRaw = searchParams.get("source");

  let source: FoodSource | undefined;
  if (sourceRaw) {
    const parsed = foodSourceSchema.safeParse(sourceRaw);
    if (parsed.success) {
      source = parsed.data;
    }
  }

  return {
    ...pagination,
    q: q || undefined,
    source,
  };
}
