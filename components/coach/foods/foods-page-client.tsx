"use client";

import { useCallback, useRef, useState } from "react";
import { FoodFiltersSidebar } from "@/components/coach/foods/food-filters-sidebar";
import { FoodFormDialog } from "@/components/coach/foods/food-form-dialog";
import { FoodGrid } from "@/components/coach/foods/food-grid";
import { FoodPreviewModal } from "@/components/coach/foods/food-preview-modal";
import { FoodSearchBar } from "@/components/coach/foods/food-search-bar";
import { Button } from "@/components/ui/button";
import type { FoodListItem } from "@/lib/foods/types";
import type { FoodSource } from "@/lib/validators/foods";

export type FoodFilters = {
  search: string;
  source?: FoodSource;
};

type FoodsPageClientProps = {
  initialItems: FoodListItem[];
  initialTotal: number;
};

function buildQuery(filters: FoodFilters, page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "24");
  if (filters.search) params.set("q", filters.search);
  if (filters.source) params.set("source", filters.source);
  return params.toString();
}

export function FoodsPageClient({
  initialItems,
  initialTotal,
}: FoodsPageClientProps) {
  const [filters, setFilters] = useState<FoodFilters>({ search: "" });
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedFood, setSelectedFood] = useState<FoodListItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFoods = useCallback(async (nextFilters: FoodFilters, nextPage: number) => {
    setLoading(true);
    try {
      const params = buildQuery(nextFilters, nextPage);
      const response = await fetch(`/api/v1/foods/search?${params}`);
      const payload = await response.json();
      if (!response.ok) return;
      setItems(payload.items ?? []);
      setTotal(
        Number(
          response.headers.get("X-Total-Count") ?? payload.items?.length ?? 0,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFiltersChange(next: FoodFilters) {
    setPage(1);
    setFilters(next);
    void loadFoods(next, 1);
  }

  function handleSearchChange(search: string) {
    const next = { ...filters, search };
    setFilters(next);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      void loadFoods(next, 1);
    }, 300);
  }

  function handleFoodUpdated(food: FoodListItem) {
    setItems((prev) => prev.map((item) => (item.id === food.id ? food : item)));
    setSelectedFood(food);
  }

  function handleFoodCreated(food: FoodListItem) {
    setItems((prev) => [food, ...prev]);
    setTotal((prev) => prev + 1);
  }

  function handleOpenPreview(food: FoodListItem) {
    setSelectedFood(food);
    setPreviewOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / 24));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold tracking-tight">
            Bibliothèque d&apos;aliments
          </h2>
          <p className="text-body-md text-muted mt-2">
            Open Food Facts et aliments custom — {total} résultats visibles.
          </p>
        </div>
        <FoodFormDialog onCreated={handleFoodCreated} />
      </div>

      <FoodSearchBar onBarcodeFound={handleOpenPreview} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FoodFiltersSidebar
          filters={filters}
          onChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
        />

        <div className="space-y-6">
          <FoodGrid
            items={items}
            loading={loading}
            onSelect={handleOpenPreview}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const nextPage = page - 1;
                    setPage(nextPage);
                    void loadFoods(filters, nextPage);
                  }}
                >
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    void loadFoods(filters, nextPage);
                  }}
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <FoodPreviewModal
        food={selectedFood}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUpdated={handleFoodUpdated}
      />
    </div>
  );
}
