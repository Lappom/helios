"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationActionDetail } from "@/lib/automations/types";
import {
  AUTOMATION_ACTION_TYPES,
  type AutomationActionType,
} from "@/lib/validators/automations";

const ACTION_LABELS: Record<AutomationActionType, string> = {
  assign_program: "assign_program",
  assign_next_mesocycle: "assign_next_mesocycle",
  assign_nutrition: "assign_nutrition",
  create_assessment: "create_assessment",
  send_notification: "send_notification",
  send_message: "send_message",
  add_tag: "add_tag",
  create_task: "create_task",
};

type ActionStepCardProps = {
  action: AutomationActionDetail;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onChange: (action: AutomationActionDetail) => void;
  onRemove: () => void;
  disabled?: boolean;
};

export function ActionStepCard({
  action,
  index,
  dragHandleProps,
  onChange,
  onRemove,
  disabled,
}: ActionStepCardProps) {
  function updateConfig(key: string, value: unknown) {
    onChange({
      ...action,
      actionConfig: { ...action.actionConfig, [key]: value },
    });
  }

  return (
    <div className="border-hairline bg-surface-card relative rounded-lg border p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted hover:text-on-dark cursor-grab p-1"
            {...dragHandleProps}
            disabled={disabled}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="text-caption text-muted font-mono">{index + 1}</span>
          <span className="font-mono text-title-sm text-primary">
            {ACTION_LABELS[action.actionType]}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Supprimer l'action"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Select
        value={action.actionType}
        onValueChange={(value) =>
          onChange({
            ...action,
            actionType: value as AutomationActionType,
            actionConfig: {},
          })
        }
        disabled={disabled}
      >
        <SelectTrigger className="mb-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AUTOMATION_ACTION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              <span className="font-mono">{ACTION_LABELS[type]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {action.actionType === "assign_program" ? (
        <Input
          placeholder="ID du programme publié"
          value={String(action.actionConfig.programId ?? "")}
          onChange={(e) => updateConfig("programId", e.target.value)}
          disabled={disabled}
        />
      ) : null}

      {action.actionType === "assign_nutrition" ? (
        <Input
          placeholder="ID du plan nutrition publié"
          value={String(action.actionConfig.planId ?? "")}
          onChange={(e) => updateConfig("planId", e.target.value)}
          disabled={disabled}
        />
      ) : null}

      {action.actionType === "create_assessment" ? (
        <Input
          placeholder="ID du template de bilan"
          value={String(action.actionConfig.templateId ?? "")}
          onChange={(e) => updateConfig("templateId", e.target.value)}
          disabled={disabled}
        />
      ) : null}

      {action.actionType === "send_notification" ? (
        <div className="space-y-3">
          <Input
            placeholder="ID template (optionnel)"
            value={String(action.actionConfig.templateId ?? "")}
            onChange={(e) => updateConfig("templateId", e.target.value)}
            disabled={disabled}
          />
          {!action.actionConfig.templateId ? (
            <>
              <Select
                value={String(action.actionConfig.channel ?? "email")}
                onValueChange={(value) => updateConfig("channel", value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">email</SelectItem>
                  <SelectItem value="in_app">in_app</SelectItem>
                  <SelectItem value="push">push</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Sujet"
                value={String(action.actionConfig.subject ?? "")}
                onChange={(e) => updateConfig("subject", e.target.value)}
                disabled={disabled}
              />
              <Textarea
                placeholder="Contenu (variables {{clientName}})"
                value={String(action.actionConfig.content ?? "")}
                onChange={(e) => updateConfig("content", e.target.value)}
                disabled={disabled}
                rows={4}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {action.actionType === "send_message" ? (
        <Textarea
          placeholder="Message au client"
          value={String(action.actionConfig.content ?? "")}
          onChange={(e) => updateConfig("content", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      ) : null}

      {action.actionType === "add_tag" ? (
        <div className="space-y-3">
          <Input
            placeholder="ID tag (optionnel)"
            value={String(action.actionConfig.tagId ?? "")}
            onChange={(e) => updateConfig("tagId", e.target.value)}
            disabled={disabled}
          />
          {!action.actionConfig.tagId ? (
            <Input
              placeholder="Nom du tag"
              value={String(action.actionConfig.tagName ?? "")}
              onChange={(e) => updateConfig("tagName", e.target.value)}
              disabled={disabled}
            />
          ) : null}
        </div>
      ) : null}

      {action.actionType === "create_task" ? (
        <div className="space-y-3">
          <Input
            placeholder="Titre de la tâche"
            value={String(action.actionConfig.title ?? "")}
            onChange={(e) => updateConfig("title", e.target.value)}
            disabled={disabled}
          />
          <Input
            type="date"
            value={String(action.actionConfig.dueDate ?? "")}
            onChange={(e) => updateConfig("dueDate", e.target.value)}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
