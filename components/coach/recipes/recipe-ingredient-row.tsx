"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodListItem } from "@/lib/foods/types";
import type { MacrosPer100g } from "@/lib/foods/types";

export type IngredientFormRow = {
  clientId: string;
  foodId: string;
  foodName: string;
  foodBrand: string | null;
  servingUnit: string;
  per100g: MacrosPer100g;
  quantity: number;
  unit: string;
};

type RecipeIngredientRowProps = {
  row: IngredientFormRow;
  index: number;
  total: number;
  onChange: (row: IngredientFormRow) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function RecipeIngredientRow({
  row,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RecipeIngredientRowProps) {
  const [query, setQuery] = useState(row.foodName);
  const [results, setResults] = useState<FoodListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(row.foodName);
  }, [row.foodName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function searchFoods(term: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (term.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: term.trim(),
          limit: "8",
          page: "1",
        });
        const response = await fetch(`/api/v1/foods/search?${params}`);
        const payload = await response.json();
        if (response.ok) {
          setResults(payload.items ?? []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function handleSelectFood(food: FoodListItem) {
    onChange({
      ...row,
      foodId: food.id,
      foodName: food.name,
      foodBrand: food.brand,
      servingUnit: food.servingUnit,
      per100g: food.per100g,
      unit: row.unit || "g",
    });
    setQuery(food.name);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="border-hairline bg-surface-elevated grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_100px_80px_auto]"
    >
      <div className="relative min-w-0">
        <Input
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            searchFoods(value);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Rechercher un aliment…"
        />
        {open && results.length > 0 ? (
          <div className="border-hairline bg-surface-card absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border shadow-none">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                className="hover:bg-surface-elevated w-full px-3 py-2 text-left"
                onClick={() => handleSelectFood(food)}
              >
                <p className="text-body-sm text-on-dark font-medium">
                  {food.name}
                </p>
                {food.brand ? (
                  <p className="text-caption text-muted">{food.brand}</p>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        {loading ? (
          <p className="text-caption text-muted mt-1">Recherche…</p>
        ) : null}
        {row.foodBrand ? (
          <p className="text-caption text-muted mt-1 truncate">{row.foodBrand}</p>
        ) : null}
      </div>

      <Input
        type="number"
        min={0.1}
        step={0.1}
        value={row.quantity}
        onChange={(event) =>
          onChange({ ...row, quantity: Number(event.target.value) || 0 })
        }
        placeholder="Qté"
      />

      <Input
        value={row.unit}
        onChange={(event) => onChange({ ...row, unit: event.target.value })}
        placeholder="g"
      />

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={index === 0}
          onClick={onMoveUp}
          aria-label="Monter"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={index >= total - 1}
          onClick={onMoveDown}
          aria-label="Descendre"
        >
          <ChevronDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          aria-label="Supprimer"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function createEmptyIngredientRow(): IngredientFormRow {
  return {
    clientId: crypto.randomUUID(),
    foodId: "",
    foodName: "",
    foodBrand: null,
    servingUnit: "g",
    per100g: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    quantity: 100,
    unit: "g",
  };
}
