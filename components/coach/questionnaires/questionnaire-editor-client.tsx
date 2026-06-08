"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  createQuestionnaireQuestionRequest,
  deleteQuestionnaireQuestionRequest,
  patchQuestionnaireQuestionRequest,
  patchQuestionnaireRequest,
  patchQuestionnaireScheduleRequest,
  reorderQuestionnaireQuestionsRequest,
} from "@/lib/questionnaires/api-client";
import type {
  QuestionnaireQuestionDetail,
  QuestionnaireTree,
} from "@/lib/questionnaires/types";
import { QUESTIONNAIRE_QUESTION_TYPES } from "@/lib/validators/questionnaires";
import { cn } from "@/lib/utils";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  scale: "Échelle 1-10",
  text: "Texte",
  boolean: "Oui / Non",
  select: "Liste",
};

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

type QuestionnaireEditorClientProps = {
  initialQuestionnaire: QuestionnaireTree;
};

function SortableQuestionRow({
  question,
  selected,
  onSelect,
}: {
  question: QuestionnaireQuestionDetail;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: question.id });

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={onSelect}
      className={cn(
        "border-hairline bg-surface-card flex w-full items-center gap-3 rounded-lg border p-3 text-left",
        selected && "border-primary",
      )}
    >
      <span {...attributes} {...listeners} className="text-muted cursor-grab">
        <GripVertical className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-on-dark truncate text-sm font-medium">
          {question.label}
        </p>
        <p className="text-muted text-xs">
          {QUESTION_TYPE_LABELS[question.type]}
          {question.required ? " · requis" : ""}
        </p>
      </div>
    </button>
  );
}

