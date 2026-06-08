"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AssessmentWizardStep } from "@/components/client/assessment/assessment-wizard-step";
import { Button } from "@/components/ui/button";
import {
  fetchMyAssessment,
  submitAssessmentRequest,
  uploadAssessmentPhotoRequest,
} from "@/lib/assessments/client-api";
import type {
  AssessmentDetail,
  AssessmentFieldDetail,
} from "@/lib/assessments/types";

type ResponseDraft = {
  fieldId: string;
  textValue?: string | null;
  numberValue?: number | null;
  jsonValue?: Record<string, number> | null;
  photoBlobPath?: string | null;
  photoResponseId?: string | null;
};

type AssessmentWizardClientProps = {
  assessmentId: string;
  initialAssessment: AssessmentDetail;
};

function groupFieldsIntoSteps(fields: AssessmentFieldDetail[]) {
  const groups: AssessmentFieldDetail[][] = [];
  let current: AssessmentFieldDetail[] = [];

  for (const field of fields) {
    if (field.type === "photo" && current.some((entry) => entry.type !== "photo")) {
      groups.push(current);
      current = [field];
      continue;
    }
    if (field.type !== "photo" && current.some((entry) => entry.type === "photo")) {
      groups.push(current);
      current = [field];
      continue;
    }
    current.push(field);
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups.length > 0 ? groups : [fields];
}

export function AssessmentWizardClient({
  assessmentId,
  initialAssessment,
}: AssessmentWizardClientProps) {
  const [assessment, setAssessment] = useState(initialAssessment);
  const steps = useMemo(
    () => groupFieldsIntoSteps(assessment.fields),
    [assessment.fields],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ResponseDraft>>(() => {
    const initial: Record<string, ResponseDraft> = {};
    for (const response of initialAssessment.responses) {
      initial[response.fieldId] = {
        fieldId: response.fieldId,
        textValue: response.textValue,
        numberValue: response.numberValue,
        jsonValue: response.jsonValue,
        photoBlobPath: response.photoBlobPath,
      };
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const storageKey = `helios-assessment-draft-${assessmentId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setDrafts(JSON.parse(saved) as Record<string, ResponseDraft>);
      } catch {
        // ignore corrupt draft
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, storageKey]);

  const updateDraft = useCallback((fieldId: string, patch: Partial<ResponseDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], fieldId, ...patch },
    }));
  }, []);

  async function handlePhotoUpload(fieldId: string, file: File) {
    const result = await uploadAssessmentPhotoRequest(assessmentId, fieldId, file);
    updateDraft(fieldId, {
      photoBlobPath: result.pathname,
      photoResponseId: result.responseId,
    });
    const refreshed = await fetchMyAssessment(assessmentId);
    setAssessment(refreshed);
    toast.success("Photo enregistrée.");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const responses = assessment.fields.map((field) => {
        const draft = drafts[field.id];
        return {
          fieldId: field.id,
          textValue: draft?.textValue ?? null,
          numberValue: draft?.numberValue ?? null,
          jsonValue: draft?.jsonValue ?? null,
          photoBlobPath: draft?.photoBlobPath ?? null,
        };
      });

      await submitAssessmentRequest(assessmentId, responses);
      localStorage.removeItem(storageKey);
      toast.success("Bilan envoyé à votre coach.");
      window.location.href = "/client";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (assessment.status !== "pending") {
    return (
      <div className="border-hairline bg-surface-card mx-auto max-w-2xl rounded-lg border p-8 text-center">
        <h1 className="text-title-lg text-on-dark font-bold">Bilan déjà envoyé</h1>
        <p className="text-muted mt-2">
          Ce bilan a déjà été soumis. Merci !
        </p>
      </div>
    );
  }

  const currentStep = steps[stepIndex] ?? [];
  const isLastStep = stepIndex >= steps.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-caption-uppercase text-primary tracking-widest uppercase">
          Bilan à compléter
        </p>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          {assessment.templateName}
        </h1>
        {assessment.dueAt ? (
          <p className="text-muted text-sm">
            À rendre avant{" "}
            {new Date(assessment.dueAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        ) : null}
      </header>

      <div className="flex gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full ${
              index <= stepIndex ? "bg-primary" : "bg-surface-elevated"
            }`}
          />
        ))}
      </div>

      <AssessmentWizardStep
        fields={currentStep}
        drafts={drafts}
        assessmentId={assessmentId}
        onDraftChange={updateDraft}
        onPhotoUpload={handlePhotoUpload}
      />

      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
        >
          Précédent
        </Button>
        {isLastStep ? (
          <Button className="flex-1" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Envoi…" : "Envoyer le bilan"}
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() =>
              setStepIndex((value) => Math.min(steps.length - 1, value + 1))
            }
          >
            Suivant
          </Button>
        )}
      </div>
    </div>
  );
}
