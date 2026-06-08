"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetPrescriptionItem } from "@/lib/programs/types";

type ProgramPrescriptionEditorProps = {
  prescriptions: SetPrescriptionItem[];
  disabled?: boolean;
  onChange: (prescriptions: SetPrescriptionItem[]) => void;
  onSave: () => void;
};

export function ProgramPrescriptionEditor({
  prescriptions,
  disabled,
  onChange,
  onSave,
}: ProgramPrescriptionEditorProps) {
  function updatePrescription(
    index: number,
    field: keyof SetPrescriptionItem,
    value: string,
  ) {
    const next = prescriptions.map((prescription, idx) => {
      if (idx !== index) return prescription;
      if (field === "setNumber") {
        return { ...prescription, setNumber: Number(value) || 1 };
      }
      if (field === "restSeconds" || field === "durationSeconds") {
        return {
          ...prescription,
          [field]: value === "" ? null : Number(value),
        };
      }
      if (field === "rpe") {
        return {
          ...prescription,
          rpe: value === "" ? null : Number(value),
        };
      }
      return { ...prescription, [field]: value === "" ? null : value };
    });
    onChange(next);
  }

  function addSet() {
    const nextNumber =
      prescriptions.length > 0
        ? Math.max(...prescriptions.map((item) => item.setNumber)) + 1
        : 1;
    onChange([
      ...prescriptions,
      {
        id: `temp-${nextNumber}`,
        setNumber: nextNumber,
        load: null,
        reps: "10",
        restSeconds: 90,
        tempo: null,
        rpe: null,
        durationSeconds: null,
      },
    ]);
  }

  function removeSet(index: number) {
    onChange(
      prescriptions
        .filter((_, idx) => idx !== index)
        .map((prescription, idx) => ({
          ...prescription,
          setNumber: idx + 1,
        })),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted uppercase tracking-wide">
          Séries
        </p>
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-hairline h-7 text-xs"
            onClick={addSet}
          >
            + Série
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="text-muted border-hairline border-b">
              <th className="pb-2 pr-2 font-medium">#</th>
              <th className="pb-2 pr-2 font-medium">Charge</th>
              <th className="pb-2 pr-2 font-medium">Reps</th>
              <th className="pb-2 pr-2 font-medium">Repos (s)</th>
              <th className="pb-2 pr-2 font-medium">Tempo</th>
              <th className="pb-2 pr-2 font-medium">RPE</th>
              <th className="pb-2 pr-2 font-medium">Durée (s)</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((prescription, index) => (
              <tr key={prescription.id} className="border-hairline/60 border-b">
                <td className="font-mono py-2 pr-2">{prescription.setNumber}</td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.load ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(index, "load", event.target.value)
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                    placeholder="80kg"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.reps ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(index, "reps", event.target.value)
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                    placeholder="10"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.restSeconds ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(index, "restSeconds", event.target.value)
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.tempo ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(index, "tempo", event.target.value)
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                    placeholder="3010"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.rpe ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(index, "rpe", event.target.value)
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={prescription.durationSeconds ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updatePrescription(
                        index,
                        "durationSeconds",
                        event.target.value,
                      )
                    }
                    className="border-hairline bg-surface-elevated h-8 font-mono text-xs"
                  />
                </td>
                <td className="py-2 text-right">
                  {!disabled && prescriptions.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted h-7 text-xs"
                      onClick={() => removeSet(index)}
                    >
                      Retirer
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!disabled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-hairline"
          onClick={onSave}
        >
          Enregistrer séries
        </Button>
      ) : null}
    </div>
  );
}
