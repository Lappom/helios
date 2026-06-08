"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecipeInstructionsEditorProps = {
  steps: string[];
  onChange: (steps: string[]) => void;
};

export function RecipeInstructionsEditor({
  steps,
  onChange,
}: RecipeInstructionsEditorProps) {
  function updateStep(index: number, value: string) {
    const next = [...steps];
    next[index] = value;
    onChange(next);
  }

  function addStep() {
    onChange([...steps, ""]);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <p className="text-body-sm text-muted">
          Aucune étape. Ajoutez les instructions de préparation.
        </p>
      ) : null}

      {steps.map((step, index) => (
        <div
          key={`step-${index}`}
          className="border-hairline bg-surface-elevated flex gap-2 rounded-lg border p-3"
        >
          <span className="text-primary text-title-sm mt-2 w-6 shrink-0 font-bold">
            {index + 1}.
          </span>
          <textarea
            value={step}
            onChange={(event) => updateStep(index, event.target.value)}
            rows={2}
            placeholder="Décrivez l'étape…"
            className="border-hairline bg-surface-card text-body-md text-on-dark placeholder:text-muted flex-1 resize-y rounded-md border px-3 py-2 outline-none focus:border-hairline-strong"
          />
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={index === 0}
              onClick={() => moveStep(index, -1)}
              aria-label="Monter l'étape"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={index >= steps.length - 1}
              onClick={() => moveStep(index, 1)}
              aria-label="Descendre l'étape"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeStep(index)}
              aria-label="Supprimer l'étape"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addStep}>
        <Plus className="size-4" />
        Ajouter une étape
      </Button>
    </div>
  );
}
