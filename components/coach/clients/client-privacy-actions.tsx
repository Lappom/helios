"use client";

import { useRouter } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ClientPrivacyActionsProps = {
  clientId: string;
  clientEmail: string;
};

export function ClientPrivacyActions({
  clientId,
  clientEmail,
}: ClientPrivacyActionsProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(`/api/v1/clients/${clientId}/export`);
      if (!response.ok) {
        const payload = await response.json();
        toast.error(payload.detail ?? payload.title ?? "Export impossible.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `client-${clientId}-export.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteClient() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/clients/${clientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(
          payload.detail ?? payload.title ?? "Suppression impossible.",
        );
        return;
      }

      toast.success("Client supprimé.");
      router.push("/coach/clients");
      router.refresh();
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-5">
      <div>
        <h2 className="text-title-sm text-on-dark font-semibold">
          Données & confidentialité
        </h2>
        <p className="text-body-sm text-muted mt-1">
          Export RGPD ou suppression définitive du client.
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        disabled={exporting}
        onClick={() => void handleExport()}
      >
        {exporting ? "Export en cours…" : "Exporter les données"}
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            Supprimer le client
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
            <DialogDescription>
              Action irréversible. Saisissez l&apos;email du client{" "}
              <strong>{clientEmail}</strong> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            placeholder={clientEmail}
            className="border-hairline bg-surface-elevated"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || confirmEmail.trim().length === 0}
              onClick={() => void handleDeleteClient()}
            >
              {deleting ? "Suppression…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
