"use client";

import { useDraggable } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { ExerciseListItem } from "@/lib/exercises/types";
import { cn } from "@/lib/utils";

export const PALETTE_EXERCISE_PREFIX = "palette-exercise:";

type ProgramExercisePaletteProps = {
  disabled?: boolean;
};

export function ProgramExercisePalette({ disabled }: ProgramExercisePaletteProps) {
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "30" });
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/v1/exercises?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const payload = await response.json();
          setExercises(payload.items ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  return (
    <div className="border-hairline bg-surface-card flex h-full flex-col rounded-lg border">
      <div className="border-hairline border-b p-4">
        <h2 className="text-title-sm text-on-dark font-semibold">
          Bibliothèque
        </h2>
        <p className="text-muted mt-1 text-xs">
          Glissez un exercice vers la séance.
        </p>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher…"
          className="border-hairline bg-surface-elevated mt-3"
          disabled={disabled}
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <p className="text-muted text-xs">Chargement…</p>
        ) : exercises.length === 0 ? (
          <p className="text-muted text-xs">Aucun exercice trouvé.</p>
        ) : (
          exercises.map((exercise) => (
            <PaletteExerciseItem
              key={exercise.id}
              exercise={exercise}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PaletteExerciseItem({
  exercise,
  disabled,
}: {
  exercise: ExerciseListItem;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_EXERCISE_PREFIX}${exercise.id}`,
    data: { exerciseId: exercise.id, exerciseName: exercise.name },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      className={cn(
        "border-hairline bg-surface-elevated w-full rounded-md border px-3 py-2 text-left transition-colors",
        !disabled && "hover:border-primary/30 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      {...listeners}
      {...attributes}
    >
      <p className="text-on-dark text-sm font-medium">{exercise.name}</p>
      <p className="text-muted mt-0.5 text-xs">
        {exercise.muscleGroups.slice(0, 2).join(", ") || exercise.type}
      </p>
    </button>
  );
}
