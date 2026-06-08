"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchClientFeedbacks } from "@/lib/session-feedback/api-client";
import type { SessionFeedbackListItem } from "@/lib/session-feedback/types";
import { cn } from "@/lib/utils";

type ClientFeedbackCardProps = {
  clientId: string;
};

export function ClientFeedbackCard({ clientId }: ClientFeedbackCardProps) {
  const [feelingAverageLast4, setFeelingAverageLast4] = useState<number | null>(
    null,
  );
  const [items, setItems] = useState<SessionFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchClientFeedbacks(clientId, { limit: 10 })
      .then((payload) => {
        setFeelingAverageLast4(payload.feelingAverageLast4);
        setItems(payload.items);
      })
      .catch(() => {
        toast.error("Impossible de charger les feedbacks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId]);

  return (
    <section className="border-hairline bg-surface-card space-y-5 rounded-lg border p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold">
            Feedbacks séance
          </h2>
          <p className="text-body-sm text-muted mt-1">
            Ressenti post-séance sur les dernières séances complétées.
          </p>
        </div>
        {feelingAverageLast4 !== null ? (
          <div className="text-right">
            <p className="text-caption-uppercase text-muted tracking-widest uppercase">
              Ressenti moyen · 4 séances
            </p>
            <p className="text-stat-display text-primary font-bold tracking-tight">
              {feelingAverageLast4}
              <span className="text-title-md text-muted ml-1 font-semibold">
                /10
              </span>
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm">Aucun feedback pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "border-hairline bg-surface-elevated rounded-lg border p-4",
                item.painReported && "border-accent-rose/50",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-on-dark text-sm font-semibold">
                    {item.sessionName ?? "Séance"}
                  </p>
                  <p className="text-muted text-xs">
                    {formatSessionDate(item.scheduledDate)}
                  </p>
                </div>
                {item.painReported ? (
                  <span className="text-accent-rose inline-flex items-center gap-1 text-xs font-semibold">
                    <AlertTriangle className="size-3.5" />
                    Douleur
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniScale label="Ressenti" value={item.feeling} />
                <MiniScale label="Difficulté" value={item.difficulty} />
                <MiniScale label="Fatigue" value={item.fatigue} />
                <MiniScale label="Motivation" value={item.motivation} />
              </div>
              {item.painDetails ? (
                <p className="text-accent-rose mt-2 text-sm">{item.painDetails}</p>
              ) : null}
              {item.comment ? (
                <p className="text-body-sm text-muted mt-2">{item.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MiniScale({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-hairline rounded-md border px-2 py-1.5">
      <p className="text-muted text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-on-dark text-sm font-semibold">{value}/10</p>
    </div>
  );
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