function QuestionnaireEditorContent({
  initialQuestionnaire,
}: QuestionnaireEditorClientProps) {
  const [questionnaire, setQuestionnaire] = useState(initialQuestionnaire);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialQuestionnaire.questions[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const selectedQuestion = useMemo(
    () =>
      questionnaire.questions.find((q) => q.id === selectedQuestionId) ?? null,
    [questionnaire.questions, selectedQuestionId],
  );

  const questionIds = useMemo(
    () => questionnaire.questions.map((q) => q.id),
    [questionnaire.questions],
  );

  async function mutate(
    action: () => Promise<QuestionnaireTree>,
    message?: string,
  ) {
    setSaving(true);
    try {
      const updated = await action();
      setQuestionnaire(updated);
      if (!updated.questions.some((q) => q.id === selectedQuestionId)) {
        setSelectedQuestionId(updated.questions[0]?.id ?? null);
      }
      if (message) {
        toast.success(message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = questionIds.indexOf(String(active.id));
    const newIndex = questionIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextIds = arrayMove(questionIds, oldIndex, newIndex);
    await mutate(() =>
      reorderQuestionnaireQuestionsRequest(questionnaire.id, nextIds),
    );
  }

  async function handleAddQuestion(
    type: (typeof QUESTIONNAIRE_QUESTION_TYPES)[number],
  ) {
    await mutate(
      () =>
        createQuestionnaireQuestionRequest(questionnaire.id, {
          type,
          label: QUESTION_TYPE_LABELS[type] ?? type,
          required: false,
        }),
      "Question ajoutée",
    );
  }

  async function handleDeleteQuestion(questionId: string) {
    await mutate(
      () => deleteQuestionnaireQuestionRequest(questionnaire.id, questionId),
      "Question supprimée",
    );
  }

  async function updateSelectedQuestion(patch: Record<string, unknown>) {
    if (!selectedQuestion) {
      return;
    }
    await mutate(() =>
      patchQuestionnaireQuestionRequest(
        questionnaire.id,
        selectedQuestion.id,
        patch,
      ),
    );
  }

  async function handleScheduleChange(
    field: string,
    value: string | number | boolean,
  ) {
    const schedule = questionnaire.schedule;
    const triggerType =
      questionnaire.type === "onboarding"
        ? "on_client_created"
        : questionnaire.type === "weekly_checkin"
          ? "weekly_cron"
          : (schedule?.triggerType ?? "weekly_cron");

    await mutate(
      () =>
        patchQuestionnaireScheduleRequest(questionnaire.id, {
          triggerType,
          sendDayOfWeek:
            field === "sendDayOfWeek"
              ? Number(value)
              : (schedule?.sendDayOfWeek ?? 0),
          sendHourUtc:
            field === "sendHourUtc"
              ? Number(value)
              : (schedule?.sendHourUtc ?? 18),
          reminderDayOfWeek:
            field === "reminderDayOfWeek"
              ? Number(value)
              : (schedule?.reminderDayOfWeek ?? 1),
          reminderHourUtc:
            field === "reminderHourUtc"
              ? Number(value)
              : (schedule?.reminderHourUtc ?? 8),
          isActive: schedule?.isActive ?? true,
        }),
      "Planification mise à jour",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/coach/questionnaires">← Questionnaires</Link>
          </Button>
          <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
            Éditeur questionnaire
          </h1>
        </div>
        {saving ? (
          <span className="text-muted text-sm">Enregistrement…</span>
        ) : null}
      </div>

      <div className="border-hairline bg-surface-card grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div>
          <label className="text-muted mb-1 block text-xs">Nom</label>
          <Input
            value={questionnaire.name}
            onChange={(event) =>
              setQuestionnaire((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            onBlur={() =>
              mutate(() =>
                patchQuestionnaireRequest(questionnaire.id, {
                  name: questionnaire.name,
                }),
              )
            }
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-xs">Type</label>
          <p className="text-on-dark text-sm font-medium capitalize">
            {questionnaire.type.replace("_", " ")}
          </p>
        </div>
      </div>

      {questionnaire.type === "weekly_checkin" ||
      questionnaire.schedule?.triggerType === "weekly_cron" ? (
        <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
          <h2 className="text-title-sm text-on-dark font-semibold">
            Planification hebdomadaire
          </h2>
          <p className="text-muted text-sm">
            Envoi le dimanche, rappel le lundi (heures UTC).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-muted mb-1 block text-xs">
                Jour d&apos;envoi
              </label>
              <Select
                value={String(questionnaire.schedule?.sendDayOfWeek ?? 0)}
                onValueChange={(value) =>
                  void handleScheduleChange("sendDayOfWeek", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted mb-1 block text-xs">
                Heure envoi (UTC)
              </label>
              <Select
                value={String(questionnaire.schedule?.sendHourUtc ?? 18)}
                onValueChange={(value) =>
                  void handleScheduleChange("sendHourUtc", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 12, 18, 20].map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hour}h00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted mb-1 block text-xs">
                Jour rappel
              </label>
              <Select
                value={String(questionnaire.schedule?.reminderDayOfWeek ?? 1)}
                onValueChange={(value) =>
                  void handleScheduleChange("reminderDayOfWeek", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted mb-1 block text-xs">
                Heure rappel (UTC)
              </label>
              <Select
                value={String(questionnaire.schedule?.reminderHourUtc ?? 8)}
                onValueChange={(value) =>
                  void handleScheduleChange("reminderHourUtc", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 9, 12, 18].map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hour}h00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      ) : questionnaire.type === "onboarding" ? (
        <section className="border-hairline bg-surface-card rounded-lg border p-6">
          <h2 className="text-title-sm text-on-dark font-semibold">
            Planification
          </h2>
          <p className="text-muted mt-2 text-sm">
            Envoyé automatiquement à la création du client.
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUESTIONNAIRE_QUESTION_TYPES.map((type) => (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                onClick={() => void handleAddQuestion(type)}
              >
                <Plus className="mr-1 size-3.5" />
                {QUESTION_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) =>
              setActiveDragId(String(event.active.id))
            }
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {questionnaire.questions.map((question) => (
                  <SortableQuestionRow
                    key={question.id}
                    question={question}
                    selected={question.id === selectedQuestionId}
                    onSelect={() => setSelectedQuestionId(question.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <div className="border-hairline bg-surface-elevated rounded-lg border p-3 text-sm">
                  Déplacement…
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <aside className="border-hairline bg-surface-card h-fit rounded-lg border p-4">
          {selectedQuestion ? (
            <div className="space-y-4">
              <h2 className="text-title-sm text-on-dark font-semibold">
                Configuration
              </h2>
              <div>
                <label className="text-muted mb-1 block text-xs">Label</label>
                <Input
                  value={selectedQuestion.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    setQuestionnaire((prev) => ({
                      ...prev,
                      questions: prev.questions.map((q) =>
                        q.id === selectedQuestion.id ? { ...q, label } : q,
                      ),
                    }));
                  }}
                  onBlur={() =>
                    updateSelectedQuestion({ label: selectedQuestion.label })
                  }
                />
              </div>
              <label className="text-muted flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedQuestion.required}
                  onChange={(event) =>
                    updateSelectedQuestion({ required: event.target.checked })
                  }
                  className="accent-primary"
                />
                Question requise
              </label>
              <Button
                variant="secondary"
                size="sm"
                className="text-accent-rose w-full"
                onClick={() => void handleDeleteQuestion(selectedQuestion.id)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Supprimer
              </Button>
            </div>
          ) : (
            <p className="text-muted text-sm">
              Sélectionnez une question pour la configurer.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Questionnaires récurrents — Pro+
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function QuestionnaireEditorGate(props: QuestionnaireEditorClientProps) {
  return (
    <FeatureGate feature="recurring_questionnaires" fallback={<UpgradeFallback />}>
      <QuestionnaireEditorContent {...props} />
    </FeatureGate>
  );
}
