import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  foods,
  mealItems,
  meals,
  nutritionPlans,
  recipeIngredients,
  recipes,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type { MacrosPer100g } from "@/lib/foods/types";
import {
  computeFoodItemMacros,
  computeRecipeItemMacros,
  sumMacros,
} from "@/lib/nutrition/macros";
import type {
  MealDetail,
  MealItemDetail,
  NutritionPlanListItem,
  NutritionPlanTree,
} from "@/lib/nutrition/types";
import type {
  CreateMealInput,
  CreateMealItemInput,
  CreateNutritionPlanInput,
  PatchMealInput,
  PatchMealItemInput,
  PatchNutritionPlanInput,
} from "@/lib/validators/nutrition-plans";
import type { RecipeIngredientInput } from "@/lib/recipes/macros";

export type ListNutritionPlansOptions = {
  status?: "draft" | "published" | "archived";
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

type FoodRow = typeof foods.$inferSelect;

async function getPlanRowOrThrow(organizationId: string, planId: string) {
  const plan = await getDb().query.nutritionPlans.findFirst({
    where: and(
      eq(nutritionPlans.organizationId, organizationId),
      eq(nutritionPlans.id, planId),
    ),
  });

  if (!plan) {
    throw problem({
      type: "not-found",
      title: "Nutrition plan not found",
      status: 404,
      detail: `Nutrition plan ${planId} was not found in this organization.`,
    });
  }

  return plan;
}

export function assertPlanStructureEditable(plan: { status: string }) {
  if (plan.status !== "draft") {
    throw problem({
      type: "forbidden",
      title: "Nutrition plan is locked",
      status: 403,
      detail:
        "Published or archived nutrition plans cannot be modified structurally.",
    });
  }
}

function buildFoodVisibilityCondition(organizationId: string) {
  return or(
    and(eq(foods.source, "off"), sql`${foods.organizationId} IS NULL`),
    and(
      eq(foods.source, "custom"),
      eq(foods.organizationId, organizationId),
    ),
  );
}

function extractMacrosFromFood(row: FoodRow): MacrosPer100g {
  return {
    calories: row.caloriesPer100g,
    proteinG: row.proteinGPer100g,
    carbsG: row.carbsGPer100g,
    fatG: row.fatGPer100g,
    fiberG: row.fiberGPer100g,
    sugarG: row.sugarGPer100g,
  };
}

async function loadFoodsMap(
  organizationId: string,
  foodIds: string[],
): Promise<Map<string, FoodRow>> {
  if (foodIds.length === 0) {
    return new Map();
  }

  const rows = await getDb()
    .select()
    .from(foods)
    .where(
      and(
        inArray(foods.id, foodIds),
        buildFoodVisibilityCondition(organizationId),
      ),
    );

  return new Map(rows.map((row) => [row.id, row]));
}

async function loadRecipeIngredientsMap(
  organizationId: string,
  recipeIds: string[],
): Promise<
  Map<
    string,
    {
      recipe: typeof recipes.$inferSelect;
      ingredients: RecipeIngredientInput[];
    }
  >
> {
  if (recipeIds.length === 0) {
    return new Map();
  }

  const recipeRows = await getDb()
    .select()
    .from(recipes)
    .where(
      and(
        inArray(recipes.id, recipeIds),
        eq(recipes.organizationId, organizationId),
      ),
    );

  const ingredientRows = await getDb()
    .select()
    .from(recipeIngredients)
    .where(
      and(
        inArray(recipeIngredients.recipeId, recipeIds),
        eq(recipeIngredients.organizationId, organizationId),
      ),
    );

  const foodIds = [...new Set(ingredientRows.map((row) => row.foodId))];
  const foodMap = await loadFoodsMap(organizationId, foodIds);

  const byRecipe = new Map<string, RecipeIngredientInput[]>();
  for (const ingredient of ingredientRows) {
    const food = foodMap.get(ingredient.foodId);
    if (!food) {
      continue;
    }

    const current = byRecipe.get(ingredient.recipeId) ?? [];
    current.push({
      foodId: ingredient.foodId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      sortOrder: ingredient.sortOrder,
      food: {
        per100g: extractMacrosFromFood(food),
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
      },
    });
    byRecipe.set(ingredient.recipeId, current);
  }

  return new Map(
    recipeRows.map((recipe) => [
      recipe.id,
      {
        recipe,
        ingredients: (byRecipe.get(recipe.id) ?? []).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        ),
      },
    ]),
  );
}

