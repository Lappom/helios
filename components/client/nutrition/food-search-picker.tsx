"use client";

import { Barcode, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodListItem } from "@/lib/foods/types";

export type LogItemDraft = {
  itemType: "food" | "recipe";
  foodId?: string;
  recipeId?: string;
  foodName: string;
  quantity: number;
  unit: string;
};

type FoodSearchPickerProps = {
  items: LogItemDraft[];
  onChange: (items: LogItemDraft[]) => void;
};

export function FoodSearchPicker({ items, onChange }: FoodSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
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

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  function addFood(food: FoodListItem) {
    onChange([
      ...items,
      {
        itemType: "food",
        foodId: food.id,
        foodName: food.name,
        quantity: food.servingSize || 100,
        unit: food.servingUnit || "g",
      },
    ]);
    setQuery("");
    setOpen(false);
  }

  async function handleBarcodeScan() {
    if (!barcode.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/foods/barcode/${encodeURIComponent(barcode.trim())}`,
      );
      const payload = await response.json();
      if (response.ok && payload.food) {
        addFood(payload.food as FoodListItem);
        setBarcode("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted absolute top-3 left-3 size-4" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un aliment…"
          className="border-hairline bg-surface-elevated pl-10"
        />
        {open && results.length > 0 ? (
          <div className="border-hairline bg-surface-card absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                className="hover:bg-surface-elevated w-full px-3 py-2 text-left"
                onClick={() => addFood(food)}
              >
                <p className="text-on-dark text-sm">{food.name}</p>
                <p className="text-muted text-xs">
                  {food.per100g.calories} kcal / 100g
                </p>
              </button>
            ))}
          </div>
        ) : null}
        {loading ? (
          <p className="text-muted mt-2 text-xs">Recherche…</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="Code-barres"
          className="border-hairline bg-surface-elevated"
        />
        <Button
          type="button"
          variant="outline"
          className="border-hairline shrink-0"
          onClick={() => void handleBarcodeScan()}
        >
          <Barcode className="size-4" />
        </Button>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.foodId ?? item.recipeId}-${index}`}
              className="border-hairline bg-surface-elevated flex items-center gap-2 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-on-dark text-sm font-medium">
                  {item.foodName}
                </p>
              </div>
              <Input
                type="number"
                value={item.quantity}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = {
                    ...item,
                    quantity: Number(event.target.value),
                  };
                  onChange(next);
                }}
                className="border-hairline bg-surface-card h-9 w-20"
              />
              <Input
                value={item.unit}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = {
                    ...item,
                    unit: event.target.value,
                  };
                  onChange(next);
                }}
                className="border-hairline bg-surface-card h-9 w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange(items.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
