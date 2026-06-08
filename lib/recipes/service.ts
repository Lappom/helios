import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { foods, recipeIngredients, recipes } from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type { MacrosPer100g } from "@/lib/foods/types";
import {
  computeRecipeMacros,
  scaleRecipeIngredients,
  UnsupportedIngredientUnitError,
  type IngredientFoodRef,
} from "@/lib/recipes/macros";
import type {
  RecipeDetail,
  RecipeIngredientItem,
  RecipeListItem,
  ScaledRecipePreview,
} from "@/lib/recipes/types";
import type {
  CreateRecipeInput,
  ListRecipesQuery,
  UpdateRecipeInput,
} from "@/lib/validators/recipes";

type FoodRow = typeof foods.$inferSelect;
type IngredientRow = typeof recipeIngredients.$inferSelect;

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

function toFoodRef(row: FoodRow): IngredientFoodRef {
  return {
    per100g: extractMacrosFromFood(row),
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
  };
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

async function loadFoodsForIngredients(
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

function mapIngredientItem(
  ingredient: IngredientRow,
  food: FoodRow,
): RecipeIngredientItem {
  return {
    id: ingredient.id,
    foodId: ingredient.foodId,
    foodName: food.name,
    foodBrand: food.brand,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    sortOrder: ingredient.sortOrder,
  };
}

function buildRecipeDetail(
  recipe: typeof recipes.$inferSelect,
  ingredientRows: Array<{ ingredient: IngredientRow; food: FoodRow }>,
): RecipeDetail {
  const ingredients = ingredientRows
    .sort((a, b) => a.ingredient.sortOrder - b.ingredient.sortOrder)
    .map(({ ingredient, food }) => mapIngredientItem(ingredient, food));

  const macrosInput = ingredientRows.map(({ ingredient, food }) => ({
    foodId: ingredient.foodId,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    food: toFoodRef(food),
  }));

  let macros;
  try {
    macros = computeRecipeMacros(macrosInput, recipe.servings);
  } catch (error) {
    if (error instanceof UnsupportedIngredientUnitError) {
      throw problem({
        type: "validation-error",
        title: "Unsupported ingredient unit",
        status: 400,
        detail: error.message,
      });
    }
    throw error;
  }

  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    instructions: recipe.instructions ?? [],
    ingredients,
    macros,
    createdByClerkUserId: recipe.createdByClerkUserId,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

async function loadRecipeIngredients(
  organizationId: string,
  recipeId: string,
): Promise<Array<{ ingredient: IngredientRow; food: FoodRow }>> {
  const rows = await getDb()
    .select({
      ingredient: recipeIngredients,
      food: foods,
    })
    .from(recipeIngredients)
    .innerJoin(foods, eq(recipeIngredients.foodId, foods.id))
    .where(
      and(
        eq(recipeIngredients.recipeId, recipeId),
        eq(recipeIngredients.organizationId, organizationId),
      ),
    )
    .orderBy(recipeIngredients.sortOrder);

  return rows;
}

async function getRecipeRow(organizationId: string, id: string) {
  const [recipe] = await getDb()
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.organizationId, organizationId)))
    .limit(1);

  if (!recipe) {
    throw problem({
      type: "not-found",
      title: "Recipe not found",
      status: 404,
    });
  }

  return recipe;
}

function buildListWhere(organizationId: string, options: ListRecipesQuery) {
  const conditions = [eq(recipes.organizationId, organizationId)];

  if (options.q) {
    const term = `%${options.q.trim()}%`;
    conditions.push(
      or(ilike(recipes.name, term), ilike(recipes.description, term))!,
    );
  }

  return and(...conditions);
}

