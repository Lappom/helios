import { and, eq, inArray, isNull } from "drizzle-orm";
import { getOrSet } from "@/lib/cache/get-or-set";
import { cacheKeys } from "@/lib/cache/keys";
import { invalidateNutrition } from "@/lib/cache/invalidate";
import { getDb } from "@/lib/db";
import {
  foods,
  mealLogItems,
  mealLogs,
  recipeIngredients,
  recipes,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import { getActiveClientNutrition } from "@/lib/nutrition/assignments";
import {
  computeFoodItemMacros,
  computeMacroDeltas,
  computeRecipeItemMacros,
  isWithinAllMacroTolerance,
  subtractMacros,
  sumMacros,
} from "@/lib/nutrition/macros";
import { getNutritionPlanTree } from "@/lib/nutrition/service";
import type {
  ClientNutritionPayload,
  DailyNutritionSummary,
  MealLogDetail,
  MealLogItemDetail,
  MacroTotals,
} from "@/lib/nutrition/types";
import type { LogMealInput } from "@/lib/validators/nutrition-plans";
import type { MacrosPer100g } from "@/lib/foods/types";
import type { RecipeIngredientInput } from "@/lib/recipes/macros";

type FoodRow = typeof foods.$inferSelect;

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

  const rows = await getDb().query.foods.findMany({
    where: inArray(foods.id, foodIds),
  });

  return new Map(rows.map((row) => [row.id, row]));
}

