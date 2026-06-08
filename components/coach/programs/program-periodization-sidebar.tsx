"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Layers,
  LayoutGrid,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  cycleFormToPayload,
  ProgramCycleFormDialog,
  type CycleFormValues,
} from "@/components/coach/programs/program-cycle-form-dialog";
import { MicrocycleDurationSummary } from "@/components/coach/programs/program-duration-summary";
import { ProgramFocusBadge } from "@/components/coach/programs/program-focus-badge";
import { Button } from "@/components/ui/button";
import type {
  CycleBlockBase,
  ProgramMesocycleItem,
  ProgramTree,
} from "@/lib/programs/types";
import { cn } from "@/lib/utils";

export const MESOCYCLE_SORTABLE_PREFIX = "meso:";
export const WEEK_IN_TREE_PREFIX = "tree-week:";

type ProgramPeriodizationSidebarProps = {
  program: ProgramTree;
  activeWeekId: string;
  disabled?: boolean;
  onSelectWeek: (weekId: string) => void;
  onAddWeek: (microcycleId: string) => Promise<void>;
  onAddMesocycle: () => Promise<void>;
  onAddMacrocycle: (mesocycleId: string) => Promise<void>;
  onAddMicrocycle: (macrocycleId: string) => Promise<void>;
  onDeleteWeek: (weekId: string) => Promise<void>;
  onDeleteMesocycle: (mesocycleId: string) => Promise<void>;
  onDuplicateMesocycle: (mesocycleId: string) => Promise<void>;
  onPatchMesocycle: (
    mesocycleId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
  onPatchMacrocycle: (
    macrocycleId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
  onPatchMicrocycle: (
    microcycleId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
};

type EditTarget =
  | { level: "mesocycle"; id: string; data: CycleBlockBase }
  | { level: "macrocycle"; id: string; data: CycleBlockBase }
  | { level: "microcycle"; id: string; data: CycleBlockBase };

export function ProgramPeriodizationSidebar({
  program,
  activeWeekId,
  disabled,
  onSelectWeek,
  onAddWeek,
  onAddMesocycle,
  onAddMacrocycle,
  onAddMicrocycle,
  onDeleteWeek,
  onDeleteMesocycle,
  onDuplicateMesocycle,
  onPatchMesocycle,
  onPatchMacrocycle,
  onPatchMicrocycle,
}: ProgramPeriodizationSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const mesocycleIds = useMemo(
    () => program.mesocycles.map((m) => `${MESOCYCLE_SORTABLE_PREFIX}${m.id}`),
    [program.mesocycles],
  );

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleEditSubmit(values: CycleFormValues) {
    if (!editTarget) return;
    const payload = cycleFormToPayload(values);
    if (editTarget.level === "mesocycle") {
      await onPatchMesocycle(editTarget.id, payload);
    } else if (editTarget.level === "macrocycle") {
      await onPatchMacrocycle(editTarget.id, payload);
    } else {
      await onPatchMicrocycle(editTarget.id, payload);
    }
  }

  return (
    <div className="border-hairline bg-surface-card flex h-full flex-col rounded-lg border">
      <div className="border-hairline flex items-center justify-between border-b p-4">
        <h2 className="text-title-sm text-on-dark font-semibold">Périodisation</h2>
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline h-8"
            onClick={() => void onAddMesocycle()}
          >
            <Plus className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <SortableContext items={mesocycleIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 overflow-y-auto p-3">
          {program.mesocycles.map((mesocycle) => (
            <MesocycleNode
              key={mesocycle.id}
              mesocycle={mesocycle}
              activeWeekId={activeWeekId}
              disabled={disabled}
              expanded={expanded}
              onToggle={toggleExpanded}
              onSelectWeek={onSelectWeek}
              onAddWeek={onAddWeek}
              onAddMacrocycle={onAddMacrocycle}
              onAddMicrocycle={onAddMicrocycle}
              onDeleteWeek={onDeleteWeek}
              onDeleteMesocycle={onDeleteMesocycle}
              onDuplicateMesocycle={onDuplicateMesocycle}
              onEdit={(data) =>
                setEditTarget({ level: "mesocycle", id: mesocycle.id, data })
              }
              onEditMacrocycle={(id, data) =>
                setEditTarget({ level: "macrocycle", id, data })
              }
              onEditMicrocycle={(id, data) =>
                setEditTarget({ level: "microcycle", id, data })
              }
            />
          ))}
        </div>
      </SortableContext>

      <ProgramCycleFormDialog
        open={editTarget !== null}
        title="Modifier le bloc"
        initial={editTarget?.data}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}

function MesocycleNode({
  mesocycle,
  activeWeekId,
  disabled,
  expanded,
  onToggle,
  onSelectWeek,
  onAddWeek,
  onAddMacrocycle,
  onAddMicrocycle,
  onDeleteWeek,
  onDeleteMesocycle,
  onDuplicateMesocycle,
  onEdit,
  onEditMacrocycle,
  onEditMicrocycle,
}: {
  mesocycle: ProgramMesocycleItem;
  activeWeekId: string;
  disabled?: boolean;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSelectWeek: (weekId: string) => void;
  onAddWeek: (microcycleId: string) => Promise<void>;
  onAddMacrocycle: (mesocycleId: string) => Promise<void>;
  onAddMicrocycle: (macrocycleId: string) => Promise<void>;
  onDeleteWeek: (weekId: string) => Promise<void>;
  onDeleteMesocycle: (mesocycleId: string) => Promise<void>;
  onDuplicateMesocycle: (mesocycleId: string) => Promise<void>;
  onEdit: (data: CycleBlockBase) => void;
  onEditMacrocycle: (id: string, data: CycleBlockBase) => void;
  onEditMicrocycle: (id: string, data: CycleBlockBase) => void;
}) {
  const key = `meso-${mesocycle.id}`;
  const isOpen = expanded[key] ?? true;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `${MESOCYCLE_SORTABLE_PREFIX}${mesocycle.id}`,
      disabled,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("space-y-1", isDragging && "opacity-80")}
    >
      <div className="border-hairline flex items-center gap-1 rounded-md border p-2">
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
          className="text-muted"
          onClick={() => onToggle(key)}
        >
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <Layers className="text-primary size-4 shrink-0" />
        <button
          type="button"
          className="text-body-sm text-on-dark min-w-0 flex-1 truncate text-left font-medium"
          onClick={() => onEdit(mesocycle)}
        >
          {mesocycle.name}
        </button>
        <ProgramFocusBadge focus={mesocycle.focus} />
        {!disabled ? (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void onAddMacrocycle(mesocycle.id)}
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void onDuplicateMesocycle(mesocycle.id)}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive size-7"
              onClick={() => void onDeleteMesocycle(mesocycle.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {isOpen
        ? mesocycle.macrocycles.map((macrocycle) => {
            const macroKey = `macro-${macrocycle.id}`;
            const macroOpen = expanded[macroKey] ?? true;
            return (
              <div key={macrocycle.id} className="ml-3 space-y-1">
                <div className="border-hairline flex items-center gap-1 rounded-md border p-2">
                  <button
                    type="button"
                    className="text-muted"
                    onClick={() => onToggle(macroKey)}
                  >
                    {macroOpen ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                  <LayoutGrid className="text-muted size-3.5 shrink-0" />
                  <button
                    type="button"
                    className="text-body-sm text-on-dark min-w-0 flex-1 truncate text-left"
                    onClick={() => onEditMacrocycle(macrocycle.id, macrocycle)}
                  >
                    {macrocycle.name}
                  </button>
                  <ProgramFocusBadge focus={macrocycle.focus} />
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => void onAddMicrocycle(macrocycle.id)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                {macroOpen
                  ? macrocycle.microcycles.map((microcycle) => {
                      const microKey = `micro-${microcycle.id}`;
                      const microOpen = expanded[microKey] ?? true;
                      return (
                        <div key={microcycle.id} className="ml-3 space-y-1">
                          <div className="border-hairline flex items-center gap-1 rounded-md border p-2">
                            <button
                              type="button"
                              className="text-muted"
                              onClick={() => onToggle(microKey)}
                            >
                              {microOpen ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </button>
                            <CalendarDays className="text-muted size-3.5 shrink-0" />
                            <button
                              type="button"
                              className="text-body-sm text-on-dark min-w-0 flex-1 truncate text-left"
                              onClick={() =>
                                onEditMicrocycle(microcycle.id, microcycle)
                              }
                            >
                              {microcycle.name}
                            </button>
                            <ProgramFocusBadge focus={microcycle.focus} />
                            <MicrocycleDurationSummary microcycle={microcycle} />
                            {!disabled ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => void onAddWeek(microcycle.id)}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                          {microOpen
                            ? microcycle.weeks.map((week) => (
                                <button
                                  key={week.id}
                                  type="button"
                                  onClick={() => onSelectWeek(week.id)}
                                  className={cn(
                                    "border-hairline ml-3 flex w-[calc(100%-12px)] items-center justify-between rounded-md border px-2 py-1.5 text-left",
                                    week.id === activeWeekId &&
                                      "border-primary/40 bg-primary/5",
                                  )}
                                >
                                  <span className="text-body-sm text-on-dark truncate">
                                    {week.label}
                                  </span>
                                  {!disabled && microcycle.weeks.length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive size-6"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void onDeleteWeek(week.id);
                                      }}
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  ) : null}
                                </button>
                              ))
                            : null}
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          })
        : null}
    </div>
  );
}
