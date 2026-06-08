"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchQuestionnaireSubmissions } from "@/lib/questionnaires/api-client";
import type { QuestionnaireSubmissionListItem } from "@/lib/questionnaires/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  submitted: "Soumis",
  overdue: "En retard",
};

export function QuestionnaireSubmissionsTable() {
  const [items, setItems] = useState<QuestionnaireSubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const payload = await fetchQuestionnaireSubmissions({
          status: status === "all" ? undefined : status,
        });
        if (!cancelled) {
          setItems(payload.items);
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les soumissions.");
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
  }, [status]);

  if (loading) {
    return <p className="text-muted text-sm">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="submitted">Soumis</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-10 text-center">
          <p className="text-muted text-sm">Aucune soumission pour le moment.</p>
        </div>
      ) : (
        <div className="border-hairline overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-soft text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Questionnaire</th>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Soumis le</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-hairline border-t bg-surface-card"
                >
                  <td className="text-on-dark px-4 py-3 font-medium">
                    {item.clientName}
                  </td>
                  <td className="text-body px-4 py-3">{item.questionnaireName}</td>
                  <td className="text-muted px-4 py-3">{item.periodKey}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                        item.status === "submitted" &&
                          "bg-accent-emerald/20 text-accent-emerald",
                        item.status === "pending" &&
                          "bg-surface-elevated text-muted",
                        item.status === "overdue" &&
                          "bg-accent-rose/20 text-accent-rose",
                      )}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="text-muted px-4 py-3">
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/coach/questionnaires/submissions/${item.id}`}>
                        Voir
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
