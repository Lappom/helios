"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  shareDriveFileApi,
  shareDriveFolderApi,
} from "@/lib/drive/api-client";

type ShareTarget =
  | { type: "file"; id: string; name: string }
  | { type: "folder"; id: string; name: string }
  | null;

type DriveShareDialogProps = {
  target: ShareTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared: () => void;
};

export function DriveShareDialog({
  target,
  open,
  onOpenChange,
  onShared,
}: DriveShareDialogProps) {
  const [clients, setClients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    fetch("/api/v1/clients?limit=200")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load clients");
        }
        const payload = (await response.json()) as {
          items: Array<{
            id: string;
            firstName: string;
            lastName: string;
          }>;
        };
        setClients(payload.items);
        if (payload.items[0]) {
          setClientId(payload.items[0].id);
        }
      })
      .catch(() => {
        toast.error("Impossible de charger les clients.");
      });
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!target || !clientId) {
      return;
    }

    setLoading(true);
    try {
      if (target.type === "file") {
        await shareDriveFileApi(target.id, { clientId });
      } else {
        await shareDriveFolderApi(target.id, { clientId });
      }
      toast.success("Accès partagé.");
      onShared();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Partager {target?.type === "folder" ? "le dossier" : "le fichier"}
          </DialogTitle>
        </DialogHeader>
        {target ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-body-sm text-muted">
              <span className="text-on-dark font-medium">{target.name}</span>
            </p>
            <div className="space-y-2">
              <p className="text-body-sm text-body-strong font-medium">Client</p>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !clientId}>
                {loading ? "Partage…" : "Partager"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export type { ShareTarget };
