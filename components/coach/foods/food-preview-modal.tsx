"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { FoodFormDialog } from "@/components/coach/foods/food-form-dialog";
import { FoodMacroPanel } from "@/components/coach/foods/food-macro-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FoodListItem } from "@/lib/foods/types";
import { cn } from "@/lib/utils";

type FoodPreviewModalProps = {
  food: FoodListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (food: FoodListItem) => void;
};

export function FoodPreviewModal({
  food,
  open,
  onOpenChange,
  onUpdated,
}: FoodPreviewModalProps) {
  const [mode, setMode] = useState<"per100g" | "portion">("per100g");
  const [servingSize, setServingSize] = useState(100);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (food) {
      setServingSize(food.servingSize);
      setMode("per100g");
    }
  }, [food]);

  if (!food) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-hairline bg-surface-card sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-title-lg text-on-dark font-bold">
                  {food.name}
                </DialogTitle>
                {food.brand ? (
                  <p className="text-body-md text-muted mt-1">{food.brand}</p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={
                  food.source === "custom"
                    ? "border-accent-emerald/40 text-accent-emerald"
                    : undefined
                }
              >
                {food.source === "off"
                  ? "Open Food Facts"
                  : food.source === "custom"
                    ? "Custom"
                    : food.source}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {food.barcode ? (
              <p className="text-body-sm text-muted">
                Code-barres : <span className="text-body-strong">{food.barcode}</span>
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "per100g" ? "default" : "outline"}
                onClick={() => setMode("per100g")}
                className={cn(
                  "transition-colors",
                  mode === "per100g" && "bg-primary text-on-primary",
                )}
              >
                100 g
              </Button>
              <Button
                type="button"
                variant={mode === "portion" ? "default" : "outline"}
                onClick={() => setMode("portion")}
                className={cn(
                  "transition-colors",
                  mode === "portion" && "bg-primary text-on-primary",
                )}
              >
                Portion
              </Button>
            </div>

            {mode === "portion" ? (
              <div className="flex items-center gap-3">
                <label className="text-body-sm text-body-strong shrink-0 font-medium">
                  Taille portion
                </label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={servingSize}
                  onChange={(event) =>
                    setServingSize(Number(event.target.value) || food.servingSize)
                  }
                  className="max-w-[120px]"
                />
                <span className="text-body-sm text-muted">{food.servingUnit}</span>
              </div>
            ) : null}

            <FoodMacroPanel food={food} mode={mode} servingSize={servingSize} />

            {food.source === "custom" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-2 size-4" />
                Modifier
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {food.source === "custom" ? (
        <FoodFormDialog
          food={food}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={(updated) => {
            onUpdated?.(updated);
            setServingSize(updated.servingSize);
          }}
        />
      ) : null}
    </>
  );
}