async function loadRecipeData(
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

async function resolveItemMacros(
  organizationId: string,
  item: {
    itemType: "food" | "recipe";
    foodId?: string | null;
    recipeId?: string | null;
    quantity: number;
    unit: string;
  },
  foodMap: Map<string, FoodRow>,
  recipeMap: Awaited<ReturnType<typeof loadRecipeData>>,
): Promise<MacroTotals> {
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

async function mapMealLogs(
  organizationId: string,
  logs: Array<
    typeof mealLogs.$inferSelect & {
      items: Array<
        typeof mealLogItems.$inferSelect & {
          food?: { name: string } | null;
          recipe?: { name: string } | null;
        }
      >;
      meal?: { name: string } | null;
    }
  >,
): Promise<MealLogDetail[]> {
  const foodIds = logs.flatMap((log) =>
    log.items
      .filter((item) => item.itemType === "food" && item.foodId)
      .map((item) => item.foodId!),
  );
  const recipeIds = logs.flatMap((log) =>
    log.items
      .filter((item) => item.itemType === "recipe" && item.recipeId)
      .map((item) => item.recipeId!),
  );

  const foodMap = await loadFoodsMap(organizationId, [...new Set(foodIds)]);
  const recipeMap = await loadRecipeData(organizationId, [...new Set(recipeIds)]);

  return Promise.all(
    logs.map(async (log) => {
      const mappedItems: MealLogItemDetail[] = [];

      for (const item of log.items) {
        const macros =
          item.calories != null &&
          item.proteinG != null &&
          item.carbsG != null &&
          item.fatG != null
            ? {
                calories: item.calories,
                proteinG: item.proteinG,
                carbsG: item.carbsG,
                fatG: item.fatG,
              }
            : await resolveItemMacros(
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
          macros,
        });
      }

      return {
        id: log.id,
        mealId: log.mealId,
        mealName: log.meal?.name ?? null,
        loggedDate: log.loggedDate,
        notes: log.notes,
        items: mappedItems,
        macros: sumMacros(mappedItems.map((entry) => entry.macros)),
      };
    }),
  );
}

export async function getDailyNutritionSummary(
  organizationId: string,
  clientId: string,
  date: string,
): Promise<DailyNutritionSummary | null> {
  const assignment = await getActiveClientNutrition(organizationId, clientId);

  if (!assignment) {
    return null;
  }

  const planTree = await getNutritionPlanTree(
    organizationId,
    assignment.planId,
  );

  const targets: MacroTotals = {
    calories: assignment.plan.targetCalories,
    proteinG: assignment.plan.targetProteinG,
    carbsG: assignment.plan.targetCarbsG,
    fatG: assignment.plan.targetFatG,
  };

  const logRows = await getDb().query.mealLogs.findMany({
    where: and(
      eq(mealLogs.organizationId, organizationId),
      eq(mealLogs.clientId, clientId),
      eq(mealLogs.assignmentId, assignment.id),
      eq(mealLogs.loggedDate, date),
    ),
    with: {
      items: {
        with: {
          food: true,
          recipe: true,
        },
      },
      meal: true,
    },
  });

  const logs = await mapMealLogs(organizationId, logRows);
  const consumed = sumMacros(logs.map((log) => log.macros));

  return {
    date,
    targets,
    consumed,
    remaining: subtractMacros(targets, consumed),
    inGreenZone: isWithinAllMacroTolerance(consumed, targets),
    macroDeltas: computeMacroDeltas(consumed, targets),
    plannedMeals: planTree.meals,
    logs,
  };
}

export async function logMeal(
  organizationId: string,
  clientId: string,
  input: LogMealInput,
): Promise<MealLogDetail> {
  const assignment = await getActiveClientNutrition(organizationId, clientId);

  if (!assignment) {
    throw problem({
      type: "forbidden",
      title: "No active nutrition plan",
      status: 403,
      detail: "Client does not have an active nutrition assignment.",
    });
  }

  const foodIds = input.items
    .filter((item) => item.itemType === "food" && item.foodId)
    .map((item) => item.foodId!);
  const recipeIds = input.items
    .filter((item) => item.itemType === "recipe" && item.recipeId)
    .map((item) => item.recipeId!);

  const foodMap = await loadFoodsMap(organizationId, foodIds);
  const recipeMap = await loadRecipeData(organizationId, recipeIds);

  const mealLogId = await getDb().transaction(async (tx) => {
    const existing = await tx.query.mealLogs.findFirst({
      where: and(
        eq(mealLogs.organizationId, organizationId),
        eq(mealLogs.assignmentId, assignment.id),
        eq(mealLogs.loggedDate, input.loggedDate),
        input.mealId
          ? eq(mealLogs.mealId, input.mealId)
          : isNull(mealLogs.mealId),
      ),
    });

    let logId = existing?.id;

    if (existing) {
      await tx
        .delete(mealLogItems)
        .where(eq(mealLogItems.mealLogId, existing.id));

      await tx
        .update(mealLogs)
        .set({
          notes: input.notes ?? null,
        })
        .where(eq(mealLogs.id, existing.id));
    } else {
      const [inserted] = await tx
        .insert(mealLogs)
        .values({
          organizationId,
          clientId,
          assignmentId: assignment.id,
          mealId: input.mealId ?? null,
          loggedDate: input.loggedDate,
          notes: input.notes ?? null,
        })
        .returning({ id: mealLogs.id });

      logId = inserted!.id;
    }

    for (const item of input.items) {
      const macros = await resolveItemMacros(
        organizationId,
        item,
        foodMap,
        recipeMap,
      );

      await tx.insert(mealLogItems).values({
        organizationId,
        mealLogId: logId!,
        itemType: item.itemType,
        foodId: item.itemType === "food" ? item.foodId : null,
        recipeId: item.itemType === "recipe" ? item.recipeId : null,
        quantity: item.quantity,
        unit: item.unit,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
      });
    }

    return logId!;
  });

  const logRow = await getDb().query.mealLogs.findFirst({
    where: eq(mealLogs.id, mealLogId),
    with: {
      items: {
        with: {
          food: true,
          recipe: true,
        },
      },
      meal: true,
    },
  });

  if (!logRow) {
    throw problem({
      type: "internal-error",
      title: "Meal log persistence failed",
      status: 500,
      detail: "The meal log could not be loaded after save.",
    });
  }

  await invalidateNutrition(organizationId, clientId);

  const [mapped] = await mapMealLogs(organizationId, [logRow]);
  return mapped!;
}

const NUTRITION_PAYLOAD_TTL_SECONDS = 5 * 60;

async function fetchClientNutritionPayload(
  organizationId: string,
  clientId: string,
  date: string,
): Promise<ClientNutritionPayload | null> {
  const assignment = await getActiveClientNutrition(organizationId, clientId);

  if (!assignment) {
    return null;
  }

  const summary = await getDailyNutritionSummary(
    organizationId,
    clientId,
    date,
  );

  if (!summary) {
    return null;
  }

  return {
    assignment,
    summary,
  };
}

export async function getClientNutritionPayload(
  organizationId: string,
  clientId: string,
  date: string,
): Promise<ClientNutritionPayload | null> {
  return getOrSet(
    cacheKeys.nutrition(organizationId, clientId, date),
    NUTRITION_PAYLOAD_TTL_SECONDS,
    () => fetchClientNutritionPayload(organizationId, clientId, date),
  );
}
