"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { AssignAssessmentDialog } from "@/components/coach/assessments/assign-assessment-dialog";
import { Button } from "@/components/ui/button";
import type { AssessmentListItem } from "@/lib/assessments/types";

type ClientActiveAssessmentsCardProps = {
  clientId: string;
  clientName: string;
};

export function ClientActiveAssessmentsCard({
  clientId,
  clientName,
}: ClientActiveAssessmentsCardProps) {
  const [items, setItems] = useState<AssessmentListItem[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  async function load() {
    const search = new URLSearchParams({
      limit: "10",
      clientId,
    });
    const response = await fetch(`/api/v1/assessments?${search.toString()}`);
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { items: AssessmentListItem[] };
    setItems(payload.items.slice(0, 3));
  }

  useEffect(() => {
    void load();
  }, [clientId]);

  const latest = items[0];

  return (
    <>
      <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-title-sm text-on-dark font-semibold">Bilans</h2>
            <p className="text-body-sm text-muted mt-1">
              Suivi mensuel et comparaisons.
            </p>
          </div>
          <ClipboardList className="text-muted size-5" />
        </div>

        {latest ? (
          <div className="border-hairline bg-surface-elevated rounded-lg border p-3">
            <p className="text-on-dark text-sm font-medium">
              {latest.templateName}
            </p>
            <p className="text-muted mt-1 text-xs capitalize">
              {latest.status}
              {latest.hasCriticalAlert ? " · alerte douleur" : ""}
            </p>
          </div>
        ) : (
          <p className="text-muted text-sm">Aucun bilan assigné.</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            Assigner un bilan
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/coach/clients/${clientId}/assessments/compare`}>
              Comparer
            </Link>
          </Button>
        </div>
      </section>

      <AssignAssessmentDialog
        clientId={clientId}
        clientName={clientName}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={load}
      />
    </>
  );
}
