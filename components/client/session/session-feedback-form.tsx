"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScalePicker } from "@/components/ui/scale-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { STANDARD_SCALE_LABELS } from "@/lib/session-feedback/defaults";
import {
  fetchActiveFeedbackTemplate,
  submitSessionFeedbackRequest,
} from "@/lib/session-feedback/client-api";
import type { FeedbackQuestionDetail } from "@/lib/session-feedback/types";
import { cn } from "@/lib/utils";

type CustomResponseDraft = {
  questionId: string;
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
};

type SessionFeedbackFormProps = {
  sessionLogId: string;
  sessionName: string;
  onSubmitted: () => void;
  onSkip: () => void;
};

export function SessionFeedbackForm({
  sessionLogId,
  sessionName,
  onSubmitted,
  onSkip,
}: SessionFeedbackFormProps) {
  const [feeling, setFeeling] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [painReported, setPainReported] = useState(false);
  const [painDetails, setPainDetails] = useState("");
  const [comment, setComment] = useState("");
  const [customQuestions, setCustomQuestions] = useState<FeedbackQuestionDetail[]>(
    [],
  );
  const [customDrafts, setCustomDrafts] = useState<
    Record<string, CustomResponseDraft>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  useEffect(() => {
    fetchActiveFeedbackTemplate()
      .then((template) => {
        setCustomQuestions(template.questions);
      })
      .catch(() => {
        setCustomQuestions([]);
      })
      .finally(() => {
        setLoadingTemplate(false);
      });
  }, []);

  const canSubmit =
    feeling !== null &&
    difficulty !== null &&
    fatigue !== null &&
    motivation !== null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Complétez les 4 échelles avant d'envoyer.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSessionFeedbackRequest(sessionLogId, {
        feeling,
        difficulty,
        fatigue,
        motivation,
        painReported,
        painDetails: painReported ? painDetails.trim() || null : null,
        comment: comment.trim() || null,
        customResponses: customQuestions.map((question) => {
          const draft = customDrafts[question.id];
          return {
            questionId: question.id,
            textValue: draft?.textValue ?? null,
            numberValue: draft?.numberValue ?? null,
            booleanValue: draft?.booleanValue ?? null,
          };
        }),
      });
      toast.success("Feedback envoyé à votre coach.");
      onSubmitted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Envoi impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateCustomDraft(
    questionId: string,
    patch: Partial<CustomResponseDraft>,
  ) {
    setCustomDrafts((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, ...patch },
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <p className="text-caption-uppercase text-primary tracking-widest uppercase">
          Feedback séance
        </p>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Comment s&apos;est passée {sessionName} ?
        </h1>
        <p className="text-body-sm text-muted">
          Quelques secondes pour aider votre coach à ajuster votre suivi.
        </p>
      </div>

      <div className="border-hairline bg-surface-card space-y-8 rounded-lg border p-6 sm:p-8">
        <ScalePicker
          label={STANDARD_SCALE_LABELS.feeling}
          value={feeling}
          onChange={setFeeling}
          lowLabel="Très mal"
          highLabel="Excellent"
          className="animate-in fade-in duration-300"
          style={{ animationDelay: "0ms" }}
        />
        <ScalePicker
          label={STANDARD_SCALE_LABELS.difficulty}
          value={difficulty}
          onChange={setDifficulty}
          className="animate-in fade-in duration-300"
          style={{ animationDelay: "60ms" }}
        />
        <ScalePicker
          label={STANDARD_SCALE_LABELS.fatigue}
          value={fatigue}
          onChange={setFatigue}
          className="animate-in fade-in duration-300"
          style={{ animationDelay: "120ms" }}
        />
        <ScalePicker
          label={STANDARD_SCALE_LABELS.motivation}
          value={motivation}
          onChange={setMotivation}
          className="animate-in fade-in duration-300"
          style={{ animationDelay: "180ms" }}
        />

        <div
          className={cn(
            "border-hairline space-y-3 rounded-lg border p-4 transition-colors",
            painReported && "border-accent-rose/50 bg-accent-rose/5",
          )}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={painReported}
              onCheckedChange={(checked) => setPainReported(checked === true)}
            />
            <span className="text-title-sm text-on-dark font-semibold">
              J&apos;ai ressenti une douleur
            </span>
          </label>
          {painReported ? (
            <textarea
              value={painDetails}
              onChange={(event) => setPainDetails(event.target.value)}
              placeholder="Décrivez la zone et l'intensité…"
              rows={3}
              className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-rose/40"
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-title-sm text-on-dark block font-semibold">
            Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        {!loadingTemplate && customQuestions.length > 0 ? (
          <div className="border-hairline space-y-4 border-t pt-6">
            <p className="text-caption-uppercase text-muted tracking-widest uppercase">
              Questions coach
            </p>
            {customQuestions.map((question) => (
              <CustomQuestionField
                key={question.id}
                question={question}
                draft={customDrafts[question.id]}
                onChange={(patch) => updateCustomDraft(question.id, patch)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          className="h-10 w-full sm:w-auto"
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Envoi…" : "Envoyer mon feedback"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted h-10 w-full sm:w-auto"
          onClick={onSkip}
        >
          Passer
        </Button>
      </div>
    </form>
  );
}

function CustomQuestionField({
  question,
  draft,
  onChange,
}: {
  question: FeedbackQuestionDetail;
  draft?: CustomResponseDraft;
  onChange: (patch: Partial<CustomResponseDraft>) => void;
}) {
  if (question.type === "scale") {
    return (
      <ScalePicker
        label={question.label}
        value={draft?.numberValue ?? null}
        onChange={(value) => onChange({ numberValue: value })}
      />
    );
  }

  if (question.type === "boolean") {
    return (
      <div className="space-y-2">
        <p className="text-title-sm text-on-dark font-semibold">
          {question.label}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={draft?.booleanValue === true ? "default" : "outline"}
            onClick={() => onChange({ booleanValue: true })}
          >
            Oui
          </Button>
          <Button
            type="button"
            variant={draft?.booleanValue === false ? "default" : "outline"}
            onClick={() => onChange({ booleanValue: false })}
          >
            Non
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-title-sm text-on-dark block font-semibold">
        {question.label}
      </label>
      <textarea
        value={draft?.textValue ?? ""}
        onChange={(event) => onChange({ textValue: event.target.value })}
        rows={3}
        className="border-hairline bg-surface-elevated text-on-dark w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
    </div>
  );
}
