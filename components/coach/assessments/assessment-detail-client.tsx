"use client";

import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AssessmentCompareView } from "@/components/coach/assessments/assessment-compare-view";
import { Button } from "@/components/ui/button";
import {
  assessmentReportPdfUrl,
  assessmentPhotoUrl,
  reviewAssessmentRequest,
} from "@/lib/assessments/api-client";
import type {
  AssessmentCompareResult,
  AssessmentDetail,
} from "@/lib/assessments/types";

type AssessmentDetailClientProps = {
  initialAssessment: AssessmentDetail;
  initialCompare: AssessmentCompareResult;
};

export function AssessmentDetailClient({
  initialAssessment,
  initialCompare,
}: AssessmentDetailClientProps) {
  const [assessment, setAssessment] = useState(initialAssessment);
  const [compare] = useState(initialCompare);
  const [reviewing, setReviewing] = useState(false);

  async function handleReview() {
    setReviewing(true);
    try {
      const updated = await reviewAssessmentRequest(assessment.id);
      setAssessment(updated);
      toast.success("Bilan marqué comme analysé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/coach/assessments">← Bilans</Link>
          </Button>
          <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
            {assessment.clientName}
          </h1>
          <p className="text-muted mt-1">
            {assessment.templateName} · {assessment.status}
          </p>
          {assessment.hasCriticalAlert ? (
            <p className="text-accent-rose mt-2 inline-flex items-center gap-1 text-sm font-semibold">
              <AlertTriangle className="size-4" />
              {assessment.criticalSummary}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <a href={assessmentReportPdfUrl(assessment.id)} download>
              <Download className="mr-2 size-4" />
              PDF
            </a>
          </Button>
          {assessment.status === "submitted" ? (
            <Button onClick={handleReview} disabled={reviewing}>
              Marquer analysé
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link
              href={`/coach/clients/${assessment.clientId}/assessments/compare`}
            >
              Comparer
            </Link>
          </Button>
        </div>
      </div>

      <section className="border-hairline bg-surface-card rounded-lg border p-6">
        <h2 className="text-title-md text-on-dark mb-4 font-semibold">
          Réponses
        </h2>
        <div className="space-y-3">
          {assessment.responses.map((response) => {
            let value = "—";
            if (response.textValue) {
              value = response.textValue;
            } else if (response.numberValue !== null) {
              value = String(response.numberValue);
            } else if (response.jsonValue) {
              value = Object.entries(response.jsonValue)
                .map(([key, entry]) => `${key}: ${entry}`)
                .join(" · ");
            } else if (response.photoBlobPath) {
              value = "Photo";
            }

            return (
              <div
                key={response.id}
                className="border-hairline flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0"
              >
                <span className="text-muted text-sm">{response.field.label}</span>
                {response.photoBlobPath ? (
                  <img
                    src={assessmentPhotoUrl(assessment.id, response.id)}
                    alt={response.field.label}
                    className="bg-surface-elevated size-32 rounded-md object-cover"
                  />
                ) : (
                  <span className="text-on-dark text-sm font-medium">{value}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <AssessmentCompareView compare={compare} />
    </div>
  );
}