async function computeItemMacros(
  organizationId: string,
  item: {
    itemType: "food" | "recipe";
    foodId: string | null;
    recipeId: string | null;
    quantity: number;
    unit: string;
  },
  foodMap: Map<string, FoodRow>,
  recipeMap: Awaited<ReturnType<typeof loadRecipeIngredientsMap>>,
) {
  if (item.itemType === "food" && item.foodId) {
    const food = foodMap.get(item.foodId);
    if (!food) {
      return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }

    return computeFoodItemMacros(
      extractMacrosFromFood(food),
      food.servingSize,
      food.servingUnit,
      item.quantity,
      item.unit,
    );
  }

  if (item.itemType === "recipe" && item.recipeId) {
    const recipeData = recipeMap.get(item.recipeId);
    if (!recipeData) {
      return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }

    return computeRecipeItemMacros(
      recipeData.ingredients,
      recipeData.recipe.servings,
      item.quantity,
      item.unit,
    );
  }

  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

async function fetchPlanRaw(organizationId: string, planId: string) {
  return getDb().query.nutritionPlans.findFirst({
    where: and(
      eq(nutritionPlans.organizationId, organizationId),
      eq(nutritionPlans.id, planId),
    ),
    with: {
      meals: {
        orderBy: asc(meals.sortOrder),
        with: {
          items: {
            orderBy: asc(mealItems.sortOrder),
            with: {
              food: true,
              recipe: true,
            },
          },
        },
      },
    },
  });
}

async function mapPlanTree(
  organizationId: string,
  raw: NonNullable<Awaited<ReturnType<typeof fetchPlanRaw>>>,
): Promise<NutritionPlanTree> {
  const foodIds = raw.meals.flatMap((meal) =>
    meal.items
      .filter((item) => item.itemType === "food" && item.foodId)
      .map((item) => item.foodId!),
  );
  const recipeIds = raw.meals.flatMap((meal) =>
    meal.items
      .filter((item) => item.itemType === "recipe" && item.recipeId)
      .map((item) => item.recipeId!),
  );

  const foodMap = await loadFoodsMap(organizationId, [...new Set(foodIds)]);
  const recipeMap = await loadRecipeIngredientsMap(
    organizationId,
    [...new Set(recipeIds)],
  );

  const mappedMeals: MealDetail[] = [];

  for (const meal of raw.meals) {
    const mappedItems: MealItemDetail[] = [];

    for (const item of meal.items) {
      const macros = await computeItemMacros(
        organizationId,
        item,
        foodMap,
        recipeMap,
      );

      mappedItems.push({
        id: item.id,
        itemType: item.itemType,
        foodId: item.foodId,
        recipeId: item.recipeId,
        foodName: item.food?.name ?? null,
        recipeName: item.recipe?.name ?? null,
        quantity: item.quantity,
        unit: item.unit,
        sortOrder: item.sortOrder,
        macros,
      });
    }

    mappedMeals.push({
      id: meal.id,
      sortOrder: meal.sortOrder,
      name: meal.name,
      timeSlot: meal.timeSlot,
      items: mappedItems,
      macros: sumMacros(mappedItems.map((entry) => entry.macros)),
    });
  }

  const plannedMacros = sumMacros(mappedMeals.map((meal) => meal.macros));

  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    coachClerkUserId: raw.coachClerkUserId,
    targetCalories: raw.targetCalories,
    targetProteinG: raw.targetProteinG,
    targetCarbsG: raw.targetCarbsG,
    targetFatG: raw.targetFatG,
    publishedAt: raw.publishedAt,
    clonedFromPlanId: raw.clonedFromPlanId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    meals: mappedMeals,
    plannedMacros,
  };
}

