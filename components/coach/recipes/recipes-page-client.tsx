"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { RecipeGrid } from "@/components/coach/recipes/recipe-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RecipeListItem } from "@/lib/recipes/types";

type RecipesPageClientProps = {
  initialItems: RecipeListItem[];
  initialTotal: number;
};

function buildQuery(search: string, page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "24");
  if (search) params.set("q", search);
  return params.toString();
}

export function RecipesPageClient({
  initialItems,
  initialTotal,
}: RecipesPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecipes = useCallback(async (nextSearch: string, nextPage: number) => {
    setLoading(true);
    try {
      const params = buildQuery(nextSearch, nextPage);
      const response = await fetch(`/api/v1/recipes?${params}`);
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

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      void loadRecipes(value, 1);
    }, 300);
  }

  function handleSelect(recipe: RecipeListItem) {
    router.push(`/coach/nutrition/recipes/${recipe.id}/edit`);
  }

  const totalPages = Math.max(1, Math.ceil(total / 24));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold tracking-tight">
            Bibliothèque de recettes
          </h2>
          <p className="text-body-md text-muted mt-2">
            Recettes custom avec macros calculées — {total} résultat
            {total > 1 ? "s" : ""}.
          </p>
        </div>
        <Button asChild>
          <Link href="/coach/nutrition/recipes/new">
            <Plus className="size-4" />
            Nouvelle recette
          </Link>
        </Button>
      </div>

      <div className="border-hairline bg-surface-card flex items-center gap-3 rounded-lg border p-4">
        <Search className="text-muted size-4 shrink-0" />
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Rechercher une recette…"
          className="flex-1"
        />
      </div>

      <RecipeGrid items={items} loading={loading} onSelect={handleSelect} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => {
              const nextPage = page - 1;
              setPage(nextPage);
              void loadRecipes(search, nextPage);
            }}
          >
            Précédent
          </Button>
          <span className="text-body-sm text-muted">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              void loadRecipes(search, nextPage);
            }}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </div>
  );
}
