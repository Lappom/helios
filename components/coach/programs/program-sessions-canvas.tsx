"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { ProgramBlockCard } from "@/components/coach/programs/program-block-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ProgramSessionItem,
  ProgramWeekItem,
  SetPrescriptionItem,
} from "@/lib/programs/types";
import { cn } from "@/lib/utils";

export const SESSION_DROP_PREFIX = "session-drop:";
export const BLOCK_SORTABLE_PREFIX = "block:";

type ProgramSessionsCanvasProps = {
  week: ProgramWeekItem | undefined;
  activeSessionId: string;
  disabled?: boolean;
  onSelectSession: (sessionId: string) => void;
  onAddSession: () => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onPatchBlock: (
    blockId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
  onSavePrescriptions: (
    blockExerciseId: string,
    prescriptions: SetPrescriptionItem[],
  ) => Promise<void>;
  onSaveAlternatives: (
    blockExerciseId: string,
    exerciseIds: string[],
  ) => Promise<void>;
  onDeleteBlockExercise: (blockExerciseId: string) => Promise<void>;
};

export function ProgramSessionsCanvas({
  week,
  activeSessionId,
  disabled,
  onSelectSession,
  onAddSession,
  onDeleteSession,
  onPatchBlock,
  onDeleteBlock,
  onSavePrescriptions,
  onSaveAlternatives,
  onDeleteBlockExercise,
}: ProgramSessionsCanvasProps) {
  if (!week) {
    return (
      <div className="border-hairline bg-surface-card text-muted flex h-full items-center justify-center rounded-lg border p-8">
        Sélectionnez une semaine.
      </div>
    );
  }

  const activeSession =
    week.sessions.find((session) => session.id === activeSessionId) ??
    week.sessions[0];

  return (
    <div className="border-hairline bg-surface-card flex h-full flex-col rounded-lg border">
      <div className="border-hairline flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-title-sm text-on-dark font-semibold">
            {week.label}
          </h2>
          <p className="text-muted mt-1 text-xs">
            Composez les blocs d&apos;exercices de la séance.
          </p>
        </div>
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline"
            onClick={() => void onAddSession()}
          >
            <Plus className="size-3.5" />
            Séance
          </Button>
        ) : null}
      </div>

      <Tabs
        value={activeSession?.id}
        onValueChange={onSelectSession}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="border-hairline mx-4 mt-4 flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {week.sessions.map((session) => (
            <TabsTrigger
              key={session.id}
              value={session.id}
              className="border-hairline data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 rounded-md border px-3 py-1.5 text-xs"
            >
              {session.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {week.sessions.map((session) => (
          <TabsContent
            key={session.id}
            value={session.id}
            className="mt-0 min-h-0 flex-1 overflow-y-auto p-4"
          >
            <SessionDropZone
              session={session}
              disabled={disabled}
              canDelete={week.sessions.length > 1}
              onDeleteSession={() => void onDeleteSession(session.id)}
              onPatchBlock={onPatchBlock}
              onDeleteBlock={onDeleteBlock}
              onSavePrescriptions={onSavePrescriptions}
              onSaveAlternatives={onSaveAlternatives}
              onDeleteBlockExercise={onDeleteBlockExercise}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SessionDropZone({
  session,
  disabled,
  canDelete,
  onDeleteSession,
  onPatchBlock,
  onDeleteBlock,
  onSavePrescriptions,
  onSaveAlternatives,
  onDeleteBlockExercise,
}: {
  session: ProgramSessionItem;
  disabled?: boolean;
  canDelete: boolean;
  onDeleteSession: () => void;
  onPatchBlock: (
    blockId: string,
    input: Record<string, unknown>,
  ) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
  onSavePrescriptions: (
    blockExerciseId: string,
    prescriptions: SetPrescriptionItem[],
  ) => Promise<void>;
  onSaveAlternatives: (
    blockExerciseId: string,
    exerciseIds: string[],
  ) => Promise<void>;
  onDeleteBlockExercise: (blockExerciseId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${SESSION_DROP_PREFIX}${session.id}`,
    data: { sessionId: session.id },
    disabled,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-on-dark text-sm font-semibold">{session.name}</p>
        {!disabled && canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted h-7 text-xs"
            onClick={onDeleteSession}
          >
            Supprimer séance
          </Button>
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[320px] space-y-3 rounded-lg border border-dashed p-3 transition-colors",
          isOver
            ? "border-primary/50 bg-primary/5"
            : "border-hairline bg-surface-elevated/40",
        )}
      >
        {session.blocks.length === 0 ? (
          <p className="text-muted py-10 text-center text-sm">
            {disabled
              ? "Aucun bloc dans cette séance."
              : "Glissez un exercice depuis la bibliothèque."}
          </p>
        ) : (
          <SortableContext
            items={session.blocks.map(
              (block) => `${BLOCK_SORTABLE_PREFIX}${block.id}`,
            )}
            strategy={verticalListSortingStrategy}
          >
            {session.blocks.map((block) => (
              <ProgramBlockCard
                key={block.id}
                block={block}
                disabled={disabled}
                onPatchBlock={(input) => onPatchBlock(block.id, input)}
                onDeleteBlock={() => onDeleteBlock(block.id)}
                onSavePrescriptions={onSavePrescriptions}
                onSaveAlternatives={onSaveAlternatives}
                onDeleteBlockExercise={onDeleteBlockExercise}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
