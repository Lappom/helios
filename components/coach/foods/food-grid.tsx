"use client";

import { FoodCard } from "@/components/coach/foods/food-card";
import type { FoodListItem } from "@/lib/foods/types";

type FoodGridProps = {
  items: FoodListItem[];
  loading: boolean;
  onSelect: (food: FoodListItem) => void;
};

function FoodSkeleton() {
  return (
    <div className="border-hairline bg-surface-card animate-pulse rounded-lg border p-4">
      <div className="bg-surface-elevated h-5 w-2/3 rounded" />
      <div className="bg-surface-elevated mt-3 h-4 w-1/2 rounded" />
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`macro-skeleton-${index}`}
            className="bg-surface-elevated h-12 rounded-md"
          />
        ))}
      </div>
    </div>
  );
}

export function FoodGrid({ items, loading, onSelect }: FoodGridProps) {
  if (!loading && items.length === 0) {
    return (
      <div className="border-hairline bg-surface-card text-muted rounded-lg border p-10 text-center">
        <p className="text-title-sm text-on-dark font-semibold">
          Aucun aliment trouvé
        </p>
        <p className="text-body-md mt-2">
          Essayez une autre recherche, scannez un code-barres ou créez un aliment
          custom.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => (
            <FoodSkeleton key={`skeleton-${index}`} />
          ))
        : items.map((food, index) => (
            <FoodCard
              key={food.id}
              food={food}
              index={index}
              onSelect={onSelect}
            />
          ))}
    </div>
  );
}
