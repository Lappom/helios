"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SessionFeedbackForm } from "@/components/client/session/session-feedback-form";
import { SessionExerciseCard } from "@/components/client/session/session-exercise-card";
import { SessionStatusBadge } from "@/components/client/session-status-badge";
import { Button } from "@/components/ui/button";
import {
  completeSessionRequest,
  startSessionRequest,
} from "@/lib/sessions/api-client";
import type { SessionExecutionDetail, SessionRecap } from "@/lib/sessions/types";
import { toScheduledDateKey } from "@/lib/sessions/utils";

type SessionExecutionClientProps = {
  initialDetail: SessionExecutionDetail;
  scheduledDateKey: string;
};

export function SessionExecutionClient({
  initialDetail,
  scheduledDateKey,
}: SessionExecutionClientProps) {
  const [detail, setDetail] = useState(initialDetail);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [recap, setRecap] = useState<SessionRecap | null>(null);
  const [feedbackPhase, setFeedbackPhase] = useState<"form" | "done">("form");
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);

  const isActive = detail.sessionLog?.status === "in_progress";
  const isCompleted = detail.sessionLog?.status === "completed";

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      const updated = await startSessionRequest(
        detail.programSessionId,
        scheduledDateKey,
      );
      setDetail(updated);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de démarrer la séance.",
      );
    } finally {
      setStarting(false);
    }
  }, [detail.programSessionId, scheduledDateKey]);

  const handleComplete = useCallback(async () => {
    if (!detail.sessionLog) {
      return;
    }

    setCompleting(true);
    try {
      const result = await completeSessionRequest(
        detail.programSessionId,
        detail.sessionLog.id,
      );
      setDetail(result.detail);
      setRecap(result.recap);
      setFeedbackPhase("form");
      setFeedbackSkipped(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de terminer la séance.",
      );
    } finally {
      setCompleting(false);
    }
  }, [detail.programSessionId, detail.sessionLog]);

  if (recap) {
    const sessionLogId = detail.sessionLog?.id;

    if (feedbackPhase === "form" && sessionLogId && !feedbackSkipped) {
      return (
        <div className="mx-auto max-w-3xl">
          <SessionFeedbackForm
            sessionLogId={sessionLogId}
            sessionName={detail.sessionName}
            onSubmitted={() => setFeedbackPhase("done")}
            onSkip={() => setFeedbackSkipped(true)}
          />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            Séance terminée
          </p>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            {detail.sessionName}
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <RecapStat label="Durée" value={formatDuration(recap.durationSeconds)} />
          <RecapStat
            label="Sets"
            value={`${recap.setsCompleted}`}
            hint={recap.setsSkipped > 0 ? `${recap.setsSkipped} passés` : undefined}
          />
          <RecapStat
            label="Exercices"
            value={`${recap.exercisesCompleted}/${recap.exercisesTotal}`}
          />
        </div>

        {feedbackPhase === "done" ? (
          <p className="text-body-sm text-primary font-medium">
            Merci pour votre feedback — votre coach en sera informé.
          </p>
        ) : feedbackSkipped ? (
          <p className="text-body-sm text-muted">
            Vous pourrez partager votre ressenti lors d&apos;une prochaine séance.
          </p>
        ) : null}

        <Button asChild className="h-10 w-full sm:w-auto">
          <Link href="/client">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            {detail.weekLabel}
          </p>
          {detail.sessionLog ? (
            <SessionStatusBadge
              status={
                isCompleted
                  ? "completed"
                  : isActive
                    ? "in_progress"
                    : "planned"
              }
            />
          ) : (
            <SessionStatusBadge status="planned" />
          )}
        </div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          {detail.sessionName}
        </h1>
        <p className="text-body-md text-muted">
          {new Date(detail.scheduledDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </header>

      {!detail.sessionLog && !isCompleted ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-body-md text-muted mb-4">
            Prêt à commencer ? Vos sets seront enregistrés au fur et à mesure.
          </p>
          <Button
            className="h-10 w-full sm:w-auto"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? "Démarrage…" : "Démarrer la séance"}
          </Button>
        </div>
      ) : null}

      <div className="space-y-4">
        {detail.blocks.flatMap((block) =>
          block.exercises.map((exercise) => (
            <SessionExerciseCard
              key={exercise.id}
              block={block}
              exercise={exercise}
              detail={detail}
              setLogs={detail.setLogs}
              onUpdated={setDetail}
            />
          )),
        )}
      </div>

      {isActive ? (
        <div className="border-hairline bg-surface-card sticky bottom-20 z-40 rounded-lg border p-4 md:bottom-6">
          <Button
            className="h-10 w-full"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? "Finalisation…" : "Terminer la séance"}
          </Button>
        </div>
      ) : null}

      {isCompleted && !recap ? (
        <p className="text-body-sm text-muted">
          Cette séance est déjà terminée (
          {detail.sessionLog?.completedAt
            ? new Date(detail.sessionLog.completedAt).toLocaleString("fr-FR")
            : toScheduledDateKey(detail.scheduledDate)}
          ).
        </p>
      ) : null}
    </div>
  );
}

function RecapStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-hairline bg-surface-card rounded-lg border p-5">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        {label}
      </p>
      <p className="text-primary text-stat-display font-bold">{value}</p>
      {hint ? <p className="text-body-sm text-muted">{hint}</p> : null}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
