import { z } from "zod";
import type { PaginationParams } from "@/lib/api/pagination";

export const recipeIngredientSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive().max(100000),
  unit: z.string().trim().min(1).max(20).default("g"),
  sortOrder: z.number().int().min(0).optional(),
});

export const createRecipeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  servings: z.coerce.number().int().min(1).max(100).default(1),
  prepTimeMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional()
    .nullable(),
  cookTimeMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional()
    .nullable(),
  instructions: z.array(z.string().trim().min(1).max(2000)).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1),
});

export const updateRecipeSchema = createRecipeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const scaleRecipeSchema = z.object({
  scaleFactor: z.coerce.number().min(0.1).max(10),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
export type ScaleRecipeInput = z.infer<typeof scaleRecipeSchema>;

export type ListRecipesQuery = PaginationParams & {
  q?: string;
};

export function parseListRecipesQuery(
  searchParams: URLSearchParams,
  pagination: PaginationParams,
): ListRecipesQuery {
  const q = searchParams.get("q")?.trim();

  return {
    ...pagination,
    q: q || undefined,
  };
}
