"use client";

import { useDraggable } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { FoodListItem } from "@/lib/foods/types";
import type { RecipeListItem } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

export const PALETTE_FOOD_PREFIX = "palette-food:";
export const PALETTE_RECIPE_PREFIX = "palette-recipe:";

function DraggablePaletteItem({
  id,
  label,
  sublabel,
  disabled,
}: {
  id: string;
  label: string;
  sublabel: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      className={cn(
        "border-hairline bg-surface-elevated hover:bg-surface-card w-full rounded-md border px-3 py-2 text-left transition-colors",
        isDragging && "opacity-50",
      )}
      {...listeners}
      {...attributes}
    >
      <p className="text-on-dark text-sm font-medium">{label}</p>
      <p className="text-muted text-xs">{sublabel}</p>
    </button>
  );
}

type NutritionItemPaletteProps = {
  disabled?: boolean;
  onAddFood: (food: FoodListItem) => void;
  onAddRecipe: (recipe: RecipeListItem) => void;
};

export function NutritionItemPalette({
  disabled,
  onAddFood,
  onAddRecipe,
}: NutritionItemPaletteProps) {
  const [tab, setTab] = useState<"foods" | "recipes">("foods");
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodListItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "foods" || query.trim().length < 2) {
      setFoods([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "8",
          page: "1",
        });
        const response = await fetch(`/api/v1/foods/search?${params}`);
        const payload = await response.json();
        if (response.ok) {
          setFoods(payload.items ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, tab]);

  useEffect(() => {
    if (tab !== "recipes") {
      return;
    }

    setLoading(true);
    fetch("/api/v1/recipes?limit=20&page=1")
      .then((response) => response.json())
      .then((payload: { items: RecipeListItem[] }) => {
        setRecipes(payload.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const filteredRecipes = recipes.filter((recipe) => {
    if (!query.trim()) {
      return true;
    }
    return recipe.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <div className="border-hairline bg-surface-card flex h-full flex-col rounded-lg border">
      <div className="border-hairline border-b p-4">
        <h2 className="text-title-sm text-on-dark font-semibold">Bibliothèque</h2>
        <p className="text-muted mt-1 text-xs">
          Glissez un aliment ou une recette vers un repas.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("foods")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold",
              tab === "foods"
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-surface-elevated",
            )}
          >
            Aliments
          </button>
          <button
            type="button"
            onClick={() => setTab("recipes")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold",
              tab === "recipes"
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-surface-elevated",
            )}
          >
            Recettes
          </button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tab === "foods" ? "Rechercher un aliment…" : "Filtrer recettes…"}
          className="border-hairline bg-surface-elevated mt-3"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <p className="text-muted text-sm">Chargement…</p>
        ) : tab === "foods" ? (
          foods.length === 0 ? (
            <p className="text-muted text-sm">
              Tapez au moins 2 caractères pour rechercher.
            </p>
          ) : (
            foods.map((food) => (
              <div key={food.id} className="space-y-1">
                <DraggablePaletteItem
                  id={`${PALETTE_FOOD_PREFIX}${food.id}`}
                  label={food.name}
                  sublabel={`${food.per100g.calories} kcal / 100g`}
                  disabled={disabled}
                />
                <button
                  type="button"
                  disabled={disabled}
                  className="text-primary text-xs hover:underline"
                  onClick={() => onAddFood(food)}
                >
                  Ajouter au repas actif
                </button>
              </div>
            ))
          )
        ) : filteredRecipes.length === 0 ? (
          <p className="text-muted text-sm">Aucune recette trouvée.</p>
        ) : (
          filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="space-y-1">
              <DraggablePaletteItem
                id={`${PALETTE_RECIPE_PREFIX}${recipe.id}`}
                label={recipe.name}
                sublabel={`${recipe.servings} portion(s)`}
                disabled={disabled}
              />
              <button
                type="button"
                disabled={disabled}
                className="text-primary text-xs hover:underline"
                onClick={() => onAddRecipe(recipe)}
              >
                Ajouter au repas actif
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
