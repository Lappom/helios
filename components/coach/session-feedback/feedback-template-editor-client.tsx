"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/billing/feature-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFeedbackQuestionRequest,
  deleteFeedbackQuestionRequest,
  patchFeedbackTemplateRequest,
} from "@/lib/session-feedback/api-client";
import type { FeedbackTemplateTree } from "@/lib/session-feedback/types";
import { MAX_CUSTOM_QUESTIONS } from "@/lib/session-feedback/defaults";
import { FEEDBACK_QUESTION_TYPES } from "@/lib/validators/session-feedback";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  scale: "Échelle 1-10",
  text: "Texte",
  boolean: "Oui / Non",
};

type FeedbackTemplateEditorClientProps = {
  initialTemplate: FeedbackTemplateTree;
};

export function FeedbackTemplateEditorClient({
  initialTemplate,
}: FeedbackTemplateEditorClientProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [templateName, setTemplateName] = useState(initialTemplate.name);
  const [savingName, setSavingName] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<"scale" | "text" | "boolean">("scale");
  const [newLabel, setNewLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSaveName() {
    if (!templateName.trim()) {
      return;
    }

    setSavingName(true);
    try {
      const updated = await patchFeedbackTemplateRequest(template.id, {
        name: templateName.trim(),
      });
      setTemplate(updated);
      toast.success("Template enregistré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAddQuestion() {
    if (!newLabel.trim()) {
      return;
    }

    setAdding(true);
    try {
      const updated = await createFeedbackQuestionRequest(template.id, {
        type: newType,
        label: newLabel.trim(),
        required: false,
      });
      setTemplate(updated);
      setNewLabel("");
      toast.success("Question ajoutée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    setDeletingId(questionId);
    try {
      const updated = await deleteFeedbackQuestionRequest(
        template.id,
        questionId,
      );
      setTemplate(updated);
      toast.success("Question supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = template.questions.length >= MAX_CUSTOM_QUESTIONS;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/coach/settings"
          className="text-body-sm text-muted hover:text-primary transition-colors"
        >
          ← Paramètres
        </Link>
        <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
          Template feedback séance
        </h1>
        <p className="text-body-md text-muted mt-2">
          Les champs ressenti, difficulté, fatigue, motivation et douleur sont
          toujours inclus. Ajoutez jusqu&apos;à {MAX_CUSTOM_QUESTIONS} questions
          personnalisées (Pro+).
        </p>
      </div>

      <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
        <h2 className="text-title-sm text-on-dark font-semibold">
          Nom du template
        </h2>
        <div className="flex flex-wrap gap-3">
          <Input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            className="max-w-md"
          />
          <Button disabled={savingName} onClick={() => void handleSaveName()}>
            {savingName ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </section>

      <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
        <h2 className="text-title-sm text-on-dark font-semibold">
          Questions personnalisées ({template.questions.length}/
          {MAX_CUSTOM_QUESTIONS})
        </h2>

        {template.questions.length === 0 ? (
          <p className="text-muted text-sm">Aucune question custom.</p>
        ) : (
          <ul className="space-y-2">
            {template.questions.map((question) => (
              <li
                key={question.id}
                className="border-hairline bg-surface-elevated flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-on-dark text-sm font-medium">
                    {question.label}
                  </p>
                  <p className="text-muted text-xs">
                    {QUESTION_TYPE_LABELS[question.type]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === question.id}
                  onClick={() => void handleDeleteQuestion(question.id)}
                  aria-label="Supprimer la question"
                >
                  <Trash2 className="text-accent-rose size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!atLimit ? (
          <div className="border-hairline space-y-3 rounded-lg border border-dashed p-4">
            <p className="text-title-sm text-on-dark font-semibold">
              Nouvelle question
            </p>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
              <Select
                value={newType}
                onValueChange={(value) =>
                  setNewType(value as "scale" | "text" | "boolean")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_QUESTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {QUESTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                placeholder="Libellé de la question"
              />
              <Button
                disabled={adding || !newLabel.trim()}
                onClick={() => void handleAddQuestion()}
              >
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">
            Limite de {MAX_CUSTOM_QUESTIONS} questions atteinte.
          </p>
        )}
      </section>
    </div>
  );
}

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Templates custom — Pro+
      </p>
      <p className="text-body-sm text-muted mx-auto max-w-md">
        Personnalisez les questions de feedback post-séance avec un plan Pro ou
        supérieur.
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function FeedbackTemplateEditorGate(
  props: FeedbackTemplateEditorClientProps,
) {
  return (
    <FeatureGate feature="custom_session_feedback" fallback={<UpgradeFallback />}>
      <FeedbackTemplateEditorClient {...props} />
    </FeatureGate>
  );
}
