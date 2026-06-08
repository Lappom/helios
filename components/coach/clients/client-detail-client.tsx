"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ClientActiveAssessmentsCard } from "@/components/coach/clients/client-active-assessments-card";
import { ClientHabitsCard } from "@/components/coach/clients/client-habits-card";
import { FeatureGate } from "@/components/billing/feature-gate";
import { ClientFeedbackCard } from "@/components/coach/session-feedback/client-feedback-card";
import { ClientActiveNutritionCard } from "@/components/coach/clients/client-active-nutrition-card";
import { ClientActiveProgramCard } from "@/components/coach/clients/client-active-program-card";
import { ClientPrivacyActions } from "@/components/coach/clients/client-privacy-actions";
import { ClientStatusBadge } from "@/components/coach/clients/client-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_ORDER,
} from "@/lib/clients/constants";
import { buildClientTimeline } from "@/lib/clients/timeline";
import type { ClientDetail, TimelineEntry } from "@/lib/clients/types";
import type { ClientStatus } from "@/lib/validators/clients";

type ClientDetailClientProps = {
  initialClient: ClientDetail;
};

export function ClientDetailClient({ initialClient }: ClientDetailClientProps) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [noteBody, setNoteBody] = useState("");
  const [tagInput, setTagInput] = useState(
    initialClient.tags.map((tag) => tag.name).join(", "),
  );
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);

  const timeline = buildClientTimeline(client);

  async function handleStatusChange(status: ClientStatus) {
    const response = await fetch(`/api/v1/clients/${client.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.detail ?? payload.title ?? "Statut non modifié.");
      return;
    }

    const detail = await fetchClientDetail(client.id);
    if (detail) {
      setClient(detail);
    }
    router.refresh();
  }

  async function fetchClientDetail(id: string): Promise<ClientDetail | null> {
    const response = await fetch(`/api/v1/clients/${id}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!noteBody.trim()) {
      return;
    }

    setLoadingNote(true);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.detail ?? payload.title ?? "Note non enregistrée.");
        return;
      }

      const detail = await fetchClientDetail(client.id);
      if (detail) {
        setClient(detail);
      }
      setNoteBody("");
      toast.success("Note ajoutée.");
    } finally {
      setLoadingNote(false);
    }
  }

  async function handleSaveTags() {
    setLoadingTags(true);

    try {
      const tagNames = tagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await fetch(`/api/v1/clients/${client.id}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.detail ?? payload.title ?? "Tags non enregistrés.");
        return;
      }

      setClient((prev) => ({ ...prev, tags: payload.tags }));
      toast.success("Tags mis à jour.");
    } finally {
      setLoadingTags(false);
    }
  }

  async function handleInvite() {
    setLoadingInvite(true);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/invite`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.detail ?? payload.title ?? "Invitation impossible.");
        return;
      }

      toast.success(`Invitation envoyée à ${payload.email}.`);
    } finally {
      setLoadingInvite(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <Link
          href="/coach/clients"
          className="text-body-sm text-muted hover:text-primary transition-colors"
        >
          ← Clients
        </Link>
        <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
          {client.firstName} {client.lastName}
        </h1>
        <p className="text-body-md text-muted mt-2">{client.email}</p>
        <div className="mt-4">
          <Button asChild variant="secondary">
            <Link href={`/coach/messages?clientId=${client.id}`}>Message</Link>
          </Button>
        </div>
      </div>

      <ClientActiveProgramCard clientId={client.id} />
      <ClientActiveNutritionCard clientId={client.id} />
      <ClientActiveAssessmentsCard
        clientId={client.id}
        clientName={`${client.firstName} ${client.lastName}`}
      />
      <ClientFeedbackCard clientId={client.id} />
      <FeatureGate feature="habits">
        <ClientHabitsCard clientId={client.id} />
      </FeatureGate>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-5">
            <h2 className="text-title-sm text-on-dark font-semibold">Profil</h2>
            <ClientStatusBadge status={client.status} />
            <div className="space-y-2">
              <label className="text-body-sm text-body-strong block font-medium">
                Statut
              </label>
              <select
                className="border-hairline bg-surface-elevated text-on-dark h-10 w-full rounded-lg border px-3 text-sm"
                value={client.status}
                onChange={(event) =>
                  void handleStatusChange(event.target.value as ClientStatus)
                }
              >
                {CLIENT_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {CLIENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={Boolean(client.clerkUserId) || loadingInvite}
              onClick={() => void handleInvite()}
            >
              {client.clerkUserId
                ? "Portail actif"
                : loadingInvite
                  ? "Envoi…"
                  : "Inviter au portail"}
            </Button>
          </section>

          <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-5">
            <h2 className="text-title-sm text-on-dark font-semibold">Tags</h2>
            <Input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="VIP, Nutrition, Hybride"
              className="border-hairline bg-surface-elevated"
            />
            <div className="flex flex-wrap gap-1">
              {client.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="rounded-md">
                  {tag.name}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingTags}
              onClick={() => void handleSaveTags()}
            >
              {loadingTags ? "Enregistrement…" : "Enregistrer les tags"}
            </Button>
          </section>

          <ClientPrivacyActions
            clientId={client.id}
            clientEmail={client.email}
          />
        </aside>

        <section className="border-hairline bg-surface-card space-y-6 rounded-lg border p-5">
          <div>
            <h2 className="text-title-sm text-on-dark font-semibold">
              Historique
            </h2>
            <p className="text-body-sm text-muted mt-1">
              Notes et changements de statut.
            </p>
          </div>

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Ajouter une note interne…"
              rows={4}
              className="border-hairline bg-surface-elevated text-on-dark w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <Button type="submit" disabled={loadingNote}>
              {loadingNote ? "Enregistrement…" : "Ajouter une note"}
            </Button>
          </form>

          <div className="space-y-4">
            {timeline.length === 0 ? (
              <p className="text-body-sm text-muted">Aucune activité pour l&apos;instant.</p>
            ) : (
              timeline.map((entry) => (
                <TimelineItem key={`${entry.type}-${entry.id}`} entry={entry} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  if (entry.type === "note") {
    return (
      <article className="border-hairline bg-surface-elevated rounded-lg border p-4">
        <p className="text-caption-uppercase text-muted tracking-widest uppercase">
          Note
        </p>
        <p className="text-body-md text-body mt-2 whitespace-pre-wrap">
          {entry.body}
        </p>
        <p className="text-caption text-muted-soft mt-3">
          {formatDate(entry.createdAt)}
        </p>
      </article>
    );
  }

  return (
    <article className="border-hairline bg-surface-elevated rounded-lg border p-4">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        Statut
      </p>
      <p className="text-body-md text-body mt-2">
        {CLIENT_STATUS_LABELS[entry.fromStatus]} →{" "}
        {CLIENT_STATUS_LABELS[entry.toStatus]}
      </p>
      <p className="text-caption text-muted-soft mt-3">
        {formatDate(entry.createdAt)}
      </p>
    </article>
  );
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("fr-FR");
}
