"use client";

import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  createApiKeyRequest,
  fetchApiKeys,
  revokeApiKeyRequest,
} from "@/lib/integrations/api-client";
import type { ApiKeyListItem } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type ApiKeysPanelProps = {
  initialKeys: ApiKeyListItem[];
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
};

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  return new Date(value).toLocaleString("fr-FR");
}

export function ApiKeysPanel({
  initialKeys,
  createDialogOpen,
  onCreateDialogOpenChange,
}: ApiKeysPanelProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function refreshKeys() {
    const data = await fetchApiKeys();
    setKeys(data.items);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }

    setCreating(true);
    try {
      const created = await createApiKeyRequest({ name: name.trim() });
      setRevealedSecret(created.secret);
      setName("");
      onCreateDialogOpenChange(false);
      await refreshKeys();
      toast.success("Clé API créée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(apiKeyId: string) {
    setRevokingId(apiKeyId);
    try {
      await revokeApiKeyRequest(apiKeyId);
      await refreshKeys();
      toast.success("Clé révoquée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setRevokingId(null);
    }
  }

  async function copySecret() {
    if (!revealedSecret) return;
    await navigator.clipboard.writeText(revealedSecret);
    toast.success("Clé copiée");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title-md text-on-dark font-semibold">Clés API</h2>
        <Button
          type="button"
          onClick={() => onCreateDialogOpenChange(true)}
          className="font-semibold"
        >
          Nouvelle clé
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
          <KeyRound className="text-muted mx-auto size-8" />
          <p className="text-body-sm text-muted mt-3">
            Aucune clé API. Créez-en une pour connecter vos intégrations.
          </p>
        </div>
      ) : (
        <div className="border-hairline divide-hairline divide-y overflow-hidden rounded-lg border">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-surface-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-on-dark font-semibold">{key.name}</p>
                <p className="text-body-sm text-muted font-mono">
                  {key.keyPrefix}••••
                </p>
                <p className="text-caption text-muted mt-1">
                  Dernière utilisation : {formatDate(key.lastUsedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-caption rounded-md px-2 py-1 font-medium",
                    key.isActive
                      ? "bg-accent-emerald/15 text-accent-emerald"
                      : "bg-accent-rose/15 text-accent-rose",
                  )}
                >
                  {key.isActive ? "Active" : "Révoquée"}
                </span>
                {key.isActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId === key.id}
                    onClick={() => void handleRevoke(key.id)}
                    className="border-hairline-strong"
                  >
                    <Trash2 className="size-4" />
                    Révoquer
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={onCreateDialogOpenChange}>
        <DialogContent className="border-hairline bg-surface-card text-on-dark">
          <DialogHeader>
            <DialogTitle>Créer une clé API</DialogTitle>
            <DialogDescription className="text-muted">
              Donnez un nom pour identifier cette clé (ex. Zapier, Make).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="api-key-name" className="text-title-sm font-semibold">
              Nom
            </label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production Zapier"
              className="border-hairline-strong bg-canvas"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onCreateDialogOpenChange(false)}
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
            <DialogTitle>Copiez votre clé API</DialogTitle>
            <DialogDescription className="text-muted">
              Cette clé ne sera plus affichée. Conservez-la en lieu sûr.
            </DialogDescription>
          </DialogHeader>
          <pre className="border-hairline bg-canvas text-body-sm overflow-x-auto rounded-md border p-4 font-mono break-all">
            {revealedSecret}
          </pre>
          <DialogFooter>
            <Button type="button" onClick={() => void copySecret()}>
              <Copy className="size-4" />
              Copier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
