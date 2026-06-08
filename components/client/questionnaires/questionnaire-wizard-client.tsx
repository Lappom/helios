"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitQuestionnaireRequest } from "@/lib/questionnaires/api-client";
import type { QuestionnaireSubmissionDetail } from "@/lib/questionnaires/types";

type ResponseDraft = {
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
};

type QuestionnaireWizardClientProps = {
  submissionId: string;
  initialSubmission: QuestionnaireSubmissionDetail;
};

function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-title-sm text-on-dark font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`border-hairline size-9 rounded-md border text-sm font-semibold transition-colors ${
              value === n
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-elevated text-on-dark hover:border-primary/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuestionnaireWizardClient({
  submissionId,
  initialSubmission,
}: QuestionnaireWizardClientProps) {
  const router = useRouter();
  const questions = initialSubmission.questions;
  const steps = useMemo(() => {
    const groups: typeof questions[] = [];
    for (let index = 0; index < questions.length; index += 3) {
      groups.push(questions.slice(index, index + 3));
    }
    return groups.length > 0 ? groups : [questions];
  }, [questions]);

  const [stepIndex, setStepIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ResponseDraft>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentStep = steps[stepIndex] ?? [];

  function updateDraft(questionId: string, patch: Partial<ResponseDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...patch },
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const responses = questions.map((question) => ({
        questionId: question.id,
        textValue: drafts[question.id]?.textValue ?? null,
        numberValue: drafts[question.id]?.numberValue ?? null,
        booleanValue: drafts[question.id]?.booleanValue ?? null,
      }));

      await submitQuestionnaireRequest(submissionId, { responses });
      toast.success("Questionnaire envoyé.");
      router.push("/client");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialSubmission.status === "submitted") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Questionnaire déjà complété
        </h1>
        <Button asChild variant="secondary">
          <Link href="/client">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-caption-uppercase text-primary tracking-widest uppercase">
          Questionnaire
        </p>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          {initialSubmission.questionnaireName}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Étape {stepIndex + 1} sur {steps.length}
        </p>
      </header>

      <div className="border-hairline bg-surface-card space-y-6 rounded-lg border p-6">
        {currentStep.map((question) => {
          const draft = drafts[question.id];

          if (question.type === "scale") {
            return (
              <ScalePicker
                key={question.id}
                label={`${question.label}${question.required ? " *" : ""}`}
                value={draft?.numberValue ?? null}
                onChange={(value) =>
                  updateDraft(question.id, { numberValue: value })
                }
              />
            );
          }

          if (question.type === "boolean") {
            return (
              <div key={question.id} className="space-y-2">
                <p className="text-title-sm text-on-dark font-semibold">
                  {question.label}
                  {question.required ? " *" : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={draft?.booleanValue === true ? "default" : "outline"}
                    onClick={() =>
                      updateDraft(question.id, { booleanValue: true })
                    }
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={
                      draft?.booleanValue === false ? "default" : "outline"
                    }
                    onClick={() =>
                      updateDraft(question.id, { booleanValue: false })
                    }
                  >
                    Non
                  </Button>
                </div>
              </div>
            );
          }

          if (question.type === "select" && question.options?.length) {
            return (
              <div key={question.id} className="space-y-2">
                <label className="text-title-sm text-on-dark block font-semibold">
                  {question.label}
                  {question.required ? " *" : ""}
                </label>
                <select
                  value={draft?.textValue ?? ""}
                  onChange={(event) =>
                    updateDraft(question.id, { textValue: event.target.value })
                  }
                  className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Choisir…</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={question.id}>
              <label className="text-title-sm text-on-dark mb-2 block font-semibold">
                {question.label}
                {question.required ? " *" : ""}
              </label>
              <textarea
                value={draft?.textValue ?? ""}
                onChange={(event) =>
                  updateDraft(question.id, { textValue: event.target.value })
                }
                rows={4}
                className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStepIndex((prev) => prev - 1)}
          >
            Précédent
          </Button>
        ) : null}
        {stepIndex < steps.length - 1 ? (
          <Button type="button" onClick={() => setStepIndex((prev) => prev + 1)}>
            Suivant
          </Button>
        ) : (
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Envoi…" : "Envoyer"}
          </Button>
        )}
      </div>
    </div>
  );
}
