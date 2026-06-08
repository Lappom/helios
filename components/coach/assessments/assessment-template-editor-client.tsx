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
  createAssessmentFieldRequest,
  deleteAssessmentFieldRequest,
  patchAssessmentFieldRequest,
  patchAssessmentTemplateRequest,
  reorderAssessmentFieldsRequest,
} from "@/lib/assessments/api-client";
import type {
  AssessmentFieldDetail,
  AssessmentTemplateTree,
} from "@/lib/assessments/types";
import { ASSESSMENT_FIELD_TYPES } from "@/lib/validators/assessments";
import { cn } from "@/lib/utils";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  number: "Nombre",
  select: "Liste",
  photo: "Photo",
  measurement: "Mesures",
};

type AssessmentTemplateEditorClientProps = {
  initialTemplate: AssessmentTemplateTree;
};

function SortableFieldRow({
  field,
  selected,
  onSelect,
}: {
  field: AssessmentFieldDetail;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

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
        <p className="text-on-dark truncate text-sm font-medium">{field.label}</p>
        <p className="text-muted text-xs">
          {FIELD_TYPE_LABELS[field.type]}
          {field.required ? " · requis" : ""}
        </p>
      </div>
    </button>
  );
}

export function AssessmentTemplateEditorClient({
  initialTemplate,
}: AssessmentTemplateEditorClientProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    initialTemplate.fields[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const selectedField = useMemo(
    () => template.fields.find((field) => field.id === selectedFieldId) ?? null,
    [selectedFieldId, template.fields],
  );

  const fieldIds = useMemo(
    () => template.fields.map((field) => field.id),
    [template.fields],
  );

  async function mutate(
    action: () => Promise<AssessmentTemplateTree>,
    message?: string,
  ) {
    setSaving(true);
    try {
      const updated = await action();
      setTemplate(updated);
      if (!updated.fields.some((field) => field.id === selectedFieldId)) {
        setSelectedFieldId(updated.fields[0]?.id ?? null);
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

    const oldIndex = fieldIds.indexOf(String(active.id));
    const newIndex = fieldIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextIds = arrayMove(fieldIds, oldIndex, newIndex);
    await mutate(() =>
      reorderAssessmentFieldsRequest(template.id, nextIds),
    );
  }

  async function handleAddField(type: (typeof ASSESSMENT_FIELD_TYPES)[number]) {
    await mutate(
      () =>
        createAssessmentFieldRequest(template.id, {
          type,
          label: FIELD_TYPE_LABELS[type] ?? type,
          required: false,
        }),
      "Champ ajouté",
    );
  }

  async function handleDeleteField(fieldId: string) {
    await mutate(
      () => deleteAssessmentFieldRequest(template.id, fieldId),
      "Champ supprimé",
    );
  }

  async function updateSelectedField(patch: Record<string, unknown>) {
    if (!selectedField) {
      return;
    }
    await mutate(() =>
      patchAssessmentFieldRequest(template.id, selectedField.id, patch),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/coach/assessments">← Bilans</Link>
          </Button>
          <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
            Éditeur template
          </h1>
        </div>
        {saving ? (
          <span className="text-muted text-sm">Enregistrement…</span>
        ) : null}
      </div>

      <div className="border-hairline bg-surface-card grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div>
          <label className="text-muted mb-1 block text-xs">Nom du template</label>
          <Input
            value={template.name}
            onChange={(event) =>
              setTemplate((prev) => ({ ...prev, name: event.target.value }))
            }
            onBlur={() =>
              mutate(() =>
                patchAssessmentTemplateRequest(template.id, {
                  name: template.name,
                }),
              )
            }
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-xs">Fréquence</label>
          <Select
            value={template.frequency}
            onValueChange={(value) =>
              mutate(
                () =>
                  patchAssessmentTemplateRequest(template.id, {
                    frequency: value,
                  }),
                "Fréquence mise à jour",
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Unique</SelectItem>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ASSESSMENT_FIELD_TYPES.map((type) => (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                onClick={() => handleAddField(type)}
              >
                <Plus className="mr-1 size-3.5" />
                {FIELD_TYPE_LABELS[type]}
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
              items={fieldIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {template.fields.map((field) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    selected={field.id === selectedFieldId}
                    onSelect={() => setSelectedFieldId(field.id)}
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
          {selectedField ? (
            <div className="space-y-4">
              <h2 className="text-title-sm text-on-dark font-semibold">
                Configuration
              </h2>
              <div>
                <label className="text-muted mb-1 block text-xs">Label</label>
                <Input
                  value={selectedField.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    setTemplate((prev) => ({
                      ...prev,
                      fields: prev.fields.map((field) =>
                        field.id === selectedField.id
                          ? { ...field, label }
                          : field,
                      ),
                    }));
                  }}
                  onBlur={() => updateSelectedField({ label: selectedField.label })}
                />
              </div>
              <label className="text-muted flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedField.required}
                  onChange={(event) =>
                    updateSelectedField({ required: event.target.checked })
                  }
                  className="accent-primary"
                />
                Champ requis
              </label>
              {selectedField.type === "photo" ? (
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Pose guidée
                  </label>
                  <Input
                    defaultValue={selectedField.config?.photoPose ?? ""}
                    placeholder="face, side, back…"
                    onBlur={(event) =>
                      updateSelectedField({
                        config: {
                          ...selectedField.config,
                          photoPose: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              ) : null}
              {selectedField.type === "number" ? (
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Alerte si valeur ≥
                  </label>
                  <Input
                    type="number"
                    defaultValue={
                      selectedField.config?.criticalWhen?.value?.toString() ?? ""
                    }
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      updateSelectedField({
                        config: Number.isNaN(value)
                          ? null
                          : {
                              criticalWhen: { op: "gte", value },
                            },
                      });
                    }}
                  />
                </div>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="text-accent-rose w-full"
                onClick={() => handleDeleteField(selectedField.id)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Supprimer le champ
              </Button>
            </div>
          ) : (
            <p className="text-muted text-sm">
              Sélectionnez un champ pour le configurer.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