async function getNextMealSortOrder(planId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${meals.sortOrder}), -1)` })
    .from(meals)
    .where(eq(meals.planId, planId));
  return (row?.max ?? -1) + 1;
}

async function getNextItemSortOrder(mealId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${mealItems.sortOrder}), -1)` })
    .from(mealItems)
    .where(eq(mealItems.mealId, mealId));
  return (row?.max ?? -1) + 1;
}

async function reorderByIds(
  table: typeof meals | typeof mealItems,
  organizationId: string,
  parentFilter: SQL,
  ids: string[],
) {
  await getDb().transaction(async (tx) => {
    for (let index = 0; index < ids.length; index++) {
      await tx
        .update(table)
        .set({ sortOrder: index })
        .where(
          and(
            eq(table.organizationId, organizationId),
            parentFilter,
            eq(table.id, ids[index]!),
          ),
        );
    }
  });
}

export async function listNutritionPlans(
  organizationId: string,
  options: ListNutritionPlansOptions,
): Promise<{ items: NutritionPlanListItem[]; total: number }> {
  const filters: SQL[] = [eq(nutritionPlans.organizationId, organizationId)];

  if (options.status) {
    filters.push(eq(nutritionPlans.status, options.status));
  }

  if (options.search) {
    filters.push(ilike(nutritionPlans.name, `%${options.search}%`));
  }

  const where = and(...filters);

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        id: nutritionPlans.id,
        name: nutritionPlans.name,
        status: nutritionPlans.status,
        coachClerkUserId: nutritionPlans.coachClerkUserId,
        targetCalories: nutritionPlans.targetCalories,
        targetProteinG: nutritionPlans.targetProteinG,
        targetCarbsG: nutritionPlans.targetCarbsG,
        targetFatG: nutritionPlans.targetFatG,
        publishedAt: nutritionPlans.publishedAt,
        createdAt: nutritionPlans.createdAt,
        updatedAt: nutritionPlans.updatedAt,
        mealCount: sql<number>`(
          select count(*)::int from meals m
          where m.plan_id = ${nutritionPlans.id}
        )`,
      })
      .from(nutritionPlans)
      .where(where)
      .orderBy(desc(nutritionPlans.updatedAt))
      .limit(options.limit)
      .offset(options.offset),
    getDb().select({ total: count() }).from(nutritionPlans).where(where),
  ]);

  return {
    items: rows,
    total: totalRow?.total ?? 0,
  };
}

export async function createNutritionPlan(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateNutritionPlanInput,
): Promise<NutritionPlanTree> {
  const planId = await getDb().transaction(async (tx) => {
    const [plan] = await tx
      .insert(nutritionPlans)
      .values({
        organizationId,
        coachClerkUserId,
        name: input.name,
        targetCalories: input.targetCalories,
        targetProteinG: input.targetProteinG,
        targetCarbsG: input.targetCarbsG,
        targetFatG: input.targetFatG,
        status: "draft",
      })
      .returning({ id: nutritionPlans.id });

    await tx.insert(meals).values({
      organizationId,
      planId: plan!.id,
      sortOrder: 0,
      name: "Petit-déjeuner",
      timeSlot: "08:00",
    });

    return plan!.id;
  });

  return getNutritionPlanTree(organizationId, planId);
}

