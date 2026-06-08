"use client";

import { Loader2, Play, Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createWebhookRequest,
  deleteWebhookRequest,
  fetchWebhookDeliveries,
  fetchWebhooks,
  testWebhookRequest,
  updateWebhookRequest,
} from "@/lib/integrations/api-client";
import type {
  WebhookDeliveryItem,
  WebhookListItem,
} from "@/lib/integrations/types";
import { WEBHOOK_EVENTS } from "@/lib/validators/integrations";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  "client.created": "Client créé",
  "payment.received": "Paiement reçu",
  "session.completed": "Séance terminée",
  "assessment.submitted": "Bilan soumis",
};

type WebhooksPanelProps = {
  initialWebhooks: WebhookListItem[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
}

export function WebhooksPanel({ initialWebhooks }: WebhooksPanelProps) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(
    null,
  );
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function refreshWebhooks() {
    const data = await fetchWebhooks();
    setWebhooks(data.items);
  }

  function toggleEvent(event: string) {
    setEvents((current) =>
      current.includes(event)
        ? current.filter((item) => item !== event)
        : [...current, event],
    );
  }

  async function handleCreate() {
    if (!url.trim() || events.length === 0) {
      toast.error("URL et au moins un événement requis");
      return;
    }

    setCreating(true);
    try {
      const created = await createWebhookRequest({
        url: url.trim(),
        description: description.trim() || undefined,
        events: events as (typeof WEBHOOK_EVENTS)[number][],
        isActive: true,
      });
      setRevealedSecret(created.secret);
      setUrl("");
      setDescription("");
      setEvents([...WEBHOOK_EVENTS]);
      setDialogOpen(false);
      await refreshWebhooks();
      toast.success("Webhook créé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(webhook: WebhookListItem) {
    try {
      await updateWebhookRequest(webhook.id, { isActive: !webhook.isActive });
      await refreshWebhooks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  async function handleDelete(webhookId: string) {
    try {
      await deleteWebhookRequest(webhookId);
      if (selectedWebhookId === webhookId) {
        setSelectedWebhookId(null);
        setDeliveries([]);
      }
      await refreshWebhooks();
      toast.success("Webhook supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  async function handleTest(webhookId: string) {
    setTestingId(webhookId);
    try {
      await testWebhookRequest(webhookId);
      toast.success("Événement test envoyé");
      if (selectedWebhookId === webhookId) {
        await loadDeliveries(webhookId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setTestingId(null);
    }
  }

  async function loadDeliveries(webhookId: string) {
    setLoadingDeliveries(true);
    try {
      const data = await fetchWebhookDeliveries(webhookId);
      setDeliveries(data.items);
      setSelectedWebhookId(webhookId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoadingDeliveries(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-md text-on-dark font-semibold">Webhooks</h2>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Nouveau webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
          <Webhook className="text-muted mx-auto size-8" />
          <p className="text-body-sm text-muted mt-3">
            Recevez des notifications HTTP quand un client est créé, un paiement
            enregistré, etc.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="border-hairline bg-surface-card rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-on-dark truncate font-mono text-sm">
                    {webhook.url}
                  </p>
                  {webhook.description ? (
                    <p className="text-body-sm text-muted mt-1">
                      {webhook.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="text-caption bg-surface-elevated text-muted rounded-md px-2 py-0.5"
                      >
                        {EVENT_LABELS[event] ?? event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggle(webhook)}
                    className={cn(
                      "text-caption rounded-md px-2 py-1 font-medium",
                      webhook.isActive
                        ? "bg-accent-emerald/15 text-accent-emerald"
                        : "bg-surface-elevated text-muted",
                    )}
                  >
                    {webhook.isActive ? "Actif" : "Inactif"}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingId === webhook.id}
                    onClick={() => void handleTest(webhook.id)}
                    className="border-hairline-strong"
                  >
                    {testingId === webhook.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Tester
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadDeliveries(webhook.id)}
                    className="border-hairline-strong"
                  >
                    Livraisons
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(webhook.id)}
                    className="border-hairline-strong"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWebhookId ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-4">
          <h3 className="text-title-sm text-on-dark font-semibold">
            Dernières livraisons
          </h3>
          {loadingDeliveries ? (
            <p className="text-body-sm text-muted mt-3">Chargement…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-body-sm text-muted mt-3">Aucune livraison.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="text-body-sm w-full text-left">
                <thead>
                  <tr className="text-muted border-hairline border-b">
                    <th className="py-2 pr-4 font-medium">Événement</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">HTTP</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr
                      key={delivery.id}
                      className="border-hairline border-b last:border-0"
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {delivery.event}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "text-caption rounded-md px-2 py-0.5",
                            delivery.status === "success"
                              ? "bg-accent-emerald/15 text-accent-emerald"
                              : delivery.status === "failed"
                                ? "bg-accent-rose/15 text-accent-rose"
                                : "bg-surface-elevated text-muted",
                          )}
                        >
                          {delivery.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{delivery.httpStatus ?? "—"}</td>
                      <td className="py-2">
                        {formatDate(delivery.deliveredAt ?? delivery.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-hairline bg-surface-card text-on-dark max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau webhook</DialogTitle>
            <DialogDescription className="text-muted">
              URL HTTPS qui recevra les événements sélectionnés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="webhook-url" className="text-title-sm font-semibold">
                URL
              </label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="border-hairline-strong bg-canvas"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="webhook-description"
                className="text-title-sm font-semibold"
              >
                Description (optionnel)
              </label>
              <Input
                id="webhook-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="border-hairline-strong bg-canvas"
              />
            </div>
            <div className="space-y-2">
              <p className="text-title-sm font-semibold">Événements</p>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <span>{EVENT_LABELS[event] ?? event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-hairline-strong"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealedSecret !== null}
        onOpenChange={(open) => {
          if (!open) setRevealedSecret(null);
        }}
      >
        <DialogContent className="border-hairline bg-surface-card text-on-dark">
          <DialogHeader>
            <DialogTitle>Secret de signature</DialogTitle>
            <DialogDescription className="text-muted">
              Utilisez ce secret pour vérifier les signatures HMAC des
              webhooks entrants.
            </DialogDescription>
          </DialogHeader>
          <pre className="border-hairline bg-canvas text-body-sm overflow-x-auto rounded-md border p-4 font-mono break-all">
            {revealedSecret}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
