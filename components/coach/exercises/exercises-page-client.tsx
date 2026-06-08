"use client";

import { useCallback, useRef, useState } from "react";
import { ExerciseFiltersSidebar } from "@/components/coach/exercises/exercise-filters-sidebar";
import { ExerciseFormDialog } from "@/components/coach/exercises/exercise-form-dialog";
import { ExerciseGrid } from "@/components/coach/exercises/exercise-grid";
import { ExercisePreviewModal } from "@/components/coach/exercises/exercise-preview-modal";
import type { ExerciseCategoryItem, ExerciseListItem } from "@/lib/exercises/types";
import type { PlanTier } from "@/lib/auth/types";
import type {
  ExerciseSource,
  ExerciseType,
} from "@/lib/validators/exercises";

export type ExerciseFilters = {
  search: string;
  muscle?: string;
  equipment?: string;
  type?: ExerciseType;
  source?: ExerciseSource;
  categoryId?: string;
  favorite?: boolean;
};

type ExercisesPageClientProps = {
  initialItems: ExerciseListItem[];
  initialTotal: number;
  initialCategories: ExerciseCategoryItem[];
  planTier: PlanTier;
};

function buildQuery(filters: ExerciseFilters, page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "24");
  if (filters.search) params.set("search", filters.search);
  if (filters.muscle) params.set("muscle", filters.muscle);
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (filters.type) params.set("type", filters.type);
  if (filters.source) params.set("source", filters.source);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.favorite) params.set("favorite", "true");
  return params.toString();
}

export function ExercisesPageClient({
  initialItems,
  initialTotal,
  initialCategories,
  planTier,
}: ExercisesPageClientProps) {
  const [filters, setFilters] = useState<ExerciseFilters>({ search: "" });
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseListItem | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadExercises = useCallback(
    async (nextFilters: ExerciseFilters, nextPage: number) => {
      setLoading(true);
      try {
        const params = buildQuery(nextFilters, nextPage);
        const response = await fetch(`/api/v1/exercises?${params}`);
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
    },
    [],
  );

  function handleFiltersChange(next: ExerciseFilters) {
    setPage(1);
    setFilters(next);
    void loadExercises(next, 1);
  }

  function handleSearchChange(search: string) {
    const next = { ...filters, search };
    setFilters(next);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      void loadExercises(next, 1);
    }, 300);
  }

  function handleExerciseUpdated(exercise: ExerciseListItem) {
    setItems((prev) =>
      prev.map((item) => (item.id === exercise.id ? exercise : item)),
    );
    setSelectedExercise(exercise);
  }

  function handleExerciseCreated(exercise: ExerciseListItem) {
    setItems((prev) => [exercise, ...prev]);
    setTotal((prev) => prev + 1);
  }

  function handleOpenPreview(exercise: ExerciseListItem) {
    setSelectedExercise(exercise);
    setPreviewOpen(true);
  }

  async function refreshCategories() {
    const response = await fetch("/api/v1/exercise-categories");
    if (!response.ok) return;
    const payload = await response.json();
    setCategories(payload.items ?? []);
  }

  const totalPages = Math.max(1, Math.ceil(total / 24));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Exercices
          </h1>
          <p className="text-body-md text-muted mt-2">
            Catalogue système et bibliothèque custom — {total} exercices visibles.
          </p>
        </div>
        <ExerciseFormDialog
          planTier={planTier}
          categories={categories}
          onCreated={handleExerciseCreated}
          onCategoriesChange={refreshCategories}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ExerciseFiltersSidebar
          filters={filters}
          categories={categories}
          onChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
        />

        <div className="space-y-6">
          <ExerciseGrid
            items={items}
            loading={loading}
            onSelect={handleOpenPreview}
            onFavoriteToggle={handleExerciseUpdated}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const nextPage = Math.max(1, page - 1);
                    setPage(nextPage);
                    void loadExercises(filters, nextPage);
                  }}
                  className="border-hairline bg-surface-card text-on-dark rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    void loadExercises(filters, nextPage);
                  }}
                  className="border-hairline bg-surface-card text-on-dark rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ExercisePreviewModal
        exercise={selectedExercise}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        mode="coach"
        planTier={planTier}
        categories={categories}
        onUpdated={handleExerciseUpdated}
        onCategoriesChange={refreshCategories}
      />
    </div>
  );
}
