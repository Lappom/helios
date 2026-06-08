export type RecipeMacros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
};

export type RecipeIngredientItem = {
  id: string;
  foodId: string;
  foodName: string;
  foodBrand: string | null;
  quantity: number;
  unit: string;
  sortOrder: number;
};

export type RecipeListItem = {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredientCount: number;
  macrosPerServing: RecipeMacros;
  createdAt: Date;
  updatedAt: Date;
};

export type RecipeDetail = {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  instructions: string[];
  ingredients: RecipeIngredientItem[];
  macros: {
    total: RecipeMacros;
    perServing: RecipeMacros;
  };
  createdByClerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScaledRecipePreview = {
  scaleFactor: number;
  ingredients: RecipeIngredientItem[];
  macros: {
    total: RecipeMacros;
    perServing: RecipeMacros;
  };
};
