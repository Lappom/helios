"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NutritionItemPalette } from "@/components/coach/nutrition/nutrition-item-palette";
import {
  PALETTE_FOOD_PREFIX,
  PALETTE_RECIPE_PREFIX,
} from "@/components/coach/nutrition/nutrition-item-palette";
import { MEAL_ITEM_SORTABLE_PREFIX } from "@/components/coach/nutrition/nutrition-meal-card";
import { NutritionMacroHeader } from "@/components/coach/nutrition/nutrition-macro-header";
import { NutritionMealsCanvas } from "@/components/coach/nutrition/nutrition-meals-canvas";
import { NutritionPublishBar } from "@/components/coach/nutrition/nutrition-publish-bar";
import {
  createMealItemRequest,
  createMealRequest,
  deleteMealItemRequest,
  deleteMealRequest,
  patchMealItemRequest,
  patchMealRequest,
  patchNutritionPlanRequest,
  reorderMealItemsRequest,
  reorderMealsRequest,
} from "@/lib/nutrition/api-client";
import type { NutritionPlanTree } from "@/lib/nutrition/types";
import type { FoodListItem } from "@/lib/foods/types";
import type { RecipeListItem } from "@/lib/recipes/types";

type NutritionPlanEditorClientProps = {
  initialPlan: NutritionPlanTree;
};

