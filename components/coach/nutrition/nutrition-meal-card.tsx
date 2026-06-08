"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MealDetail } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

export const MEAL_ITEM_SORTABLE_PREFIX = "meal-item:";

type NutritionMealCardProps = {
  meal: MealDetail;
  disabled?: boolean;
  onPatch: (input: { name?: string; timeSlot?: string | null }) => void;
  onDelete: () => void;
  onDeleteItem: (itemId: string) => void;
  onPatchItem: (
    itemId: string,
    input: { quantity?: number; unit?: string },
  ) => void;
  children?: React.ReactNode;
};

function SortableMealItemRow({
  item,
  disabled,
  onDelete,
  onPatch,
}: {
  item: MealDetail["items"][number];
  disabled?: boolean;
  onDelete: () => void;
  onPatch: (input: { quantity?: number; unit?: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `${MEAL_ITEM_SORTABLE_PREFIX}${item.id}`,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label =
    item.itemType === "food"
      ? item.foodName
      : item.recipeName ?? "Recette";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-hairline bg-surface-elevated flex flex-wrap items-center gap-3 rounded-md border p-3"
    >
      <button
        type="button"
        className="text-muted hover:text-on-dark"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-on-dark text-sm font-medium">{label}</p>
        <p className="text-muted text-xs">
          {Math.round(item.macros.calories)} kcal · P {item.macros.proteinG} · G{" "}
          {item.macros.carbsG} · L {item.macros.fatG}
        </p>
      </div>
      <Input
        type="number"
        disabled={disabled}
        value={item.quantity}
        onChange={(event) =>
          onPatch({ quantity: Number(event.target.value) })
        }
        className="border-hairline bg-surface-card h-9 w-20"
      />
      <Input
        disabled={disabled}
        value={item.unit}
        onChange={(event) => onPatch({ unit: event.target.value })}
        className="border-hairline bg-surface-card h-9 w-20"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function NutritionMealCard({
  meal,
  disabled,
  onPatch,
  onDelete,
  onDeleteItem,
  onPatchItem,
  children,
}: NutritionMealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: meal.id,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-hairline bg-surface-card rounded-lg border p-4"
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <button
          type="button"
          className="text-muted hover:text-on-dark mt-2"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Input
            disabled={disabled}
            value={meal.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            className="border-hairline bg-surface-elevated"
          />
          <Input
            disabled={disabled}
            value={meal.timeSlot ?? ""}
            placeholder="08:00"
            onChange={(event) =>
              onPatch({ timeSlot: event.target.value || null })
            }
            className="border-hairline bg-surface-elevated"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-caption-uppercase text-muted">
          {Math.round(meal.macros.calories)} kcal planifiés
        </p>
      </div>

      <div className="space-y-2">
        {meal.items.map((item) => (
          <SortableMealItemRow
            key={item.id}
            item={item}
            disabled={disabled}
            onDelete={() => onDeleteItem(item.id)}
            onPatch={(input) => onPatchItem(item.id, input)}
          />
        ))}
      </div>

      {children}
    </div>
  );
}

export function MealDropZone({
  mealId,
  disabled,
  children,
}: {
  mealId: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-hairline mt-3 rounded-md border border-dashed p-3",
        disabled && "opacity-60",
      )}
      data-meal-drop={mealId}
    >
      {children}
    </div>
  );
}
