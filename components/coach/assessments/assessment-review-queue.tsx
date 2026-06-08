"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchAssessments,
  reviewAssessmentRequest,
} from "@/lib/assessments/api-client";
import type { AssessmentListItem } from "@/lib/assessments/types";
import { cn } from "@/lib/utils";

type AssessmentReviewQueueProps = {
  onReviewed?: () => void;
};

export function AssessmentReviewQueue({ onReviewed }: AssessmentReviewQueueProps) {
  const [items, setItems] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const payload = await fetchAssessments({
        status: "submitted",
        criticalOnly,
      });
      setItems(payload.items);
    } catch {
      toast.error("Impossible de charger les bilans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [criticalOnly]);

  async function handleReview(id: string) {
    setReviewingId(id);
    try {
      await reviewAssessmentRequest(id);
      toast.success("Bilan marqué comme analysé.");
      await load();
      onReviewed?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) {
    return <p className="text-muted text-sm">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <label className="text-muted flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={criticalOnly}
          onChange={(event) => setCriticalOnly(event.target.checked)}
          className="accent-primary"
        />
        Alertes critiques uniquement
      </label>

      {items.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-10 text-center">
          <p className="text-muted">Aucun bilan en attente d&apos;analyse.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={cn(
                "border-hairline bg-surface-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4",
                item.hasCriticalAlert && "border-accent-rose/50",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-title-sm text-on-dark font-semibold">
                    {item.clientName}
                  </h3>
                  {item.hasCriticalAlert ? (
                    <span className="text-accent-rose inline-flex items-center gap-1 text-xs font-semibold uppercase">
                      <AlertTriangle className="size-3.5" />
                      Alerte
                    </span>
                  ) : null}
                </div>
                <p className="text-muted mt-1 text-sm">
                  {item.templateName} · soumis{" "}
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
                {item.criticalSummary ? (
                  <p className="text-accent-rose mt-1 text-sm">
                    {item.criticalSummary}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/coach/assessments/${item.id}`}>Analyser</Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReview(item.id)}
                  disabled={reviewingId === item.id}
                >
                  Marquer analysé
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
