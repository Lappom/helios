"use client";

import { Badge } from "@/components/ui/badge";
import type { FoodListItem } from "@/lib/foods/types";
import { cn } from "@/lib/utils";

type FoodCardProps = {
  food: FoodListItem;
  index: number;
  onSelect: (food: FoodListItem) => void;
};

function sourceLabel(source: FoodListItem["source"]): string {
  if (source === "off") return "Open Food Facts";
  if (source === "custom") return "Custom";
  return source.toUpperCase();
}

export function FoodCard({ food, index, onSelect }: FoodCardProps) {
  return (
    <article
      className={cn(
        "group border-hairline bg-surface-card hover:border-hairline-strong cursor-pointer overflow-hidden rounded-lg border transition-colors",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={() => onSelect(food)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(food);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-title-sm text-on-dark truncate font-semibold">
              {food.name}
            </h3>
            {food.brand ? (
              <p className="text-body-sm text-muted mt-0.5 truncate">
                {food.brand}
              </p>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className={
              food.source === "custom"
                ? "border-accent-emerald/40 text-accent-emerald shrink-0"
                : "shrink-0"
            }
          >
            {sourceLabel(food.source)}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-primary text-title-sm font-bold">
              {Math.round(food.per100g.calories)}
            </p>
            <p className="text-caption text-muted">kcal</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {food.per100g.proteinG}g
            </p>
            <p className="text-caption text-muted">P</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {food.per100g.carbsG}g
            </p>
            <p className="text-caption text-muted">G</p>
          </div>
          <div className="bg-surface-elevated rounded-md px-2 py-2 text-center">
            <p className="text-on-dark text-title-sm font-semibold">
              {food.per100g.fatG}g
            </p>
            <p className="text-caption text-muted">L</p>
          </div>
        </div>

        <p className="text-caption text-muted">
          {food.servingSize} {food.servingUnit} / portion · 100 g
        </p>
      </div>
    </article>
  );
}
