"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createGroupConversation } from "@/lib/messaging/api-client";
import type { ConversationListItem } from "@/lib/messaging/types";

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  onCreated: (conversation: ConversationListItem) => void;
};

export function CreateGroupDialog({
  open,
  onOpenChange,
  clients,
  onCreated,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const label =
        `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
      return label.includes(query);
    });
  }, [clients, search]);

  function toggleClient(clientId: string) {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }

  function resetForm() {
    setName("");
    setSelectedIds([]);
    setSearch("");
  }

  async function handleSubmit() {
    if (!name.trim() || selectedIds.length === 0) {
      toast.error("Nom du groupe et au moins un client requis.");
      return;
    }

    setSubmitting(true);
    try {
      const conversation = await createGroupConversation({
        type: "group",
        name: name.trim(),
        clientIds: selectedIds,
      });
      onCreated(conversation);
      resetForm();
      onOpenChange(false);
      toast.success("Groupe créé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-surface-card border-hairline max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-on-dark">Nouveau groupe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="group-name"
              className="text-body-sm text-on-dark font-medium"
            >
              Nom du groupe
            </label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Équipe été, Annonce collective…"
              maxLength={100}
            />
          </div>

          {clients.length > 10 ? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client…"
            />
          ) : null}

          <div className="border-hairline max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
            {filteredClients.length === 0 ? (
              <p className="text-muted text-body-sm p-3 text-center">
                Aucun client trouvé.
              </p>
            ) : (
              filteredClients.map((client) => {
                const checked = selectedIds.includes(client.id);
                return (
                  <label
                    key={client.id}
                    className="hover:bg-surface-elevated flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5"
                  >
                    <Checkbox
                      checked={checked}
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
                );
              })
            )}
          </div>

          <p className="text-muted text-xs">
            {selectedIds.length} client
            {selectedIds.length > 1 ? "s" : ""} sélectionné
            {selectedIds.length > 1 ? "s" : ""} · max 49
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !name.trim() || selectedIds.length === 0}
          >
            Créer le groupe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
