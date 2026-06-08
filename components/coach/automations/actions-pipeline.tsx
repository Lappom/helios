"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutomationActionDetail } from "@/lib/automations/types";
import { ActionStepCard } from "./action-step-card";

type ActionsPipelineProps = {
  actions: AutomationActionDetail[];
  onChange: (actions: AutomationActionDetail[]) => void;
  disabled?: boolean;
};

function SortableAction({
  action,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  action: AutomationActionDetail;
  index: number;
  onChange: (action: AutomationActionDetail) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: action.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <ActionStepCard
        action={action}
        index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
        onChange={onChange}
        onRemove={onRemove}
        disabled={disabled}
      />
    </div>
  );
}

export function ActionsPipeline({
  actions,
  onChange,
  disabled,
}: ActionsPipelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = actions.findIndex((a) => a.id === active.id);
    const newIndex = actions.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(actions, oldIndex, newIndex).map(
      (action, index) => ({ ...action, sortOrder: index }),
    );
    onChange(reordered);
  }

  function addAction() {
    const id = `draft-${Date.now()}`;
    onChange([
      ...actions,
      {
        id,
        sortOrder: actions.length,
        actionType: "send_message",
        actionConfig: { content: "" },
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        Actions
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={actions.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div key={action.id}>
                {index > 0 ? (
                  <div className="bg-hairline mx-auto mb-3 h-6 w-px" />
                ) : null}
                <SortableAction
                  action={action}
                  index={index}
                  onChange={(updated) =>
                    onChange(
                      actions.map((item) =>
                        item.id === action.id ? updated : item,
                      ),
                    )
                  }
                  onRemove={() =>
                    onChange(actions.filter((item) => item.id !== action.id))
                  }
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" onClick={addAction} disabled={disabled}>
        <Plus className="mr-2 size-4" />
        Ajouter une action
      </Button>
    </div>
  );
}
