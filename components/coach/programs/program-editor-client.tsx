"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProgramExercisePalette } from "@/components/coach/programs/program-exercise-palette";
import { PALETTE_EXERCISE_PREFIX } from "@/components/coach/programs/program-exercise-palette";
import { ProgramPublishBar } from "@/components/coach/programs/program-publish-bar";
import {
  BLOCK_SORTABLE_PREFIX,
  ProgramSessionsCanvas,
  SESSION_DROP_PREFIX,
} from "@/components/coach/programs/program-sessions-canvas";
import {
  ProgramWeeksSidebar,
  WEEK_SORTABLE_PREFIX,
} from "@/components/coach/programs/program-weeks-sidebar";
import {
  addBlockExerciseRequest,
  createBlockRequest,
  createSessionRequest,
  createWeekRequest,
  deleteBlockExerciseRequest,
  deleteBlockRequest,
  deleteSessionRequest,
  deleteWeekRequest,
  patchBlockExerciseRequest,
  patchBlockRequest,
  reorderBlocksRequest,
  reorderWeeksRequest,
} from "@/lib/programs/api-client";
import type { ProgramTree, SetPrescriptionItem } from "@/lib/programs/types";

type ProgramEditorClientProps = {
  initialProgram: ProgramTree;
};

export function ProgramEditorClient({
  initialProgram,
}: ProgramEditorClientProps) {
  const [program, setProgram] = useState(initialProgram);
  const [activeWeekId, setActiveWeekId] = useState(
    initialProgram.weeks[0]?.id ?? "",
  );
  const [activeSessionId, setActiveSessionId] = useState(
    initialProgram.weeks[0]?.sessions[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeWeek = useMemo(
    () => program.weeks.find((week) => week.id === activeWeekId),
    [program.weeks, activeWeekId],
  );

  const isLocked = program.status !== "draft";

  async function mutate(
    action: () => Promise<ProgramTree>,
    successMessage?: string,
  ) {
    setSaving(true);
    try {
      const updated = await action();
      setProgram(updated);
      if (!updated.weeks.some((week) => week.id === activeWeekId)) {
        setActiveWeekId(updated.weeks[0]?.id ?? "");
      }
      const week =
        updated.weeks.find((item) => item.id === activeWeekId) ??
        updated.weeks[0];
      if (!week?.sessions.some((session) => session.id === activeSessionId)) {
        setActiveSessionId(week?.sessions[0]?.id ?? "");
      }
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragLabel(null);
    const { active, over } = event;
    if (!over || isLocked) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith(WEEK_SORTABLE_PREFIX)) {
      const oldIndex = program.weeks.findIndex(
        (week) => `${WEEK_SORTABLE_PREFIX}${week.id}` === activeId,
      );
      const newIndex = program.weeks.findIndex(
        (week) => `${WEEK_SORTABLE_PREFIX}${week.id}` === overId,
      );
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(program.weeks, oldIndex, newIndex);
      await mutate(() =>
        reorderWeeksRequest(
          program.id,
          reordered.map((week) => week.id),
        ),
      );
      return;
    }

    if (activeId.startsWith(BLOCK_SORTABLE_PREFIX) && activeWeek) {
      const session =
        activeWeek.sessions.find((item) => item.id === activeSessionId) ??
        activeWeek.sessions[0];
      if (!session) return;

      const oldIndex = session.blocks.findIndex(
        (block) => `${BLOCK_SORTABLE_PREFIX}${block.id}` === activeId,
      );
      const newIndex = session.blocks.findIndex(
        (block) => `${BLOCK_SORTABLE_PREFIX}${block.id}` === overId,
      );
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(session.blocks, oldIndex, newIndex);
      await mutate(() =>
        reorderBlocksRequest(
          program.id,
          session.id,
          reordered.map((block) => block.id),
        ),
      );
      return;
    }

    if (activeId.startsWith(PALETTE_EXERCISE_PREFIX)) {
      const exerciseId = activeId.replace(PALETTE_EXERCISE_PREFIX, "");
      const sessionId = overId.startsWith(SESSION_DROP_PREFIX)
        ? overId.replace(SESSION_DROP_PREFIX, "")
        : activeSessionId;

      if (!sessionId) return;

      await mutate(
        () =>
          createBlockRequest(program.id, sessionId, {
            type: "single",
            exerciseId,
          }),
        "Exercice ajouté",
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { exerciseName?: string }
      | undefined;
    setActiveDragLabel(data?.exerciseName ?? "Élément");
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <ProgramPublishBar
        program={program}
        onProgramChange={setProgram}
        saving={saving}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <div className="grid min-h-[720px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <SortableContext
            items={program.weeks.map(
              (week) => `${WEEK_SORTABLE_PREFIX}${week.id}`,
            )}
            strategy={verticalListSortingStrategy}
          >
            <ProgramWeeksSidebar
              weeks={program.weeks}
              activeWeekId={activeWeekId}
              disabled={isLocked}
              onSelectWeek={(weekId) => {
                setActiveWeekId(weekId);
                const week = program.weeks.find((item) => item.id === weekId);
                setActiveSessionId(week?.sessions[0]?.id ?? "");
              }}
              onAddWeek={() =>
                mutate(() => createWeekRequest(program.id), "Semaine ajoutée")
              }
              onDeleteWeek={(weekId) =>
                mutate(() => deleteWeekRequest(program.id, weekId), "Semaine supprimée")
              }
            />
          </SortableContext>

          <ProgramSessionsCanvas
            week={activeWeek}
            activeSessionId={activeSessionId}
            disabled={isLocked}
            onSelectSession={setActiveSessionId}
            onAddSession={() => {
              if (!activeWeekId) return Promise.resolve();
              return mutate(
                () => createSessionRequest(program.id, activeWeekId),
                "Séance ajoutée",
              );
            }}
            onDeleteSession={(sessionId) =>
              mutate(
                () => deleteSessionRequest(program.id, sessionId),
                "Séance supprimée",
              )
            }
            onPatchBlock={(blockId, input) =>
              mutate(() => patchBlockRequest(program.id, blockId, input))
            }
            onDeleteBlock={(blockId) =>
              mutate(
                () => deleteBlockRequest(program.id, blockId),
                "Bloc supprimé",
              )
            }
            onSavePrescriptions={(
              blockExerciseId: string,
              prescriptions: SetPrescriptionItem[],
            ) =>
              mutate(() =>
                patchBlockExerciseRequest(program.id, blockExerciseId, {
                  prescriptions: prescriptions.map((prescription) => ({
                    setNumber: prescription.setNumber,
                    load: prescription.load,
                    reps: prescription.reps,
                    restSeconds: prescription.restSeconds,
                    tempo: prescription.tempo,
                    rpe: prescription.rpe,
                    durationSeconds: prescription.durationSeconds,
                  })),
                }),
              )
            }
            onSaveAlternatives={(blockExerciseId, exerciseIds) =>
              mutate(() =>
                patchBlockExerciseRequest(program.id, blockExerciseId, {
                  alternativeExerciseIds: exerciseIds,
                }),
              )
            }
            onDeleteBlockExercise={(blockExerciseId) =>
              mutate(() =>
                deleteBlockExerciseRequest(program.id, blockExerciseId),
              )
            }
          />

          <ProgramExercisePalette disabled={isLocked} />
        </div>

        <DragOverlay>
          {activeDragLabel ? (
            <div className="border-primary/40 bg-surface-card rounded-md border px-3 py-2 text-sm shadow-none">
              {activeDragLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
