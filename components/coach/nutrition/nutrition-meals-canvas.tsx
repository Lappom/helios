"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  MEAL_ITEM_SORTABLE_PREFIX,
  NutritionMealCard,
} from "@/components/coach/nutrition/nutrition-meal-card";
import { Button } from "@/components/ui/button";
import type { MealDetail } from "@/lib/nutrition/types";

type NutritionMealsCanvasProps = {
  meals: MealDetail[];
  disabled?: boolean;
  onAddMeal: () => Promise<void>;
  onPatchMeal: (
    mealId: string,
    input: { name?: string; timeSlot?: string | null },
  ) => void;
  onDeleteMeal: (mealId: string) => void;
  onDeleteItem: (mealId: string, itemId: string) => void;
  onPatchItem: (
    mealId: string,
    itemId: string,
    input: { quantity?: number; unit?: string },
  ) => void;
};

export function NutritionMealsCanvas({
  meals,
  disabled,
  onAddMeal,
  onPatchMeal,
  onDeleteMeal,
  onDeleteItem,
  onPatchItem,
}: NutritionMealsCanvasProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-sm text-on-dark font-semibold">Repas</h2>
          <p className="text-muted text-xs">
            Réordonnez par glisser-déposer.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-hairline"
          disabled={disabled}
          onClick={() => void onAddMeal()}
        >
          <Plus className="mr-2 size-4" />
          Repas
        </Button>
      </div>

      <SortableContext
        items={meals.map((meal) => meal.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {meals.map((meal) => (
            <SortableContext
              key={meal.id}
              items={meal.items.map(
                (item) => `${MEAL_ITEM_SORTABLE_PREFIX}${item.id}`,
              )}
              strategy={verticalListSortingStrategy}
            >
              <NutritionMealCard
                meal={meal}
                disabled={disabled}
                onPatch={(input) => onPatchMeal(meal.id, input)}
                onDelete={() => onDeleteMeal(meal.id)}
                onDeleteItem={(itemId) => onDeleteItem(meal.id, itemId)}
                onPatchItem={(itemId, input) =>
                  onPatchItem(meal.id, itemId, input)
                }
              />
            </SortableContext>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
