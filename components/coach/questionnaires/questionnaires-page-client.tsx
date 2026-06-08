"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/billing/feature-gate";
import { QuestionnaireSubmissionsTable } from "@/components/coach/questionnaires/questionnaire-submissions-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQuestionnaireRequest,
  fetchQuestionnaireStats,
} from "@/lib/questionnaires/api-client";
import type {
  QuestionnaireListItem,
  QuestionnaireSubmissionStats,
} from "@/lib/questionnaires/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  weekly_checkin: "Check-in hebdo",
  custom: "Personnalisé",
};

type QuestionnairesPageClientProps = {
  initialQuestionnaires: QuestionnaireListItem[];
  initialStats: QuestionnaireSubmissionStats;
};

function QuestionnairesPageContent({
  initialQuestionnaires,
  initialStats,
}: QuestionnairesPageClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"templates" | "submissions">("templates");
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void fetchQuestionnaireStats()
      .then(setStats)
      .catch(() => undefined);
  }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return questionnaires;
    }
    const query = search.trim().toLowerCase();
    return questionnaires.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [questionnaires, search]);

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await createQuestionnaireRequest({
        name: "Nouveau questionnaire",
        type: "custom",
        isActive: true,
        isDefault: false,
      });
      setQuestionnaires((prev) => [
        {
          id: created.id,
          name: created.name,
          type: created.type,
          isActive: created.isActive,
          isDefault: created.isDefault,
          questionCount: created.questions.length,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        ...prev,
      ]);
      router.push(`/coach/questionnaires/${created.id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(item: QuestionnaireListItem) {
    try {
      const response = await fetch(`/api/v1/questionnaires/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!response.ok) {
        throw new Error("Échec de la mise à jour");
      }
      setQuestionnaires((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, isActive: !row.isActive } : row,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            Suivi récurrent
          </p>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Questionnaires
          </h1>
        </div>
        {tab === "templates" ? (
          <Button onClick={() => void handleCreate()} disabled={creating}>
            <Plus className="mr-2 size-4" />
            Nouveau questionnaire
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <article className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Complétion semaine
          </p>
          <p className="text-stat-display text-primary mt-2 font-bold">
            {stats.completionRate}%
          </p>
        </article>
        <article className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            En attente
          </p>
          <p className="text-display-sm text-on-dark mt-2 font-bold">
            {stats.pendingCount}
          </p>
        </article>
        <article className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            En retard
          </p>
          <p className="text-display-sm text-accent-rose mt-2 font-bold">
            {stats.overdueCount}
          </p>
        </article>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={cn(
            "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            tab === "templates"
              ? "bg-surface-card text-on-dark"
              : "text-muted hover:text-on-dark",
          )}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setTab("submissions")}
          className={cn(
            "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            tab === "submissions"
              ? "bg-surface-card text-on-dark"
              : "text-muted hover:text-on-dark",
          )}
        >
          Soumissions
        </button>
      </div>

      {tab === "templates" ? (
        <>
          <Input
            placeholder="Rechercher un questionnaire…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="border-hairline bg-surface-card rounded-lg border p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title-md text-on-dark font-semibold">
                      {item.name}
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      {TYPE_LABELS[item.type]} · {item.questionCount} question
                      {item.questionCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                      item.isActive
                        ? "bg-accent-emerald/20 text-accent-emerald"
                        : "bg-surface-elevated text-muted",
                    )}
                  >
                    {item.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/coach/questionnaires/${item.id}/edit`}>
                      <Pencil className="mr-1.5 size-3.5" />
                      Éditer
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleToggleActive(item)}
                  >
                    {item.isActive ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="border-hairline bg-surface-card rounded-lg border p-10 text-center">
              <FileQuestion className="text-muted mx-auto size-10" />
              <p className="text-muted mt-3">Aucun questionnaire pour le moment.</p>
            </div>
          ) : null}
        </>
      ) : (
        <QuestionnaireSubmissionsTable />
      )}
    </div>
  );
}

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Questionnaires récurrents — Pro+
      </p>
      <p className="text-body-sm text-muted mx-auto max-w-md">
        Créez des check-ins hebdomadaires et des questionnaires d&apos;onboarding
        automatisés avec un plan Pro ou supérieur.
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function QuestionnairesPageGate(props: QuestionnairesPageClientProps) {
  return (
    <FeatureGate feature="recurring_questionnaires" fallback={<UpgradeFallback />}>
      <QuestionnairesPageContent {...props} />
    </FeatureGate>
  );
}
