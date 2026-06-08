"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchMyPendingAssessments } from "@/lib/assessments/client-api";
import type { ClientPendingAssessment } from "@/lib/assessments/types";

export function ClientPendingAssessmentBanner() {
  const [pending, setPending] = useState<ClientPendingAssessment[]>([]);

  useEffect(() => {
    fetchMyPendingAssessments()
      .then((payload) => setPending(payload.items))
      .catch(() => setPending([]));
  }, []);

  if (pending.length === 0) {
    return null;
  }

  const next = pending[0];

  return (
    <section className="border-hairline bg-surface-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <ClipboardList className="text-primary mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            Action requise
          </p>
          <h2 className="text-title-sm text-on-dark mt-1 font-semibold">
            Bilan à compléter · {next.templateName}
          </h2>
          {next.dueAt ? (
            <p className="text-muted mt-1 text-sm">
              Échéance{" "}
              {new Date(next.dueAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </p>
          ) : null}
        </div>
      </div>
      <Button asChild>
        <Link href={`/client/assessment/${next.id}`}>Compléter</Link>
      </Button>
    </section>
  );
}
