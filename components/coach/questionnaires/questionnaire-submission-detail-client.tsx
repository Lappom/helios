"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { QuestionnaireSubmissionDetail } from "@/lib/questionnaires/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  submitted: "Soumis",
  overdue: "En retard",
};

type QuestionnaireSubmissionDetailClientProps = {
  submission: QuestionnaireSubmissionDetail;
};

export function QuestionnaireSubmissionDetailClient({
  submission,
}: QuestionnaireSubmissionDetailClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/coach/questionnaires">← Questionnaires</Link>
        </Button>
        <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
          {submission.questionnaireName}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {submission.clientName} · {submission.periodKey} ·{" "}
          {STATUS_LABELS[submission.status]}
        </p>
      </div>

      <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
        {submission.responses.map((response) => (
          <div
            key={response.questionId}
            className="border-hairline border-b pb-4 last:border-0 last:pb-0"
          >
            <p className="text-title-sm text-on-dark font-semibold">
              {response.label}
            </p>
            <p className="text-body-md text-muted mt-2">
              {formatResponse(response)}
            </p>
          </div>
        ))}
        {submission.responses.length === 0 ? (
          <p className="text-muted text-sm">
            Aucune réponse — le client n&apos;a pas encore soumis ce
            questionnaire.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatResponse(response: {
  type: string;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
}): string {
  if (response.type === "boolean") {
    if (response.booleanValue === true) return "Oui";
    if (response.booleanValue === false) return "Non";
    return "—";
  }
  if (response.type === "scale" || response.type === "number") {
    return response.numberValue !== null ? String(response.numberValue) : "—";
  }
  return response.textValue?.trim() || "—";
}
