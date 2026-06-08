"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchFeedbackAlerts } from "@/lib/session-feedback/api-client";
import type { FeedbackAlertItem } from "@/lib/session-feedback/types";
import { cn } from "@/lib/utils";

export function FeedbackAlertsPanel() {
  const [items, setItems] = useState<FeedbackAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFeedbackAlerts({ limit: 5 })
      .then((payload) => {
        setItems(payload.items);
      })
      .catch(() => {
        toast.error("Impossible de charger les alertes feedback.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="border-hairline bg-surface-card rounded-lg border p-6">
        <p className="text-muted text-sm">Chargement des alertes…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
      <div>
        <h2 className="text-title-md text-on-dark font-semibold">
          Alertes douleur
        </h2>
        <p className="text-body-sm text-muted mt-1">
          Feedbacks séance signalant une douleur.
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "border-hairline bg-surface-elevated rounded-lg border p-4",
              "border-accent-rose/50",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/coach/clients/${item.clientId}`}
                  className="text-on-dark text-sm font-semibold hover:text-primary"
                >
                  {item.clientName}
                </Link>
                <p className="text-muted mt-0.5 text-xs">
                  {item.sessionName ?? "Séance"} ·{" "}
                  {formatDate(item.submittedAt)}
                </p>
              </div>
              <span className="text-accent-rose inline-flex items-center gap-1 text-xs font-semibold">
                <AlertTriangle className="size-3.5" />
                Douleur
              </span>
            </div>
            {item.painDetails ? (
              <p className="text-accent-rose mt-2 text-sm">{item.painDetails}</p>
            ) : (
              <p className="text-muted mt-2 text-sm">
                Ressenti {item.feeling}/10 — détails non renseignés.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
