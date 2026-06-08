"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FoodSearchPicker,
  type LogItemDraft,
} from "@/components/client/nutrition/food-search-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logMealRequest } from "@/lib/nutrition/client-api";

type MealLogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  mealId?: string | null;
  mealName?: string | null;
  onLogged: () => void;
};

export function MealLogDialog({
  open,
  onOpenChange,
  date,
  mealId,
  mealName,
  onLogged,
}: MealLogDialogProps) {
  const [items, setItems] = useState<LogItemDraft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setItems([]);
    }
  }, [open, mealId]);

  async function handleSubmit() {
    if (items.length === 0) {
      toast.error("Ajoutez au moins un aliment.");
      return;
    }

    setLoading(true);
    try {
      await logMealRequest({
        loggedDate: date,
        mealId: mealId ?? null,
        items: items.map((item) => ({
          itemType: item.itemType,
          foodId: item.foodId,
          recipeId: item.recipeId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      toast.success("Repas enregistré");
      onLogged();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface-card max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-on-dark">
            {mealName ? `Logger — ${mealName}` : "Logger un repas"}
          </DialogTitle>
        </DialogHeader>

        <FoodSearchPicker items={items} onChange={setItems} />

        <DialogFooter>
          <Button
            variant="outline"
            className="border-hairline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
            disabled={loading}
            onClick={() => void handleSubmit()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
