"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProgramWeekItem } from "@/lib/programs/types";
import { cn } from "@/lib/utils";

export const WEEK_SORTABLE_PREFIX = "week:";

type ProgramWeeksSidebarProps = {
  weeks: ProgramWeekItem[];
  activeWeekId: string;
  disabled?: boolean;
  onSelectWeek: (weekId: string) => void;
  onAddWeek: () => Promise<void>;
  onDeleteWeek: (weekId: string) => Promise<void>;
};

export function ProgramWeeksSidebar({
  weeks,
  activeWeekId,
  disabled,
  onSelectWeek,
  onAddWeek,
  onDeleteWeek,
}: ProgramWeeksSidebarProps) {
  return (
    <div className="border-hairline bg-surface-card flex h-full flex-col rounded-lg border">
      <div className="border-hairline flex items-center justify-between border-b p-4">
        <h2 className="text-title-sm text-on-dark font-semibold">Semaines</h2>
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline h-8"
            onClick={() => void onAddWeek()}
          >
            <Plus className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <SortableContext
        items={weeks.map((week) => `${WEEK_SORTABLE_PREFIX}${week.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 overflow-y-auto p-3">
          {weeks.map((week) => (
            <WeekItem
              key={week.id}
              week={week}
              active={week.id === activeWeekId}
              disabled={disabled}
              canDelete={weeks.length > 1}
              onSelect={() => onSelectWeek(week.id)}
              onDelete={() => void onDeleteWeek(week.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function WeekItem({
  week,
  active,
  disabled,
  canDelete,
  onSelect,
  onDelete,
}: {
  week: ProgramWeekItem;
  active: boolean;
  disabled?: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `${WEEK_SORTABLE_PREFIX}${week.id}`,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-hairline flex items-center gap-2 rounded-md border p-2",
        active && "border-primary/40 bg-primary/5",
        isDragging && "ring-primary/40 opacity-80 ring-2",
      )}
    >
      {!disabled ? (
        <button
          type="button"
          className="text-muted hover:text-on-dark cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-on-dark truncate text-sm font-medium">{week.label}</p>
        <p className="text-muted text-xs">
          {week.sessions.length} séance{week.sessions.length > 1 ? "s" : ""}
        </p>
      </button>
      {!disabled && canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted h-8 w-8 p-0"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
