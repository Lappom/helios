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
  fetchVideoAccess,
  setVideoAccessApi,
} from "@/lib/videos/api-client";
import type { VideoAccessItem, VideoItem } from "@/lib/videos/types";

type VideoAccessPanelProps = {
  video: VideoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function VideoAccessPanel({
  video,
  open,
  onOpenChange,
  onUpdated,
}: VideoAccessPanelProps) {
  const [accessList, setAccessList] = useState<VideoAccessItem[]>([]);
  const [clients, setClients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !video) {
      return;
    }

    Promise.all([
      fetchVideoAccess(video.id),
      fetch("/api/v1/clients?limit=200").then(async (response) => {
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
        return payload.items;
      }),
    ])
      .then(([access, clientItems]) => {
        setAccessList(access.items);
        setClients(clientItems);
      })
      .catch(() => {
        toast.error("Impossible de charger les accès.");
      });
  }, [open, video]);

  async function handleAddClient() {
    if (!video || !selectedClientId) {
      return;
    }

    if (accessList.some((item) => item.clientId === selectedClientId)) {
      toast.error("Ce client a déjà accès.");
      return;
    }

    setLoading(true);
    try {
      const nextIds = [...accessList.map((item) => item.clientId), selectedClientId];
      const result = await setVideoAccessApi(video.id, { clientIds: nextIds });
      setAccessList(result.items);
      setSelectedClientId("");
      onUpdated();
      toast.success("Accès mis à jour.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveClient(clientId: string) {
    if (!video) {
      return;
    }

    setLoading(true);
    try {
      const nextIds = accessList
        .map((item) => item.clientId)
        .filter((id) => id !== clientId);
      const result = await setVideoAccessApi(video.id, { clientIds: nextIds });
      setAccessList(result.items);
      onUpdated();
      toast.success("Accès retiré.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface-card max-w-lg border">
        <DialogHeader>
          <DialogTitle className="text-title-lg text-on-dark font-bold tracking-tight">
            Accès clients
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Ajouter un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!selectedClientId || loading}
              onClick={handleAddClient}
            >
              Ajouter
            </Button>
          </div>

          <ul className="space-y-2">
            {accessList.length === 0 ? (
              <li className="text-body-sm text-muted">
                Aucun client sélectionné.
              </li>
            ) : (
              accessList.map((item) => (
                <li
                  key={item.id}
                  className="border-hairline bg-surface-elevated flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-body-sm text-on-dark">
                    {item.clientName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleRemoveClient(item.clientId)}
                  >
                    Retirer
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
