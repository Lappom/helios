"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  createEmptyIngredientRow,
  RecipeIngredientRow,
  type IngredientFormRow,
} from "@/components/coach/recipes/recipe-ingredient-row";
import { RecipeInstructionsEditor } from "@/components/coach/recipes/recipe-instructions-editor";
import { RecipeMacroPanel } from "@/components/coach/recipes/recipe-macro-panel";
import { RecipeScalePanel } from "@/components/coach/recipes/recipe-scale-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeRecipeMacros,
  scaleRecipeIngredients,
} from "@/lib/recipes/macros";
import type { RecipeDetail, RecipeMacros } from "@/lib/recipes/types";

type RecipeEditorClientProps = {
  recipe?: RecipeDetail;
};

function mapDetailIngredients(recipe: RecipeDetail): IngredientFormRow[] {
  return recipe.ingredients.map((ingredient) => ({
    clientId: ingredient.id,
    foodId: ingredient.foodId,
    foodName: ingredient.foodName,
    foodBrand: ingredient.foodBrand,
    servingUnit: "g",
    per100g: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    quantity: ingredient.quantity,
    unit: ingredient.unit,
  }));
}

async function hydrateIngredientFoods(
  rows: IngredientFormRow[],
): Promise<IngredientFormRow[]> {
  const hydrated = await Promise.all(
    rows.map(async (row) => {
      if (!row.foodId) return row;

      try {
        const response = await fetch(`/api/v1/foods/${row.foodId}`);
        if (!response.ok) return row;
        const food = await response.json();
        return {
          ...row,
          foodName: food.name,
          foodBrand: food.brand,
          servingUnit: food.servingUnit,
          per100g: food.per100g,
        };
      } catch {
        return row;
      }
    }),
  );

  return hydrated;
}