export async function getNutritionPlanTree(
  organizationId: string,
  planId: string,
): Promise<NutritionPlanTree> {
  const raw = await fetchPlanRaw(organizationId, planId);

  if (!raw) {
    throw problem({
      type: "not-found",
      title: "Nutrition plan not found",
      status: 404,
      detail: `Nutrition plan ${planId} was not found in this organization.`,
    });
  }

  return mapPlanTree(organizationId, raw);
}

export async function patchNutritionPlan(
  organizationId: string,
  planId: string,
  input: PatchNutritionPlanInput,
): Promise<NutritionPlanTree> {
  await getPlanRowOrThrow(organizationId, planId);

  await getDb()
    .update(nutritionPlans)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetCalories !== undefined
        ? { targetCalories: input.targetCalories }
        : {}),
      ...(input.targetProteinG !== undefined
        ? { targetProteinG: input.targetProteinG }
        : {}),
      ...(input.targetCarbsG !== undefined
        ? { targetCarbsG: input.targetCarbsG }
        : {}),
      ...(input.targetFatG !== undefined ? { targetFatG: input.targetFatG } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(
      and(
        eq(nutritionPlans.organizationId, organizationId),
        eq(nutritionPlans.id, planId),
      ),
    );

  return getNutritionPlanTree(organizationId, planId);
}

export async function publishNutritionPlan(
  organizationId: string,
  planId: string,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);

  if (plan.status !== "draft") {
    throw problem({
      type: "validation-error",
      title: "Invalid status transition",
      status: 400,
      detail: "Only draft nutrition plans can be published.",
    });
  }

  await getDb()
    .update(nutritionPlans)
    .set({ status: "published", publishedAt: new Date() })
    .where(
      and(
        eq(nutritionPlans.organizationId, organizationId),
        eq(nutritionPlans.id, planId),
      ),
    );

  return getNutritionPlanTree(organizationId, planId);
}

export async function unpublishNutritionPlan(
  organizationId: string,
  planId: string,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);

  if (plan.status !== "published") {
    throw problem({
      type: "validation-error",
      title: "Invalid status transition",
      status: 400,
      detail: "Only published nutrition plans can be unpublished.",
    });
  }

  await getDb()
    .update(nutritionPlans)
    .set({ status: "draft", publishedAt: null })
    .where(
      and(
        eq(nutritionPlans.organizationId, organizationId),
        eq(nutritionPlans.id, planId),
      ),
    );

  return getNutritionPlanTree(organizationId, planId);
}

export async function createMeal(
  organizationId: string,
  planId: string,
  input: CreateMealInput,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  const sortOrder = await getNextMealSortOrder(planId);

  await getDb().insert(meals).values({
    organizationId,
    planId,
    sortOrder,
    name: input.name ?? `Repas ${sortOrder + 1}`,
    timeSlot: input.timeSlot ?? null,
  });

  return getNutritionPlanTree(organizationId, planId);
}

export async function patchMeal(
  organizationId: string,
  planId: string,
  mealId: string,
  input: PatchMealInput,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  const meal = await getDb().query.meals.findFirst({
    where: and(
      eq(meals.organizationId, organizationId),
      eq(meals.planId, planId),
      eq(meals.id, mealId),
    ),
  });

  if (!meal) {
    throw problem({
      type: "not-found",
      title: "Meal not found",
      status: 404,
      detail: `Meal ${mealId} was not found in this nutrition plan.`,
    });
  }

  await getDb()
    .update(meals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.timeSlot !== undefined ? { timeSlot: input.timeSlot } : {}),
    })
    .where(eq(meals.id, mealId));

  return getNutritionPlanTree(organizationId, planId);
}

export async function deleteMeal(
  organizationId: string,
  planId: string,
  mealId: string,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  await getDb()
    .delete(meals)
    .where(
      and(
        eq(meals.organizationId, organizationId),
        eq(meals.planId, planId),
        eq(meals.id, mealId),
      ),
    );

  return getNutritionPlanTree(organizationId, planId);
}

