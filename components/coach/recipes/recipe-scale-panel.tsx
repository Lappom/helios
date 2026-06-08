"use client";

import { useEffect, useState } from "react";
import { RecipeMacroPanel } from "@/components/coach/recipes/recipe-macro-panel";
import type { RecipeMacros } from "@/lib/recipes/types";

type RecipeScalePanelProps = {
  recipeId?: string;
  scaleFactor: number;
  onScaleFactorChange: (value: number) => void;
  previewMacros: RecipeMacros | null;
  loading?: boolean;
};

export function RecipeScalePanel({
  recipeId,
  scaleFactor,
  onScaleFactorChange,
  previewMacros,
  loading,
}: RecipeScalePanelProps) {
  const [localFactor, setLocalFactor] = useState(scaleFactor);

  useEffect(() => {
    setLocalFactor(scaleFactor);
  }, [scaleFactor]);

  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-title-sm text-on-dark font-semibold">
          Ajustement portions
        </p>
        <p className="text-body-sm text-muted mt-1">
          Prévisualisez les macros avec un facteur d&apos;échelle
          {recipeId ? " (via API)" : ""}.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-caption-uppercase text-muted">Facteur</span>
          <span className="text-title-sm text-primary font-bold">
            ×{localFactor.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={localFactor}
          onChange={(event) => {
            const value = Number(event.target.value);
            setLocalFactor(value);
            onScaleFactorChange(value);
          }}
          className="accent-primary w-full"
        />
        <div className="text-caption text-muted flex justify-between">
          <span>×0.5</span>
          <span>×2</span>
        </div>
      </div>

      {loading ? (
        <p className="text-body-sm text-muted">Calcul en cours…</p>
      ) : previewMacros ? (
        <RecipeMacroPanel
          macros={previewMacros}
          label={`par portion (×${localFactor.toFixed(1)})`}
        />
      ) : (
        <p className="text-body-sm text-muted">
          Ajoutez des ingrédients pour prévisualiser l&apos;échelle.
        </p>
      )}
    </div>
  );
}