export async function listRecipes(
  organizationId: string,
  options: ListRecipesQuery,
): Promise<{ items: RecipeListItem[]; total: number }> {
  const where = buildListWhere(organizationId, options);

  const [totalRow] = await getDb()
    .select({ total: count() })
    .from(recipes)
    .where(where);

  const recipeRows = await getDb()
    .select()
    .from(recipes)
    .where(where)
    .orderBy(desc(recipes.updatedAt))
    .limit(options.limit)
    .offset(options.offset);

  if (recipeRows.length === 0) {
    return { items: [], total: totalRow?.total ?? 0 };
  }

  const recipeIds = recipeRows.map((row) => row.id);
  const ingredientRows = await getDb()
    .select({
      ingredient: recipeIngredients,
      food: foods,
    })
    .from(recipeIngredients)
    .innerJoin(foods, eq(recipeIngredients.foodId, foods.id))
    .where(
      and(
        inArray(recipeIngredients.recipeId, recipeIds),
        eq(recipeIngredients.organizationId, organizationId),
      ),
    )
    .orderBy(recipeIngredients.sortOrder);

  const ingredientsByRecipe = new Map<
    string,
    Array<{ ingredient: IngredientRow; food: FoodRow }>
  >();

  for (const row of ingredientRows) {
    const list = ingredientsByRecipe.get(row.ingredient.recipeId) ?? [];
    list.push(row);
    ingredientsByRecipe.set(row.ingredient.recipeId, list);
  }

  const items: RecipeListItem[] = recipeRows.map((recipe) => {
    const detail = buildRecipeDetail(
      recipe,
      ingredientsByRecipe.get(recipe.id) ?? [],
    );

    return {
      id: detail.id,
      name: detail.name,
      description: detail.description,
      servings: detail.servings,
      prepTimeMinutes: detail.prepTimeMinutes,
      cookTimeMinutes: detail.cookTimeMinutes,
      ingredientCount: detail.ingredients.length,
      macrosPerServing: detail.macros.perServing,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  });

  return {
    items,
    total: totalRow?.total ?? 0,
  };
}

export async function getRecipeById(
  organizationId: string,
  id: string,
): Promise<RecipeDetail> {
  const recipe = await getRecipeRow(organizationId, id);
  const ingredientRows = await loadRecipeIngredients(organizationId, id);
  return buildRecipeDetail(recipe, ingredientRows);
}

async function validateAndResolveIngredients(
  organizationId: string,
  ingredients: CreateRecipeInput["ingredients"],
): Promise<Array<{ input: CreateRecipeInput["ingredients"][number]; food: FoodRow }>> {
  const foodIds = [...new Set(ingredients.map((item) => item.foodId))];
  const foodMap = await loadFoodsForIngredients(organizationId, foodIds);

  const resolved: Array<{
    input: CreateRecipeInput["ingredients"][number];
    food: FoodRow;
  }> = [];

  for (const ingredient of ingredients) {
    const food = foodMap.get(ingredient.foodId);
    if (!food) {
      throw problem({
        type: "validation-error",
        title: "Invalid food",
        status: 400,
        detail: `Food ${ingredient.foodId} was not found.`,
      });
    }

    try {
      computeRecipeMacros(
        [
          {
            foodId: ingredient.foodId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            food: toFoodRef(food),
          },
        ],
        1,
      );
    } catch (error) {
      if (error instanceof UnsupportedIngredientUnitError) {
        throw problem({
          type: "validation-error",
          title: "Unsupported ingredient unit",
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }

    resolved.push({ input: ingredient, food });
  }

  return resolved;
}

async function replaceRecipeIngredients(
  organizationId: string,
  recipeId: string,
  ingredients: CreateRecipeInput["ingredients"],
) {
  const resolved = await validateAndResolveIngredients(
    organizationId,
    ingredients,
  );

  await getDb()
    .delete(recipeIngredients)
    .where(
      and(
        eq(recipeIngredients.recipeId, recipeId),
        eq(recipeIngredients.organizationId, organizationId),
      ),
    );

  if (resolved.length === 0) {
    return;
  }

  await getDb().insert(recipeIngredients).values(
    resolved.map(({ input }, index) => ({
      organizationId,
      recipeId,
      foodId: input.foodId,
      quantity: input.quantity,
      unit: input.unit,
      sortOrder: input.sortOrder ?? index,
    })),
  );
}

export async function createRecipe(
  organizationId: string,
  clerkUserId: string,
  input: CreateRecipeInput,
): Promise<RecipeDetail> {
  await validateAndResolveIngredients(organizationId, input.ingredients);

  const [inserted] = await getDb()
    .insert(recipes)
    .values({
      organizationId,
      name: input.name,
      description: input.description ?? null,
      servings: input.servings,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      instructions: input.instructions,
      createdByClerkUserId: clerkUserId,
    })
    .returning();

  await replaceRecipeIngredients(
    organizationId,
    inserted!.id,
    input.ingredients,
  );

  return getRecipeById(organizationId, inserted!.id);
}

export async function updateRecipe(
  organizationId: string,
  id: string,
  input: UpdateRecipeInput,
): Promise<RecipeDetail> {
  await getRecipeRow(organizationId, id);

  if (input.ingredients) {
    await validateAndResolveIngredients(organizationId, input.ingredients);
  }

  const patch: Partial<typeof recipes.$inferInsert> = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.servings !== undefined) patch.servings = input.servings;
  if (input.prepTimeMinutes !== undefined) {
    patch.prepTimeMinutes = input.prepTimeMinutes;
  }
  if (input.cookTimeMinutes !== undefined) {
    patch.cookTimeMinutes = input.cookTimeMinutes;
  }
  if (input.instructions !== undefined) patch.instructions = input.instructions;

  if (Object.keys(patch).length > 0) {
    await getDb()
      .update(recipes)
      .set(patch)
      .where(
        and(eq(recipes.id, id), eq(recipes.organizationId, organizationId)),
      );
  }

  if (input.ingredients) {
    await replaceRecipeIngredients(organizationId, id, input.ingredients);
  }

  return getRecipeById(organizationId, id);
}

export async function scaleRecipe(
  organizationId: string,
  id: string,
  scaleFactor: number,
): Promise<ScaledRecipePreview> {
  const detail = await getRecipeById(organizationId, id);

  const scaledInputs = scaleRecipeIngredients(
    detail.ingredients.map((ingredient) => ({
      foodId: ingredient.foodId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      sortOrder: ingredient.sortOrder,
    })),
    scaleFactor,
  );

  const ingredientRows = await loadRecipeIngredients(organizationId, id);
  const foodById = new Map(
    ingredientRows.map(({ ingredient, food }) => [ingredient.foodId, food]),
  );

  const macrosInput = scaledInputs.map((ingredient) => {
    const food = foodById.get(ingredient.foodId);
    if (!food) {
      throw problem({
        type: "not-found",
        title: "Food not found",
        status: 404,
      });
    }

    return {
      ...ingredient,
      food: toFoodRef(food),
    };
  });

  const macros = computeRecipeMacros(macrosInput, detail.servings);

  const scaledIngredients: RecipeIngredientItem[] = scaledInputs.map(
    (ingredient, index) => {
      const food = foodById.get(ingredient.foodId)!;
      const original = detail.ingredients[index];

      return {
        id: original?.id ?? ingredient.foodId,
        foodId: ingredient.foodId,
        foodName: food.name,
        foodBrand: food.brand,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        sortOrder: ingredient.sortOrder ?? index,
      };
    },
  );

  return {
    scaleFactor,
    ingredients: scaledIngredients,
    macros,
  };
}
