"use client";

import type { MealDetail } from "@/lib/nutrition/types";

type PlannedMealsListProps = {
  meals: MealDetail[];
  onLogMeal?: (mealId: string) => void;
};

export function PlannedMealsList({
  meals,
  onLogMeal,
}: PlannedMealsListProps) {
  if (meals.length === 0) {
    return (
      <div className="border-hairline bg-surface-card rounded-lg border p-6">
        <p className="text-muted text-sm">Aucun repas planifié.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-title-md text-on-dark font-semibold">
        Repas planifiés
      </h2>
      {meals.map((meal) => (
        <article
          key={meal.id}
          className="border-hairline bg-surface-card rounded-lg border p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-caption-uppercase text-muted">
                {meal.timeSlot ?? "—"}
              </p>
              <h3 className="text-title-sm text-on-dark font-semibold">
                {meal.name}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-primary font-bold">
                {Math.round(meal.macros.calories)} kcal
              </p>
              <p className="text-muted text-xs">
                P {meal.macros.proteinG} · G {meal.macros.carbsG} · L{" "}
                {meal.macros.fatG}
              </p>
            </div>
          </div>

          {meal.items.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {meal.items.map((item) => (
                <li
                  key={item.id}
                  className="border-hairline bg-surface-elevated flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-on-dark">
                    {item.itemType === "food"
                      ? item.foodName
                      : item.recipeName}
                  </span>
                  <span className="text-muted">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {onLogMeal ? (
            <button
              type="button"
              className="text-primary mt-4 text-sm font-semibold hover:underline"
              onClick={() => onLogMeal(meal.id)}
            >
              Logger ce repas
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
