"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FoodFilters } from "@/components/coach/foods/foods-page-client";
import type { FoodSource } from "@/lib/validators/foods";

type FoodFiltersSidebarProps = {
  filters: FoodFilters;
  onChange: (filters: FoodFilters) => void;
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

const SOURCE_OPTIONS: Array<{ value?: FoodSource; label: string }> = [
  { label: "Tous" },
  { value: "off", label: "Open Food Facts" },
  { value: "custom", label: "Custom" },
];

export function FoodFiltersSidebar({
  filters,
  onChange,
  onSearchChange,
}: FoodFiltersSidebarProps) {
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
            placeholder="Poulet, riz, yaourt…"
            className="pl-9"
          />
        </div>
      </section>

      <section className="border-hairline bg-surface-card space-y-3 rounded-lg border p-4">
        <h2 className="text-caption-uppercase text-muted">Source</h2>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((option) => (
            <FilterChip
              key={option.label}
              active={filters.source === option.value}
              label={option.label}
              onClick={() => onChange({ ...filters, source: option.value })}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}
