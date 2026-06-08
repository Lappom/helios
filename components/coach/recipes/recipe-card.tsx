"use client";

import { Clock, UtensilsCrossed } from "lucide-react";
import type { RecipeListItem } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

type RecipeCardProps = {
  recipe: RecipeListItem;
  index: number;
  onSelect: (recipe: RecipeListItem) => void;
};

function formatMinutes(value: number | null): string | null {
  if (value == null || value <= 0) return null;
  return `${value} min`;
}

export function RecipeCard({ recipe, index, onSelect }: RecipeCardProps) {
  const prep = formatMinutes(recipe.prepTimeMinutes);
  const cook = formatMinutes(recipe.cookTimeMinutes);
  const timeLabel = [prep, cook].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "group border-hairline bg-surface-card hover:border-hairline-strong cursor-pointer overflow-hidden rounded-lg border transition-colors",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={() => onSelect(recipe)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(recipe);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-title-sm text-on-dark truncate font-semibold">
              {recipe.name}
            </h3>
            {recipe.description ? (
              <p className="text-body-sm text-muted mt-0.5 line-clamp-2">
                {recipe.description}
              </p>
            ) : null}
          </div>
          <div className="bg-surface-elevated text-muted flex shrink-0 items-center gap-1 rounded-md px-2 py-1">
            <UtensilsCrossed className="size-3.5" />
            <span className="text-caption">{recipe.ingredientCount}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-primary text-title-sm font-bold">
              {Math.round(recipe.macrosPerServing.calories)}
            </p>
            <p className="text-caption text-muted">kcal</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {recipe.macrosPerServing.proteinG}g
            </p>
            <p className="text-caption text-muted">P</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {recipe.macrosPerServing.carbsG}g
            </p>
            <p className="text-caption text-muted">G</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {recipe.macrosPerServing.fatG}g
            </p>
            <p className="text-caption text-muted">L</p>
          </div>
        </div>

        <div className="text-caption text-muted flex flex-wrap items-center gap-3">
          <span>{recipe.servings} portion{recipe.servings > 1 ? "s" : ""}</span>
          {timeLabel ? (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {timeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
