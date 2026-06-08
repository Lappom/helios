"use client";

import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createAutomationRequest,
  toggleAutomationRequest,
} from "@/lib/automations/api-client";
import type { AutomationListItem } from "@/lib/automations/types";
import { AUTOMATION_TRIGGER_TYPES } from "@/lib/validators/automations";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  payment_received: "payment.received",
  client_created: "client.created",
  form_completed: "form.completed",
  session_completed: "session.completed",
  assessment_submitted: "assessment.submitted",
  schedule_cron: "schedule.cron",
  subscription_renewal_due: "subscription.renewal_due",
};

type AutomationsListClientProps = {
  initialAutomations: AutomationListItem[];
};

export function AutomationsListClient({
  initialAutomations,
}: AutomationsListClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialAutomations);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const automation = await createAutomationRequest({
        name: "Nouvelle automatisation",
        triggerType: AUTOMATION_TRIGGER_TYPES[0],
        triggerConfig: {},
        isActive: false,
        actions: [
          {
            actionType: "send_message",
            actionConfig: { content: "Bonjour {{clientName}} !" },
          },
        ],
      });
      router.push(`/coach/automations/${automation.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const updated = await toggleAutomationRequest(id, isActive);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated } : item)),
      );
      toast.success(isActive ? "Automatisation activée." : "Automatisation désactivée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-uppercase text-primary tracking-widest uppercase">
            Pipeline
          </p>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Automatisations
          </h1>
          <p className="text-body-sm text-muted mt-2 max-w-xl">
            Déclenchez des actions métier à partir d&apos;événements clients ou
            de planifications cron.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          <Plus className="mr-2 size-4" />
          Nouvelle automatisation
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-12 text-center">
          <Zap className="text-primary mx-auto mb-4 size-10" />
          <p className="text-title-md text-on-dark font-semibold">
            Aucune automatisation
          </p>
          <p className="text-body-sm text-muted mt-2">
            Créez votre premier workflow ou attendez le seed système onboarding.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="border-hairline bg-surface-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/coach/automations/${item.id}/edit`}
                    className="text-title-sm text-on-dark hover:text-primary font-semibold transition-colors"
                  >
                    {item.name}
                  </Link>
                  {item.isSystem ? (
                    <span className="bg-surface-elevated text-caption text-muted rounded px-2 py-0.5">
                      Système
                    </span>
                  ) : null}
                </div>
                <p className="font-mono text-body-sm text-primary mt-1">
                  {TRIGGER_LABELS[item.triggerType] ?? item.triggerType}
                </p>
                <p className="text-body-sm text-muted mt-1">
                  {item.actionCount} action{item.actionCount > 1 ? "s" : ""}
                  {item.lastExecutionAt
                    ? ` · Dernière exécution ${new Date(item.lastExecutionAt).toLocaleString("fr-FR")}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-caption font-medium",
                    item.isActive ? "text-accent-emerald" : "text-muted",
                  )}
                >
                  {item.isActive ? "Actif" : "Inactif"}
                </span>
                <Checkbox
                  checked={item.isActive}
                  onCheckedChange={(checked) =>
                    handleToggle(item.id, checked === true)
                  }
                  aria-label={`Activer ${item.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