export async function reorderMeals(
  organizationId: string,
  planId: string,
  ids: string[],
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  await reorderByIds(
    meals,
    organizationId,
    eq(meals.planId, planId),
    ids,
  );

  return getNutritionPlanTree(organizationId, planId);
}

async function assertFoodAccessible(organizationId: string, foodId: string) {
  const food = await getDb().query.foods.findFirst({
    where: and(eq(foods.id, foodId), buildFoodVisibilityCondition(organizationId)),
  });

  if (!food) {
    throw problem({
      type: "not-found",
      title: "Food not found",
      status: 404,
      detail: `Food ${foodId} was not found.`,
    });
  }
}

async function assertRecipeAccessible(
  organizationId: string,
  recipeId: string,
) {
  const recipe = await getDb().query.recipes.findFirst({
    where: and(
      eq(recipes.organizationId, organizationId),
      eq(recipes.id, recipeId),
    ),
  });

  if (!recipe) {
    throw problem({
      type: "not-found",
      title: "Recipe not found",
      status: 404,
      detail: `Recipe ${recipeId} was not found.`,
    });
  }
}

export async function createMealItem(
  organizationId: string,
  planId: string,
  mealId: string,
  input: CreateMealItemInput,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  const meal = await getDb().query.meals.findFirst({
    where: and(
      eq(meals.organizationId, organizationId),
      eq(meals.planId, planId),
      eq(meals.id, mealId),
    ),
  });

  if (!meal) {
    throw problem({
      type: "not-found",
      title: "Meal not found",
      status: 404,
      detail: `Meal ${mealId} was not found in this nutrition plan.`,
    });
  }

  if (input.itemType === "food" && input.foodId) {
    await assertFoodAccessible(organizationId, input.foodId);
  }

  if (input.itemType === "recipe" && input.recipeId) {
    await assertRecipeAccessible(organizationId, input.recipeId);
  }

  const sortOrder = await getNextItemSortOrder(mealId);

  await getDb().insert(mealItems).values({
    organizationId,
    mealId,
    itemType: input.itemType,
    foodId: input.itemType === "food" ? input.foodId : null,
    recipeId: input.itemType === "recipe" ? input.recipeId : null,
    quantity: input.quantity,
    unit: input.unit,
    sortOrder,
  });

  return getNutritionPlanTree(organizationId, planId);
}

export async function patchMealItem(
  organizationId: string,
  planId: string,
  mealId: string,
  itemId: string,
  input: PatchMealItemInput,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  const item = await getDb().query.mealItems.findFirst({
    where: and(
      eq(mealItems.organizationId, organizationId),
      eq(mealItems.mealId, mealId),
      eq(mealItems.id, itemId),
    ),
  });

  if (!item) {
    throw problem({
      type: "not-found",
      title: "Meal item not found",
      status: 404,
      detail: `Meal item ${itemId} was not found.`,
    });
  }

  await getDb()
    .update(mealItems)
    .set({
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
    })
    .where(eq(mealItems.id, itemId));

  return getNutritionPlanTree(organizationId, planId);
}

export async function deleteMealItem(
  organizationId: string,
  planId: string,
  mealId: string,
  itemId: string,
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  await getDb()
    .delete(mealItems)
    .where(
      and(
        eq(mealItems.organizationId, organizationId),
        eq(mealItems.mealId, mealId),
        eq(mealItems.id, itemId),
      ),
    );

  return getNutritionPlanTree(organizationId, planId);
}

export async function reorderMealItems(
  organizationId: string,
  planId: string,
  mealId: string,
  ids: string[],
): Promise<NutritionPlanTree> {
  const plan = await getPlanRowOrThrow(organizationId, planId);
  assertPlanStructureEditable(plan);

  await reorderByIds(
    mealItems,
    organizationId,
    eq(mealItems.mealId, mealId),
    ids,
  );

  return getNutritionPlanTree(organizationId, planId);
}
