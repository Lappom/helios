"use client";

import { useClerk } from "@clerk/nextjs";
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

type PrivacySettingsProps = {
  clientEmail: string;
};

export function PrivacySettings({ clientEmail }: PrivacySettingsProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch("/api/v1/me/data-export");
      if (!response.ok) {
        const payload = await response.json();
        toast.error(payload.detail ?? payload.title ?? "Export impossible.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "my-data-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/v1/me/account", {
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

      toast.success("Votre compte a été supprimé.");
      await signOut();
      router.push("/");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
      <div>
        <h1 className="text-title-md text-on-dark font-semibold">Mes données</h1>
        <p className="text-body-sm text-muted mt-2">
          Exportez vos données ou demandez la suppression de votre compte
          client.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? "Export en cours…" : "Exporter mes données"}
        </Button>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Supprimer mon compte</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer mon compte</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Saisissez votre email{" "}
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
                onClick={() => void handleDeleteAccount()}
              >
                {deleting ? "Suppression…" : "Confirmer la suppression"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
