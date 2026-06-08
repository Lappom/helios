"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createVideoCategory,
  deleteVideoCategory,
  reorderVideoCategories,
  updateVideoCategory,
} from "@/lib/videos/api-client";
import type { VideoCategoryItem } from "@/lib/videos/types";

type VideoCategoryPanelProps = {
  categories: VideoCategoryItem[];
  selectedCategoryId: string | null | undefined;
  onSelectCategory: (categoryId: string | null | undefined) => void;
  onCategoriesChange: () => void;
};

export function VideoCategoryPanel({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
}: VideoCategoryPanelProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      return;
    }

    setLoading(true);
    try {
      await createVideoCategory({ name: newName.trim() });
      setNewName("");
      onCategoriesChange();
      toast.success("Catégorie créée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(category: VideoCategoryItem) {
    const nextName = window.prompt("Nouveau nom", category.name);
    if (!nextName?.trim() || nextName.trim() === category.name) {
      return;
    }

    setLoading(true);
    try {
      await updateVideoCategory(category.id, { name: nextName.trim() });
      onCategoriesChange();
      toast.success("Catégorie renommée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(category: VideoCategoryItem) {
    if (
      !window.confirm(
        `Supprimer la catégorie « ${category.name} » ? Les vidéos resteront sans catégorie.`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await deleteVideoCategory(category.id);
      if (selectedCategoryId === category.id) {
        onSelectCategory(undefined);
      }
      onCategoriesChange();
      toast.success("Catégorie supprimée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(categoryId: string, direction: "up" | "down") {
    const index = categories.findIndex((item) => item.id === categoryId);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const nextOrder = [...categories];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);

    setLoading(true);
    try {
      await reorderVideoCategories(nextOrder.map((item) => item.id));
      onCategoriesChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Réordonnancement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="border-hairline bg-surface-card space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-caption-uppercase text-muted tracking-widest uppercase">
          Catégories
        </p>
        <h2 className="text-title-sm text-on-dark mt-1 font-semibold">
          Organisation
        </h2>
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nouvelle catégorie"
          disabled={loading}
        />
        <Button
          type="button"
          size="icon"
          disabled={loading || !newName.trim()}
          onClick={handleCreate}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onSelectCategory(undefined)}
          className={cn(
            "text-body-sm w-full rounded-md px-3 py-2 text-left font-medium transition-colors",
            selectedCategoryId === undefined
              ? "bg-surface-elevated text-primary"
              : "text-muted hover:bg-surface-elevated hover:text-on-dark",
          )}
        >
          Toutes les vidéos
        </button>
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            "text-body-sm w-full rounded-md px-3 py-2 text-left font-medium transition-colors",
            selectedCategoryId === null
              ? "bg-surface-elevated text-primary"
              : "text-muted hover:bg-surface-elevated hover:text-on-dark",
          )}
        >
          Sans catégorie
        </button>

        {categories.map((category, index) => (
          <div
            key={category.id}
            className={cn(
              "border-hairline flex items-center gap-1 rounded-md border px-1",
              selectedCategoryId === category.id && "border-primary/40",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "text-body-sm min-w-0 flex-1 truncate px-2 py-2 text-left font-medium",
                selectedCategoryId === category.id
                  ? "text-primary"
                  : "text-on-dark",
              )}
            >
              {category.name}
              <span className="text-muted ml-1 text-xs">
                ({category.videoCount})
              </span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={loading || index === 0}
              onClick={() => handleMove(category.id, "up")}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={loading || index === categories.length - 1}
              onClick={() => handleMove(category.id, "down")}
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={loading}
              onClick={() => handleRename(category)}
            >
              ✎
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={loading}
              onClick={() => handleDelete(category)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </aside>
  );
}
