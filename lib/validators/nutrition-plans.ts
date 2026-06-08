import { z } from "zod";

export const NUTRITION_PLAN_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export type NutritionPlanStatus = (typeof NUTRITION_PLAN_STATUSES)[number];

export const MEAL_ITEM_TYPES = ["food", "recipe"] as const;
export type MealItemType = (typeof MEAL_ITEM_TYPES)[number];

const macroTargetSchema = z.number().positive().max(10000);

export const createNutritionPlanSchema = z.object({
  name: z.string().trim().min(1).max(200),
  targetCalories: macroTargetSchema.optional().default(2000),
  targetProteinG: macroTargetSchema.optional().default(150),
  targetCarbsG: macroTargetSchema.optional().default(200),
  targetFatG: macroTargetSchema.optional().default(65),
});

export const patchNutritionPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    targetCalories: macroTargetSchema.optional(),
    targetProteinG: macroTargetSchema.optional(),
    targetCarbsG: macroTargetSchema.optional(),
    targetFatG: macroTargetSchema.optional(),
    status: z.enum(["archived"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createMealSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  timeSlot: z.string().trim().max(20).nullable().optional(),
});

export const patchMealSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    timeSlot: z.string().trim().max(20).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderMealsSchema = z.object({
  mealIds: z.array(z.string().min(1)).min(1),
});

export const createMealItemSchema = z
  .object({
    itemType: z.enum(MEAL_ITEM_TYPES),
    foodId: z.string().min(1).optional(),
    recipeId: z.string().min(1).optional(),
    quantity: z.number().positive().max(100000),
    unit: z.string().trim().min(1).max(20).default("g"),
  })
  .superRefine((value, ctx) => {
    if (value.itemType === "food" && !value.foodId) {
      ctx.addIssue({
        code: "custom",
        message: "foodId is required when itemType is food.",
        path: ["foodId"],
      });
    }
    if (value.itemType === "recipe" && !value.recipeId) {
      ctx.addIssue({
        code: "custom",
        message: "recipeId is required when itemType is recipe.",
        path: ["recipeId"],
      });
    }
    if (value.itemType === "food" && value.recipeId) {
      ctx.addIssue({
        code: "custom",
        message: "recipeId must not be set when itemType is food.",
        path: ["recipeId"],
      });
    }
    if (value.itemType === "recipe" && value.foodId) {
      ctx.addIssue({
        code: "custom",
        message: "foodId must not be set when itemType is recipe.",
        path: ["foodId"],
      });
    }
  });

export const patchMealItemSchema = z
  .object({
    quantity: z.number().positive().max(100000).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderMealItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

export const assignNutritionPlanSchema = z.object({
  clientIds: z.array(z.string().min(1)).min(1),
  startDate: z.coerce.date(),
});

const logMealItemSchema = createMealItemSchema;

export const logMealSchema = z.object({
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealId: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(logMealItemSchema).min(1),
});

export const adherenceQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.string().min(1).optional(),
});

export type CreateNutritionPlanInput = z.infer<typeof createNutritionPlanSchema>;
export type PatchNutritionPlanInput = z.infer<typeof patchNutritionPlanSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type PatchMealInput = z.infer<typeof patchMealSchema>;
export type CreateMealItemInput = z.infer<typeof createMealItemSchema>;
export type PatchMealItemInput = z.infer<typeof patchMealItemSchema>;
export type AssignNutritionPlanInput = z.infer<typeof assignNutritionPlanSchema>;
export type LogMealInput = z.infer<typeof logMealSchema>;
export type AdherenceQueryInput = z.infer<typeof adherenceQuerySchema>;

export function parseListNutritionPlansQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  const statusRaw = searchParams.get("status");
  const status =
    statusRaw &&
    NUTRITION_PLAN_STATUSES.includes(statusRaw as NutritionPlanStatus)
      ? (statusRaw as NutritionPlanStatus)
      : undefined;

  return {
    status,
    search: searchParams.get("search")?.trim() || undefined,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}