export function RecipeEditorClient({ recipe }: RecipeEditorClientProps) {
  const router = useRouter();
  const isNew = !recipe;

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    recipe?.prepTimeMinutes?.toString() ?? "",
  );
  const [cookTimeMinutes, setCookTimeMinutes] = useState(
    recipe?.cookTimeMinutes?.toString() ?? "",
  );
  const [instructions, setInstructions] = useState<string[]>(
    recipe?.instructions ?? [],
  );
  const [ingredients, setIngredients] = useState<IngredientFormRow[]>(
    recipe ? mapDetailIngredients(recipe) : [createEmptyIngredientRow()],
  );
  const [scaleFactor, setScaleFactor] = useState(1);
  const [scaledMacros, setScaledMacros] = useState<RecipeMacros | null>(null);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(isNew);
  const scaleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!recipe) return;

    const currentRecipe = recipe;

    async function hydrate() {
      const rows = await hydrateIngredientFoods(mapDetailIngredients(currentRecipe));
      setIngredients(rows);
      setHydrated(true);
    }

    void hydrate();
  }, [recipe]);

  const validIngredients = useMemo(
    () => ingredients.filter((row) => row.foodId && row.quantity > 0),
    [ingredients],
  );

  const liveMacros = useMemo(() => {
    if (validIngredients.length === 0) return null;

    try {
      return computeRecipeMacros(
        validIngredients.map((row) => ({
          foodId: row.foodId,
          quantity: row.quantity,
          unit: row.unit,
          food: {
            per100g: row.per100g,
            servingSize: 100,
            servingUnit: row.servingUnit,
          },
        })),
        servings,
      );
    } catch {
      return null;
    }
  }, [validIngredients, servings]);

  useEffect(() => {
    if (scaleFactor === 1) {
      setScaledMacros(liveMacros?.perServing ?? null);
      return;
    }

    if (validIngredients.length === 0) {
      setScaledMacros(null);
      return;
    }

    if (recipe?.id) {
      if (scaleDebounceRef.current) {
        clearTimeout(scaleDebounceRef.current);
      }

      scaleDebounceRef.current = setTimeout(async () => {
        setScaleLoading(true);
        try {
          const response = await fetch(
            `/api/v1/recipes/${recipe.id}/scale`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scaleFactor }),
            },
          );
          const payload = await response.json();
          if (response.ok) {
            setScaledMacros(payload.macros.perServing);
          }
        } finally {
          setScaleLoading(false);
        }
      }, 300);

      return;
    }

    try {
      const scaled = scaleRecipeIngredients(
        validIngredients.map((row) => ({
          foodId: row.foodId,
          quantity: row.quantity,
          unit: row.unit,
        })),
        scaleFactor,
      );

      const macros = computeRecipeMacros(
        scaled.map((item, index) => ({
          ...item,
          food: {
            per100g: validIngredients[index]!.per100g,
            servingSize: 100,
            servingUnit: validIngredients[index]!.servingUnit,
          },
        })),
        servings,
      );

      setScaledMacros(macros.perServing);
    } catch {
      setScaledMacros(null);
    }
  }, [scaleFactor, validIngredients, servings, liveMacros, recipe?.id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Le nom de la recette est requis.");
      return;
    }

    if (validIngredients.length === 0) {
      toast.error("Ajoutez au moins un ingrédient valide.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      servings,
      prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : null,
      cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : null,
      instructions: instructions.filter((step) => step.trim()),
      ingredients: validIngredients.map((row, index) => ({
        foodId: row.foodId,
        quantity: row.quantity,
        unit: row.unit,
        sortOrder: index,
      })),
    };

    setSaving(true);
    try {
      const response = await fetch(
        isNew ? "/api/v1/recipes" : `/api/v1/recipes/${recipe!.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.detail ?? "Enregistrement impossible.");
        return;
      }

      toast.success(isNew ? "Recette créée." : "Recette mise à jour.");
      router.push(`/coach/nutrition/recipes/${result.id}/edit`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(index: number, row: IngredientFormRow) {
    setIngredients((prev) => prev.map((item, i) => (i === index ? row : item)));
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="outline" type="button">
          <Link href="/coach/nutrition/recipes">
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </Button>
        <Button type="submit" disabled={saving || (!isNew && !hydrated)}>
          <Save className="size-4" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
            <h2 className="text-title-md text-on-dark font-semibold">
              Informations
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-caption-uppercase text-muted mb-2 block">
                  Nom
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex. Poulet riz brocoli"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-caption-uppercase text-muted mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Courte description optionnelle…"
                  className="border-hairline bg-surface-elevated text-body-md text-on-dark placeholder:text-muted w-full resize-y rounded-md border px-3 py-2 outline-none focus:border-hairline-strong"
                />
              </div>
              <div>
                <label className="text-caption-uppercase text-muted mb-2 block">
                  Portions
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={servings}
                  onChange={(event) =>
                    setServings(Number(event.target.value) || 1)
                  }
                />
              </div>
              <div>
                <label className="text-caption-uppercase text-muted mb-2 block">
                  Préparation (min)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={prepTimeMinutes}
                  onChange={(event) => setPrepTimeMinutes(event.target.value)}
                />
              </div>
              <div>
                <label className="text-caption-uppercase text-muted mb-2 block">
                  Cuisson (min)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={cookTimeMinutes}
                  onChange={(event) => setCookTimeMinutes(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-title-md text-on-dark font-semibold">
                Ingrédients
              </h2>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setIngredients((prev) => [...prev, createEmptyIngredientRow()])
                }
              >
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
            <div className="space-y-3">
              {ingredients.map((row, index) => (
                <RecipeIngredientRow
                  key={row.clientId}
                  row={row}
                  index={index}
                  total={ingredients.length}
                  onChange={(next) => updateIngredient(index, next)}
                  onRemove={() =>
                    setIngredients((prev) =>
                      prev.filter((_, i) => i !== index),
                    )
                  }
                  onMoveUp={() =>
                    setIngredients((prev) => {
                      if (index === 0) return prev;
                      const next = [...prev];
                      [next[index - 1], next[index]] = [
                        next[index]!,
                        next[index - 1]!,
                      ];
                      return next;
                    })
                  }
                  onMoveDown={() =>
                    setIngredients((prev) => {
                      if (index >= prev.length - 1) return prev;
                      const next = [...prev];
                      [next[index], next[index + 1]] = [
                        next[index + 1]!,
                        next[index]!,
                      ];
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
            <h2 className="text-title-md text-on-dark font-semibold">
              Étapes
            </h2>
            <RecipeInstructionsEditor
              steps={instructions}
              onChange={setInstructions}
            />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <div className="border-hairline bg-surface-card rounded-lg border p-4">
            {liveMacros ? (
              <RecipeMacroPanel macros={liveMacros.perServing} />
            ) : (
              <p className="text-body-sm text-muted">
                Les macros s&apos;affichent lorsque les ingrédients sont
                renseignés.
              </p>
            )}
            {liveMacros ? (
              <div className="border-hairline mt-4 border-t pt-4">
                <p className="text-caption-uppercase text-muted mb-2">
                  Total recette
                </p>
                <p className="text-body-sm text-on-dark">
                  {Math.round(liveMacros.total.calories)} kcal · P{" "}
                  {liveMacros.total.proteinG}g · G {liveMacros.total.carbsG}g ·
                  L {liveMacros.total.fatG}g
                </p>
              </div>
            ) : null}
          </div>

          <RecipeScalePanel
            recipeId={recipe?.id}
            scaleFactor={scaleFactor}
            onScaleFactorChange={setScaleFactor}
            previewMacros={scaledMacros}
            loading={scaleLoading}
          />
        </aside>
      </div>
    </form>
  );
}
