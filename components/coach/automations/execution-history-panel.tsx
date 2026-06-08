"use client";

import { useEffect, useState } from "react";
import { fetchAutomationExecutions } from "@/lib/automations/api-client";
import type { AutomationExecutionItem } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

type ExecutionHistoryPanelProps = {
  automationId: string;
};

const STATUS_STYLES: Record<string, string> = {
  completed: "text-accent-emerald",
  failed: "text-accent-rose",
  running: "text-primary",
  pending: "text-muted",
  skipped: "text-muted",
};

export function ExecutionHistoryPanel({
  automationId,
}: ExecutionHistoryPanelProps) {
  const [executions, setExecutions] = useState<AutomationExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAutomationExecutions(automationId, { limit: 20 })
      .then((result) => {
        if (!cancelled) setExecutions(result.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [automationId]);

  return (
    <div className="border-hairline bg-surface-card h-full rounded-lg border p-5">
      <p className="text-caption-uppercase text-muted mb-4 tracking-widest uppercase">
        Historique
      </p>
      {loading ? (
        <p className="text-body-sm text-muted">Chargement…</p>
      ) : executions.length === 0 ? (
        <p className="text-body-sm text-muted">Aucune exécution pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-4">
          {executions.map((execution) => (
            <li key={execution.id} className="border-hairline border-b pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-caption font-mono font-medium uppercase",
                    STATUS_STYLES[execution.status],
                  )}
                >
                  {execution.status}
                </span>
                <span className="text-caption text-muted">
                  {new Date(execution.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="text-body-sm text-on-dark mt-1">
                {execution.clientName ?? "Sans client"}
              </p>
              {execution.error ? (
                <p className="text-body-sm text-accent-rose mt-1">{execution.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
