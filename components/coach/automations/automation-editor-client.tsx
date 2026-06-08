"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patchAutomationRequest } from "@/lib/automations/api-client";
import type { AutomationTree } from "@/lib/automations/types";
import type { AutomationTriggerType } from "@/lib/validators/automations";
import { ActionsPipeline } from "./actions-pipeline";
import { ExecutionHistoryPanel } from "./execution-history-panel";
import { TestRunDialog } from "./test-run-dialog";
import { TriggerPicker } from "./trigger-picker";

type AutomationEditorClientProps = {
  initialAutomation: AutomationTree;
};

export function AutomationEditorClient({
  initialAutomation,
}: AutomationEditorClientProps) {
  const [automation, setAutomation] = useState(initialAutomation);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await patchAutomationRequest(automation.id, {
        name: automation.name,
        description: automation.description,
        triggerType: automation.triggerType,
        triggerConfig: automation.triggerConfig,
        actions: automation.actions.map((action, index) => ({
          actionType: action.actionType,
          actionConfig: action.actionConfig,
          sortOrder: index,
        })),
      });
      setAutomation(updated);
      toast.success("Automatisation enregistrée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/coach/automations" aria-label="Retour">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="text-caption-uppercase text-primary tracking-widest uppercase">
              Builder
            </p>
            <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
              {automation.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TestRunDialog automationId={automation.id} />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {automation.isSystem && !automation.isActive ? (
        <div className="border-hairline bg-surface-elevated text-body-sm text-muted rounded-lg border p-4">
          Workflow système : complétez les IDs programme et template de bilan
          avant activation.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
            <Input
              value={automation.name}
              onChange={(e) =>
                setAutomation((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={automation.isSystem}
            />
            <Textarea
              placeholder="Description"
              value={automation.description ?? ""}
              onChange={(e) =>
                setAutomation((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
            />
          </div>

          <TriggerPicker
            triggerType={automation.triggerType}
            triggerConfig={automation.triggerConfig}
            onChange={(triggerType, triggerConfig) =>
              setAutomation((prev) => ({
                ...prev,
                triggerType: triggerType as AutomationTriggerType,
                triggerConfig,
              }))
            }
            disabled={automation.isSystem}
          />

          <ActionsPipeline
            actions={automation.actions}
            onChange={(actions) =>
              setAutomation((prev) => ({ ...prev, actions }))
            }
          />
        </div>

        <ExecutionHistoryPanel automationId={automation.id} />
      </div>
    </div>
  );
}
