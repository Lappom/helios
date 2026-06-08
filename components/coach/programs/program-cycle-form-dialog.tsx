"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CycleBlockBase } from "@/lib/programs/types";
import {
  TRAINING_PHASE_FOCUSES,
  type TrainingPhaseFocus,
} from "@/lib/validators/programs";

export type CycleFormValues = {
  name: string;
  description: string;
  focus: TrainingPhaseFocus | "";
  targetDurationWeeks: string;
};

type ProgramCycleFormDialogProps = {
  open: boolean;
  title: string;
  initial?: Partial<CycleBlockBase>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CycleFormValues) => Promise<void>;
};

const FOCUS_LABELS: Record<TrainingPhaseFocus, string> = {
  strength: "Force",
  hypertrophy: "Hypertrophie",
  power: "Puissance",
  endurance: "Endurance",
  deload: "Deload",
  custom: "Custom",
};

function toCycleFormValues(initial?: Partial<CycleBlockBase>): CycleFormValues {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    focus: initial?.focus ?? "",
    targetDurationWeeks:
      initial?.targetDurationWeeks != null
        ? String(initial.targetDurationWeeks)
        : "",
  };
}

type CycleFormDialogContentProps = {
  title: string;
  initial?: Partial<CycleBlockBase>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CycleFormValues) => Promise<void>;
};

function CycleFormDialogContent({
  title,
  initial,
  onOpenChange,
  onSubmit,
}: CycleFormDialogContentProps) {
  const [values, setValues] = useState(() => toCycleFormValues(initial));
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="bg-surface-card border-hairline">
      <DialogHeader>
        <DialogTitle className="text-on-dark">{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="cycle-name"
            className="text-body-sm text-on-dark font-medium"
          >
            Nom
          </label>
          <Input
            id="cycle-name"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="cycle-description"
            className="text-body-sm text-on-dark font-medium"
          >
            Description
          </label>
          <Textarea
            id="cycle-description"
            value={values.description}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <p className="text-body-sm text-on-dark font-medium">Focus</p>
          <Select
            value={values.focus || "none"}
            onValueChange={(value) =>
              setValues((prev) => ({
                ...prev,
                focus: value === "none" ? "" : (value as TrainingPhaseFocus),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Aucun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {TRAINING_PHASE_FOCUSES.map((focus) => (
                <SelectItem key={focus} value={focus}>
                  {FOCUS_LABELS[focus]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="cycle-duration"
            className="text-body-sm text-on-dark font-medium"
          >
            Durée cible (semaines)
          </label>
          <Input
            id="cycle-duration"
            type="number"
            min={1}
            value={values.targetDurationWeeks}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                targetDurationWeeks: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Annuler
        </Button>
        <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function ProgramCycleFormDialog({
  open,
  title,
  initial,
  onOpenChange,
  onSubmit,
}: ProgramCycleFormDialogProps) {
  const formKey = initial?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CycleFormDialogContent
          key={formKey}
          title={title}
          initial={initial}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  );
}

export function cycleFormToPayload(values: CycleFormValues) {
  return {
    name: values.name.trim() || undefined,
    description: values.description.trim() || null,
    focus: values.focus || null,
    targetDurationWeeks: values.targetDurationWeeks
      ? Number(values.targetDurationWeeks)
      : null,
  };
}
