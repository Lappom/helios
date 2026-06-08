"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { computeCaloriesFromMacros } from "@/lib/foods/macros";
import type { FoodListItem } from "@/lib/foods/types";

type FoodFormDialogProps = {
  food?: FoodListItem;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (food: FoodListItem) => void;
  onUpdated?: (food: FoodListItem) => void;
};

export function FoodFormDialog({
  food,
  triggerLabel = "Créer un aliment",
  open: controlledOpen,
  onOpenChange,
  onCreated,
  onUpdated,
}: FoodFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: food?.name ?? "",
    brand: food?.brand ?? "",
    barcode: food?.barcode ?? "",
    servingSize: food?.servingSize ?? 100,
    servingUnit: food?.servingUnit ?? "g",
    calories: food?.per100g.calories ?? 0,
    proteinG: food?.per100g.proteinG ?? 0,
    carbsG: food?.per100g.carbsG ?? 0,
    fatG: food?.per100g.fatG ?? 0,
    fiberG: food?.per100g.fiberG ?? "",
    sugarG: food?.per100g.sugarG ?? "",
  });

  useEffect(() => {
    if (food) {
      setForm({
        name: food.name,
        brand: food.brand ?? "",
        barcode: food.barcode ?? "",
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.per100g.calories,
        proteinG: food.per100g.proteinG,
        carbsG: food.per100g.carbsG,
        fatG: food.per100g.fatG,
        fiberG: food.per100g.fiberG ?? "",
        sugarG: food.per100g.sugarG ?? "",
      });
    }
  }, [food]);

  const computedCalories = computeCaloriesFromMacros({
    calories: form.calories,
    proteinG: form.proteinG,
    carbsG: form.carbsG,
    fatG: form.fatG,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const payloadBody = {
        name: form.name,
        brand: form.brand || null,
        barcode: form.barcode || null,
        servingSize: form.servingSize,
        servingUnit: form.servingUnit,
        per100g: {
          calories: form.calories,
          proteinG: form.proteinG,
          carbsG: form.carbsG,
          fatG: form.fatG,
          fiberG: form.fiberG === "" ? null : Number(form.fiberG),
          sugarG: form.sugarG === "" ? null : Number(form.sugarG),
        },
      };

      const response = await fetch(
        food ? `/api/v1/foods/${food.id}` : "/api/v1/foods",
        {
          method: food ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBody),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.detail ?? "Impossible d'enregistrer l'aliment.");
        return;
      }

      toast.success(food ? "Aliment mis à jour." : "Aliment créé.");
      if (food) {
        onUpdated?.(payload);
      } else {
        onCreated?.(payload);
        setForm({
          name: "",
          brand: "",
          barcode: "",
          servingSize: 100,
          servingUnit: "g",
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          fiberG: "",
          sugarG: "",
        });
      }
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const dialogContent = (
    <DialogContent className="border-hairline bg-surface-card sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-title-lg text-on-dark font-bold">
          {food ? "Modifier l'aliment" : "Créer un aliment custom"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-body-sm text-body-strong font-medium">
              Nom
            </label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body-sm text-body-strong font-medium">
              Marque
            </label>
            <Input
              value={form.brand}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, brand: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-body-sm text-body-strong font-medium">
              Code-barres
            </label>
            <Input
              value={form.barcode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, barcode: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-body-sm text-body-strong font-medium">
              Portion
            </label>
            <Input
              type="number"
              min={1}
              value={form.servingSize}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  servingSize: Number(event.target.value) || 100,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-body-sm text-body-strong font-medium">
              Unité
            </label>
            <Input
              value={form.servingUnit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, servingUnit: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="border-hairline bg-surface-elevated space-y-3 rounded-lg border p-4">
          <p className="text-caption-uppercase text-muted">
            Macros pour 100 g
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["calories", "Calories (kcal)"],
                ["proteinG", "Protéines (g)"],
                ["carbsG", "Glucides (g)"],
                ["fatG", "Lipides (g)"],
                ["fiberG", "Fibres (g)"],
                ["sugarG", "Sucres (g)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-body-sm text-body-strong font-medium">
                  {label}
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form[key]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]:
                        key === "fiberG" || key === "sugarG"
                          ? event.target.value
                          : Number(event.target.value) || 0,
                    }))
                  }
                  required={key === "calories" || key === "proteinG" || key === "carbsG" || key === "fatG"}
                />
              </div>
            ))}
          </div>
          <p className="text-body-sm text-muted">
            Calcul théorique : {Math.round(computedCalories)} kcal (4P + 4C + 9F)
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : food ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (food) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
