"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchDriveShares,
  revokeDriveShare,
} from "@/lib/drive/api-client";
import type { DriveShareItem } from "@/lib/drive/types";

type ShareManageTarget = {
  type: "file" | "folder";
  id: string;
  name: string;
};

type DriveSharesPanelProps = {
  target: ShareManageTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function DriveSharesList({
  target,
  onChanged,
}: {
  target: ShareManageTarget;
  onChanged: () => void;
}) {
  const [shares, setShares] = useState<DriveShareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchDriveShares(
      target.type === "file"
        ? { fileId: target.id }
        : { folderId: target.id },
    )
      .then((result) => {
        if (!cancelled) {
          setShares(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Impossible de charger les accès.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [target.id, target.type]);

  async function handleRevoke(shareId: string) {
    try {
      await revokeDriveShare(shareId);
      setShares((prev) => prev.filter((share) => share.id !== shareId));
      onChanged();
      toast.success("Accès révoqué.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  if (loading) {
    return <p className="text-body-sm text-muted">Chargement…</p>;
  }

  if (shares.length === 0) {
    return <p className="text-body-sm text-muted">Aucun partage actif.</p>;
  }

  return (
    <div className="space-y-2">
      {shares.map((share) => (
        <div
          key={share.id}
          className="border-hairline bg-surface-elevated flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-body-sm text-on-dark font-medium">
              {share.clientName}
            </p>
            <p className="text-caption text-muted">Lecture seule</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => void handleRevoke(share.id)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function DriveSharesPanel({
  target,
  open,
  onOpenChange,
  onChanged,
}: DriveSharesPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accès clients — {target?.name}</DialogTitle>
        </DialogHeader>
        {open && target ? (
          <DriveSharesList
            key={`${target.type}-${target.id}`}
            target={target}
            onChanged={onChanged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export type { ShareManageTarget };
