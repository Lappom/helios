"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchClientPendingQuestionnaires } from "@/lib/questionnaires/api-client";
import type { ClientPendingQuestionnaire } from "@/lib/questionnaires/types";

export function ClientPendingQuestionnaireBanner() {
  const [pending, setPending] = useState<ClientPendingQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const items = await fetchClientPendingQuestionnaires();
        if (!cancelled) {
          setPending(items);
        }
      } catch {
        if (!cancelled) {
          setPending([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || pending.length === 0) {
    return null;
  }

  const first = pending[0]!;

  return (
    <section className="border-hairline bg-surface-card flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FileQuestion className="size-5" />
        </div>
        <div>
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            À compléter
          </p>
          <h2 className="text-title-md text-on-dark font-semibold">
            {first.questionnaireName}
          </h2>
          {pending.length > 1 ? (
            <p className="text-muted mt-1 text-sm">
              +{pending.length - 1} autre
              {pending.length > 2 ? "s" : ""} questionnaire
              {pending.length > 2 ? "s" : ""}
            </p>
          ) : null}
        </div>
      </div>
      <Button asChild className="w-full sm:w-auto">
        <Link href={`/client/questionnaires/${first.id}`}>Compléter</Link>
      </Button>
    </section>
  );
}
