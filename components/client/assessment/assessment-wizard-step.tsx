"use client";

import type { AssessmentFieldDetail } from "@/lib/assessments/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MEASUREMENT_KEYS = [
  { key: "weight", label: "Poids (kg)" },
  { key: "chest", label: "Poitrine (cm)" },
  { key: "waist", label: "Taille (cm)" },
  { key: "hips", label: "Hanches (cm)" },
  { key: "arms", label: "Bras (cm)" },
];

type ResponseDraft = {
  fieldId: string;
  textValue?: string | null;
  numberValue?: number | null;
  jsonValue?: Record<string, number> | null;
  photoBlobPath?: string | null;
  photoResponseId?: string | null;
};

type AssessmentWizardStepProps = {
  fields: AssessmentFieldDetail[];
  drafts: Record<string, ResponseDraft>;
  assessmentId: string;
  onDraftChange: (fieldId: string, patch: Partial<ResponseDraft>) => void;
  onPhotoUpload: (fieldId: string, file: File) => Promise<void>;
};

export function AssessmentWizardStep({
  fields,
  drafts,
  assessmentId,
  onDraftChange,
  onPhotoUpload,
}: AssessmentWizardStepProps) {
  return (
    <div className="border-hairline bg-surface-card space-y-5 rounded-lg border p-6">
      {fields.map((field) => {
        const draft = drafts[field.id];

        if (field.type === "text") {
          return (
            <div key={field.id}>
              <label className="text-title-sm text-on-dark mb-2 block font-semibold">
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <textarea
                value={draft?.textValue ?? ""}
                onChange={(event) =>
                  onDraftChange(field.id, { textValue: event.target.value })
                }
                rows={4}
                className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
          );
        }

        if (field.type === "number") {
          return (
            <div key={field.id}>
              <label className="text-title-sm text-on-dark mb-2 block font-semibold">
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <Input
                type="number"
                value={draft?.numberValue ?? ""}
                onChange={(event) =>
                  onDraftChange(field.id, {
                    numberValue: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
            </div>
          );
        }

        if (field.type === "measurement") {
          const keys =
            field.config?.measurementKeys?.map((key) => ({
              key,
              label:
                MEASUREMENT_KEYS.find((entry) => entry.key === key)?.label ??
                key,
            })) ?? MEASUREMENT_KEYS;

          return (
            <div key={field.id} className="space-y-3">
              <p className="text-title-sm text-on-dark font-semibold">
                {field.label}
                {field.required ? " *" : ""}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {keys.map((entry) => (
                  <div key={entry.key}>
                    <label className="text-muted mb-1 block text-xs">
                      {entry.label}
                    </label>
                    <Input
                      type="number"
                      value={draft?.jsonValue?.[entry.key] ?? ""}
                      onChange={(event) => {
                        const next = {
                          ...(draft?.jsonValue ?? {}),
                          [entry.key]: event.target.value
                            ? Number(event.target.value)
                            : 0,
                        };
                        onDraftChange(field.id, { jsonValue: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === "photo") {
          const previewUrl = draft?.photoResponseId
            ? `/api/v1/assessments/${assessmentId}/photos/${draft.photoResponseId}`
            : null;

          return (
            <div key={field.id} className="space-y-3">
              <div>
                <p className="text-title-sm text-on-dark font-semibold">
                  {field.label}
                  {field.required ? " *" : ""}
                </p>
                {field.config?.photoPose ? (
                  <p className="text-muted mt-1 text-sm">
                    Pose : {field.config.photoPose}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "border-hairline bg-surface-elevated relative overflow-hidden rounded-lg border",
                  "flex min-h-48 items-center justify-center",
                )}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={field.label}
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <p className="text-muted text-sm">
                    Cadrez-vous selon la pose indiquée
                  </p>
                )}
              </div>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onPhotoUpload(field.id, file);
                  }
                }}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
