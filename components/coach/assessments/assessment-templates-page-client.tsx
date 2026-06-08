"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AssessmentReviewQueue } from "@/components/coach/assessments/assessment-review-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAssessmentTemplateRequest,
  fetchAssessmentTemplates,
} from "@/lib/assessments/api-client";
import type { AssessmentTemplateListItem } from "@/lib/assessments/types";
import { cn } from "@/lib/utils";

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Unique",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  custom: "Personnalisé",
};

type AssessmentTemplatesPageClientProps = {
  initialTemplates: AssessmentTemplateListItem[];
};

export function AssessmentTemplatesPageClient({
  initialTemplates,
}: AssessmentTemplatesPageClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"templates" | "review">("templates");
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return templates;
    }
    const query = search.trim().toLowerCase();
    return templates.filter((template) =>
      template.name.toLowerCase().includes(query),
    );
  }, [search, templates]);

  async function handleCreate() {
    setCreating(true);
    try {
      const template = await createAssessmentTemplateRequest({
        name: "Nouveau template bilan",
        frequency: "monthly",
      });
      setTemplates((prev) => [
        {
          id: template.id,
          name: template.name,
          frequency: template.frequency,
          autoAssignOnProgramStart: template.autoAssignOnProgramStart,
          daysAfterProgramStart: template.daysAfterProgramStart,
          isDefault: template.isDefault,
          fieldCount: template.fields.length,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
        ...prev,
      ]);
      router.push(`/coach/assessments/templates/${template.id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function refreshTemplates() {
    const payload = await fetchAssessmentTemplates();
    setTemplates(payload.items);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            Suivi client
          </p>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Bilans
          </h1>
        </div>
        {tab === "templates" ? (
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="mr-2 size-4" />
            Nouveau template
          </Button>
        ) : null}
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
          onClick={() => setTab("review")}
          className={cn(
            "rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            tab === "review"
              ? "bg-surface-card text-on-dark"
              : "text-muted hover:text-on-dark",
          )}
        >
          À analyser
        </button>
      </div>

      {tab === "templates" ? (
        <>
          <Input
            placeholder="Rechercher un template…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <article
                key={template.id}
                className="border-hairline bg-surface-card rounded-lg border p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-title-md text-on-dark font-semibold">
                      {template.name}
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      {FREQUENCY_LABELS[template.frequency]} ·{" "}
                      {template.fieldCount} champ
                      {template.fieldCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  {template.isDefault ? (
                    <span className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-xs font-semibold uppercase">
                      Défaut
                    </span>
                  ) : null}
                </div>
                {template.autoAssignOnProgramStart ? (
                  <p className="text-muted mt-3 text-xs">
                    Auto J+{template.daysAfterProgramStart} après assignation
                    programme
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link
                      href={`/coach/assessments/templates/${template.id}/edit`}
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      Éditer
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="border-hairline bg-surface-card rounded-lg border p-10 text-center">
              <ClipboardList className="text-muted mx-auto size-10" />
              <p className="text-muted mt-3">Aucun template pour le moment.</p>
            </div>
          ) : null}
        </>
      ) : (
        <AssessmentReviewQueue onReviewed={refreshTemplates} />
      )}
    </div>
  );
}
