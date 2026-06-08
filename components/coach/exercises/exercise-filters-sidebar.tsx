"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ExerciseFilters } from "@/components/coach/exercises/exercises-page-client";
import type { ExerciseCategoryItem } from "@/lib/exercises/types";
import {
  labelEquipment,
  labelExerciseType,
  labelMuscle,
} from "@/lib/exercises/constants";
import {
  EQUIPMENT_TYPES,
  EXERCISE_TYPES,
  MUSCLE_GROUPS,
} from "@/lib/validators/exercises";

type ExerciseFiltersSidebarProps = {
  filters: ExerciseFilters;
  categories: ExerciseCategoryItem[];
  onChange: (filters: ExerciseFilters) => void;
  onSearchChange: (search: string) => void;
};

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "bg-primary text-on-primary rounded-md px-2.5 py-1 text-xs font-semibold"
          : "border-hairline bg-surface-elevated text-body-strong rounded-md border px-2.5 py-1 text-xs"
      }
    >
      {label}
    </button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-hairline bg-surface-card space-y-3 rounded-lg border p-4">
      <h2 className="text-caption-uppercase text-muted">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function ExerciseFiltersSidebar({
  filters,
  categories,
  onChange,
  onSearchChange,
}: ExerciseFiltersSidebarProps) {
  function patch(partial: Partial<ExerciseFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <section className="border-hairline bg-surface-card rounded-lg border p-4">
        <label className="text-body-sm text-body-strong mb-2 block font-medium">
          Recherche
        </label>
        <div className="relative">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Squat, dos, haltères…"
            className="border-hairline bg-surface-elevated text-on-dark pl-9"
          />
        </div>
      </section>

      <FilterSection title="Source">
        <FilterChip
          active={!filters.source}
          label="Tous"
          onClick={() => patch({ source: undefined })}
        />
        <FilterChip
          active={filters.source === "system"}
          label="Système"
          onClick={() =>
            patch({
              source: filters.source === "system" ? undefined : "system",
            })
          }
        />
        <FilterChip
          active={filters.source === "custom"}
          label="Custom"
          onClick={() =>
            patch({
              source: filters.source === "custom" ? undefined : "custom",
            })
          }
        />
        <FilterChip
          active={Boolean(filters.favorite)}
          label="Favoris"
          onClick={() =>
            patch({ favorite: filters.favorite ? undefined : true })
          }
        />
      </FilterSection>

      <FilterSection title="Type">
        <FilterChip
          active={!filters.type}
          label="Tous"
          onClick={() => patch({ type: undefined })}
        />
        {EXERCISE_TYPES.map((type) => (
          <FilterChip
            key={type}
            active={filters.type === type}
            label={labelExerciseType(type)}
            onClick={() =>
              patch({ type: filters.type === type ? undefined : type })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Muscle">
        {MUSCLE_GROUPS.slice(0, 10).map((muscle) => (
          <FilterChip
            key={muscle}
            active={filters.muscle === muscle}
            label={labelMuscle(muscle)}
            onClick={() =>
              patch({ muscle: filters.muscle === muscle ? undefined : muscle })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Équipement">
        {EQUIPMENT_TYPES.slice(0, 10).map((equipment) => (
          <FilterChip
            key={equipment}
            active={filters.equipment === equipment}
            label={labelEquipment(equipment)}
            onClick={() =>
              patch({
                equipment:
                  filters.equipment === equipment ? undefined : equipment,
              })
            }
          />
        ))}
      </FilterSection>

      {categories.length > 0 ? (
        <FilterSection title="Catégories">
          <FilterChip
            active={!filters.categoryId}
            label="Toutes"
            onClick={() => patch({ categoryId: undefined })}
          />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              active={filters.categoryId === category.id}
              label={category.name}
              onClick={() =>
                patch({
                  categoryId:
                    filters.categoryId === category.id ? undefined : category.id,
                })
              }
            />
          ))}
        </FilterSection>
      ) : null}
    </aside>
  );
}