export function NutritionPlanEditorClient({
  initialPlan,
}: NutritionPlanEditorClientProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [saving, setSaving] = useState(false);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [activeMealId, setActiveMealId] = useState(
    initialPlan.meals[0]?.id ?? "",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const isLocked = plan.status !== "draft";

  async function mutate(
    action: () => Promise<NutritionPlanTree>,
    successMessage?: string,
  ) {
    setSaving(true);
    try {
      const updated = await action();
      setPlan(updated);
      if (!updated.meals.some((meal) => meal.id === activeMealId)) {
        setActiveMealId(updated.meals[0]?.id ?? "");
      }
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const mealIds = useMemo(() => plan.meals.map((meal) => meal.id), [plan.meals]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragLabel(null);

    if (!over || active.id === over.id || isLocked) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (
      activeId.startsWith(PALETTE_FOOD_PREFIX) ||
      activeId.startsWith(PALETTE_RECIPE_PREFIX)
    ) {
      const targetMealId = overId.startsWith(MEAL_ITEM_SORTABLE_PREFIX)
        ? plan.meals.find((meal) =>
            meal.items.some(
              (item) =>
                `${MEAL_ITEM_SORTABLE_PREFIX}${item.id}` === overId,
            ),
          )?.id
        : mealIds.includes(overId)
          ? overId
          : activeMealId;

      if (!targetMealId) {
        return;
      }

      if (activeId.startsWith(PALETTE_FOOD_PREFIX)) {
        const foodId = activeId.replace(PALETTE_FOOD_PREFIX, "");
        await mutate(() =>
          createMealItemRequest(plan.id, targetMealId, {
            itemType: "food",
            foodId,
            quantity: 100,
            unit: "g",
          }),
        );
        return;
      }

      const recipeId = activeId.replace(PALETTE_RECIPE_PREFIX, "");
      await mutate(() =>
        createMealItemRequest(plan.id, targetMealId, {
          itemType: "recipe",
          recipeId,
          quantity: 1,
          unit: "portion",
        }),
      );
      return;
    }

    if (mealIds.includes(activeId) && mealIds.includes(overId)) {
      const oldIndex = mealIds.indexOf(activeId);
      const newIndex = mealIds.indexOf(overId);
      const reordered = arrayMove(mealIds, oldIndex, newIndex);
      await mutate(() => reorderMealsRequest(plan.id, reordered));
      return;
    }

    if (
      activeId.startsWith(MEAL_ITEM_SORTABLE_PREFIX) &&
      overId.startsWith(MEAL_ITEM_SORTABLE_PREFIX)
    ) {
      const activeItemId = activeId.replace(MEAL_ITEM_SORTABLE_PREFIX, "");
      const overItemId = overId.replace(MEAL_ITEM_SORTABLE_PREFIX, "");

      const meal = plan.meals.find((entry) =>
        entry.items.some((item) => item.id === activeItemId),
      );

      if (!meal) {
        return;
      }

      const itemIds = meal.items.map((item) => item.id);
      const oldIndex = itemIds.indexOf(activeItemId);
      const newIndex = itemIds.indexOf(overItemId);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = arrayMove(itemIds, oldIndex, newIndex);
      await mutate(() =>
        reorderMealItemsRequest(plan.id, meal.id, reordered),
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith(PALETTE_FOOD_PREFIX)) {
      setActiveDragLabel("Aliment");
      return;
    }
    if (id.startsWith(PALETTE_RECIPE_PREFIX)) {
      setActiveDragLabel("Recette");
      return;
    }
    setActiveDragLabel("Élément");
  }

  async function handleTargetsChange(
    targets: Partial<{
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }>,
  ) {
    const payload: Record<string, number> = {};
    if (targets.calories !== undefined) {
      payload.targetCalories = targets.calories;
    }
    if (targets.proteinG !== undefined) {
      payload.targetProteinG = targets.proteinG;
    }
    if (targets.carbsG !== undefined) {
      payload.targetCarbsG = targets.carbsG;
    }
    if (targets.fatG !== undefined) {
      payload.targetFatG = targets.fatG;
    }

    await mutate(() => patchNutritionPlanRequest(plan.id, payload));
  }

  async function addFoodToActiveMeal(food: FoodListItem) {
    if (!activeMealId) {
      toast.error("Ajoutez d'abord un repas.");
      return;
    }

    await mutate(() =>
      createMealItemRequest(plan.id, activeMealId, {
        itemType: "food",
        foodId: food.id,
        quantity: food.servingSize || 100,
        unit: food.servingUnit || "g",
      }),
    );
  }

  async function addRecipeToActiveMeal(recipe: RecipeListItem) {
    if (!activeMealId) {
      toast.error("Ajoutez d'abord un repas.");
      return;
    }

    await mutate(() =>
      createMealItemRequest(plan.id, activeMealId, {
        itemType: "recipe",
        recipeId: recipe.id,
        quantity: 1,
        unit: "portion",
      }),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <NutritionPublishBar
        plan={plan}
        onPlanChange={setPlan}
        saving={saving}
      />

      <NutritionMacroHeader
        plan={plan}
        disabled={isLocked || saving}
        onTargetsChange={(targets) => void handleTargetsChange(targets)}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <SortableContext
          items={mealIds}
          strategy={verticalListSortingStrategy}
        >
          <NutritionMealsCanvas
            meals={plan.meals}
            disabled={isLocked || saving}
            onAddMeal={() =>
              mutate(() => createMealRequest(plan.id), "Repas ajouté")
            }
            onPatchMeal={(mealId, input) =>
              mutate(() => patchMealRequest(plan.id, mealId, input))
            }
            onDeleteMeal={(mealId) =>
              mutate(
                () => deleteMealRequest(plan.id, mealId),
                "Repas supprimé",
              )
            }
            onDeleteItem={(mealId, itemId) =>
              mutate(() =>
                deleteMealItemRequest(plan.id, mealId, itemId),
              )
            }
            onPatchItem={(mealId, itemId, input) =>
              mutate(() =>
                patchMealItemRequest(plan.id, mealId, itemId, input),
              )
            }
          />
        </SortableContext>

        <NutritionItemPalette
          disabled={isLocked || saving}
          onAddFood={(food) => void addFoodToActiveMeal(food)}
          onAddRecipe={(recipe) => void addRecipeToActiveMeal(recipe)}
        />
      </div>

      <DragOverlay>
        {activeDragLabel ? (
          <div className="border-hairline bg-surface-card text-on-dark rounded-md border px-4 py-2 text-sm font-medium shadow-none">
            {activeDragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
