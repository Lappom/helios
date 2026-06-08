"use client";

import type { RecipeListItem } from "@/lib/recipes/types";
import { RecipeCard } from "@/components/coach/recipes/recipe-card";

type RecipeGridProps = {
  items: RecipeListItem[];
  loading?: boolean;
  onSelect: (recipe: RecipeListItem) => void;
};

export function RecipeGrid({ items, loading, onSelect }: RecipeGridProps) {
  if (loading) {
    return (
      <div className="text-body-md text-muted border-hairline bg-surface-card rounded-lg border p-12 text-center">
        Chargement des recettes…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-body-md text-muted border-hairline bg-surface-card rounded-lg border p-12 text-center">
        Aucune recette trouvée. Créez votre première recette pour commencer.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((recipe, index) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
