"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProgramAlternativesPicker } from "@/components/coach/programs/program-alternatives-picker";
import { ProgramPrescriptionEditor } from "@/components/coach/programs/program-prescription-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BLOCK_TYPE_LABELS } from "@/lib/programs/constants";
import type { BlockExerciseItem, ExerciseBlockItem, SetPrescriptionItem } from "@/lib/programs/types";
import type { BlockType } from "@/lib/validators/programs";
import { cn } from "@/lib/utils";

type ProgramBlockCardProps = {
  block: ExerciseBlockItem;
  disabled?: boolean;
  onPatchBlock: (input: Record<string, unknown>) => Promise<void>;
  onDeleteBlock: () => Promise<void>;
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

export function ProgramBlockCard({
  block,
  disabled,
  onPatchBlock,
  onDeleteBlock,
  onSavePrescriptions,
  onSaveAlternatives,
  onDeleteBlockExercise,
}: ProgramBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `block:${block.id}`,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [localConfig, setLocalConfig] = useState({
    sharedRestSeconds: block.sharedRestSeconds ?? "",
    rounds: block.rounds ?? "",
    restBetweenRoundsSeconds: block.restBetweenRoundsSeconds ?? "",
    durationSeconds: block.durationSeconds ?? "",
    targetRpe: block.targetRpe ?? "",
  });

  async function saveConfig() {
    await onPatchBlock({
      sharedRestSeconds:
        localConfig.sharedRestSeconds === ""
          ? null
          : Number(localConfig.sharedRestSeconds),
      rounds:
        localConfig.rounds === "" ? null : Number(localConfig.rounds),
      restBetweenRoundsSeconds:
        localConfig.restBetweenRoundsSeconds === ""
          ? null
          : Number(localConfig.restBetweenRoundsSeconds),
      durationSeconds:
        localConfig.durationSeconds === ""
          ? null
          : Number(localConfig.durationSeconds),
      targetRpe:
        localConfig.targetRpe === "" ? null : Number(localConfig.targetRpe),
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-hairline bg-surface-card rounded-lg border p-4",
        isDragging && "ring-primary/40 opacity-80 ring-2",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
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
          <Badge variant="outline" className="rounded-md uppercase tracking-wide">
            {BLOCK_TYPE_LABELS[block.type]}
          </Badge>
        </div>
        {!disabled ? (
          <div className="flex items-center gap-2">
            <BlockTypeSelect
              value={block.type}
              onChange={(type) => void onPatchBlock({ type })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted"
              onClick={() => void onDeleteBlock()}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <BlockConfigFields
        type={block.type}
        disabled={disabled}
        values={localConfig}
        onChange={setLocalConfig}
        onSave={() => void saveConfig()}
      />

      <div className="mt-4 space-y-4">
        {block.exercises.map((blockExercise) => (
          <BlockExerciseEditor
            key={blockExercise.id}
            blockExercise={blockExercise}
            block={block}
            disabled={disabled}
            onDeleteBlockExercise={onDeleteBlockExercise}
            onSavePrescriptions={onSavePrescriptions}
            onSaveAlternatives={onSaveAlternatives}
          />
        ))}
      </div>
    </div>
  );
}

function BlockExerciseEditor({
  blockExercise,
  block,
  disabled,
  onDeleteBlockExercise,
  onSavePrescriptions,
  onSaveAlternatives,
}: {
  blockExercise: BlockExerciseItem;
  block: ExerciseBlockItem;
  disabled?: boolean;
  onDeleteBlockExercise: (blockExerciseId: string) => Promise<void>;
  onSavePrescriptions: (
    blockExerciseId: string,
    prescriptions: SetPrescriptionItem[],
  ) => Promise<void>;
  onSaveAlternatives: (
    blockExerciseId: string,
    exerciseIds: string[],
  ) => Promise<void>;
}) {
  const [prescriptions, setPrescriptions] = useState(blockExercise.prescriptions);

  useEffect(() => {
    setPrescriptions(blockExercise.prescriptions);
  }, [blockExercise.prescriptions]);

  return (
    <div className="border-hairline bg-surface-elevated rounded-md border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-on-dark text-sm font-semibold">
          {blockExercise.exerciseName}
        </p>
        {!disabled && block.exercises.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted h-7 text-xs"
            onClick={() => void onDeleteBlockExercise(blockExercise.id)}
          >
            Retirer
          </Button>
        ) : null}
      </div>

      <ProgramPrescriptionEditor
        prescriptions={prescriptions}
        disabled={disabled}
        onChange={setPrescriptions}
        onSave={() => void onSavePrescriptions(blockExercise.id, prescriptions)}
      />

      <div className="mt-4">
        <ProgramAlternativesPicker
          selectedIds={blockExercise.alternatives.map((alt) => alt.exerciseId)}
          disabled={disabled}
          onSave={(exerciseIds) =>
            void onSaveAlternatives(blockExercise.id, exerciseIds)
          }
        />
      </div>
    </div>
  );
}

function BlockTypeSelect({
  value,
  onChange,
}: {
  value: BlockType;
  onChange: (value: BlockType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as BlockType)}
      className="border-hairline bg-surface-elevated rounded-md border px-2 py-1 text-xs"
    >
      {Object.entries(BLOCK_TYPE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

function BlockConfigFields({
  type,
  disabled,
  values,
  onChange,
  onSave,
}: {
  type: BlockType;
  disabled?: boolean;
  values: {
    sharedRestSeconds: number | string;
    rounds: number | string;
    restBetweenRoundsSeconds: number | string;
    durationSeconds: number | string;
    targetRpe: number | string;
  };
  onChange: (values: {
    sharedRestSeconds: number | string;
    rounds: number | string;
    restBetweenRoundsSeconds: number | string;
    durationSeconds: number | string;
    targetRpe: number | string;
  }) => void;
  onSave: () => void;
}) {
  if (type === "single") return null;

  return (
    <div className="border-hairline/60 grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      {(type === "superset" || type === "triset") && (
        <Field
          label="Repos partagé (s)"
          value={values.sharedRestSeconds}
          disabled={disabled}
          onChange={(value) =>
            onChange({ ...values, sharedRestSeconds: value })
          }
        />
      )}
      {type === "circuit" && (
        <>
          <Field
            label="Tours"
            value={values.rounds}
            disabled={disabled}
            onChange={(value) => onChange({ ...values, rounds: value })}
          />
          <Field
            label="Repos entre tours (s)"
            value={values.restBetweenRoundsSeconds}
            disabled={disabled}
            onChange={(value) =>
              onChange({ ...values, restBetweenRoundsSeconds: value })
            }
          />
        </>
      )}
      {type === "amrap" && (
        <>
          <Field
            label="Durée (s)"
            value={values.durationSeconds}
            disabled={disabled}
            onChange={(value) =>
              onChange({ ...values, durationSeconds: value })
            }
          />
          <Field
            label="RPE cible"
            value={values.targetRpe}
            disabled={disabled}
            onChange={(value) => onChange({ ...values, targetRpe: value })}
          />
        </>
      )}
      {!disabled ? (
        <div className="sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline"
            onClick={onSave}
          >
            Enregistrer config bloc
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-muted text-xs">{label}</span>
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-hairline bg-surface-card h-8 font-mono text-xs"
      />
    </label>
  );
}
