"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExerciseListItem } from "@/lib/exercises/types";

type ProgramAlternativesPickerProps = {
  selectedIds: string[];
  disabled?: boolean;
  onSave: (exerciseIds: string[]) => void;
};

export function ProgramAlternativesPicker({
  selectedIds,
  disabled,
  onSave,
}: ProgramAlternativesPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExerciseListItem[]>([]);
  const [localIds, setLocalIds] = useState(selectedIds);

  useEffect(() => {
    setLocalIds(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams({ limit: "8" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/v1/exercises?${params.toString()}`, {
        signal: controller.signal,
      });
      if (response.ok) {
        const payload = await response.json();
        setResults(payload.items ?? []);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  function toggleExercise(exerciseId: string) {
    setLocalIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-caption text-muted uppercase tracking-wide">
        Alternatives matériel
      </p>
      {!disabled ? (
        <>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une alternative…"
            className="border-hairline bg-surface-elevated h-8 text-xs"
          />
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {results.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => toggleExercise(exercise.id)}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                  localIds.includes(exercise.id)
                    ? "border-primary/40 bg-primary/10 text-on-dark"
                    : "border-hairline text-muted hover:text-on-dark"
                }`}
              >
                {exercise.name}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline"
            onClick={() => onSave(localIds)}
          >
            Enregistrer alternatives
          </Button>
        </>
      ) : (
        <p className="text-muted text-xs">
          {localIds.length > 0
            ? `${localIds.length} alternative(s) configurée(s)`
            : "Aucune alternative"}
        </p>
      )}
    </div>
  );
}
