"use client";

import { useEffect, useMemo, useState } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addGroupParticipants,
  fetchGroupParticipants,
  removeGroupParticipant,
} from "@/lib/messaging/api-client";
import type { GroupParticipantItem } from "@/lib/messaging/types";

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type GroupParticipantsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  groupName: string;
  clients: ClientOption[];
  onParticipantsChange?: (count: number) => void;
};

export function GroupParticipantsDialog({
  open,
  onOpenChange,
  conversationId,
  groupName,
  clients,
  onParticipantsChange,
}: GroupParticipantsDialogProps) {
  const [participants, setParticipants] = useState<GroupParticipantItem[]>([]);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(
    null,
  );
  const [fetchKey, setFetchKey] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeFetchKey = open && conversationId ? conversationId : null;

  if (activeFetchKey !== fetchKey) {
    setFetchKey(activeFetchKey);
    if (activeFetchKey !== null) {
      setLoadedConversationId(null);
    }
  }

  const loading = Boolean(
    activeFetchKey && loadedConversationId !== activeFetchKey,
  );

  useEffect(() => {
    if (!activeFetchKey) {
      return;
    }

    let cancelled = false;

    fetchGroupParticipants(activeFetchKey)
      .then((payload) => {
        if (!cancelled) {
          setParticipants(payload.items);
          setLoadedConversationId(activeFetchKey);
          onParticipantsChange?.(payload.items.length);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadedConversationId(activeFetchKey);
          toast.error(
            error instanceof Error
              ? error.message
              : "Participants indisponibles.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFetchKey, onParticipantsChange]);

  const participantIds = useMemo(
    () => new Set(participants.map((p) => p.clientId)),
    [participants],
  );

  const availableClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients
      .filter((client) => !participantIds.has(client.id))
      .filter((client) => {
        if (!query) {
          return true;
        }
        const label =
          `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
        return label.includes(query);
      });
  }, [clients, participantIds, search]);

  function toggleClient(clientId: string) {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }

  async function handleAdd() {
    if (!conversationId || selectedIds.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = await addGroupParticipants(conversationId, {
        clientIds: selectedIds,
      });
      setParticipants(payload.items);
      onParticipantsChange?.(payload.items.length);
      setSelectedIds([]);
      setAddMode(false);
      setSearch("");
      toast.success("Participants ajoutés.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ajout impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(clientId: string) {
    if (!conversationId) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = await removeGroupParticipant(conversationId, clientId);
      setParticipants(payload.items);
      onParticipantsChange?.(payload.items.length);
      toast.success("Participant retiré.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Retrait impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-card border-hairline max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-on-dark">
            Participants — {groupName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted text-body-sm py-6 text-center">
            Chargement…
          </p>
        ) : addMode ? (
          <div className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client…"
            />
            <div className="border-hairline max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
              {availableClients.length === 0 ? (
                <p className="text-muted text-body-sm p-3 text-center">
                  Aucun client disponible.
                </p>
              ) : (
                availableClients.map((client) => (
                  <label
                    key={client.id}
                    className="hover:bg-surface-elevated flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5"
                  >
                    <Checkbox
                      checked={selectedIds.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="text-on-dark block text-sm font-medium">
                        {client.firstName} {client.lastName}
                      </span>
                      <span className="text-muted block truncate text-xs">
                        {client.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddMode(false);
                  setSelectedIds([]);
                  setSearch("");
                }}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void handleAdd()}
                disabled={submitting || selectedIds.length === 0}
              >
                Ajouter
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-hairline max-h-72 space-y-1 overflow-y-auto rounded-md border">
              {participants.length === 0 ? (
                <p className="text-muted text-body-sm p-4 text-center">
                  Aucun participant client.
                </p>
              ) : (
                participants.map((participant) => (
                  <div
                    key={participant.clientId}
                    className="border-hairline flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-on-dark text-sm font-medium">
                        {participant.firstName} {participant.lastName}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {participant.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleRemove(participant.clientId)}
                      disabled={submitting}
                      aria-label={`Retirer ${participant.firstName}`}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAddMode(true)}
              disabled={submitting}
            >
              <UserPlus className="size-4" />
              Ajouter des participants
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
