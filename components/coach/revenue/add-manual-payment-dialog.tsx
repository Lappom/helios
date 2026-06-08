"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientListItem } from "@/lib/clients/service";
import { createManualPaymentRequest } from "@/lib/revenue/api-client";
import type { PaymentListItem } from "@/lib/revenue/types";
import {
  PAYMENT_TYPES,
  type PaymentType,
} from "@/lib/validators/payments";

const TYPE_LABELS: Record<PaymentType, string> = {
  subscription: "Abonnement",
  one_time: "Ponctuel",
  external: "Externe (espèces, virement)",
};

type AddManualPaymentDialogProps = {
  clients: ClientListItem[];
  onCreated: (payment: PaymentListItem) => void;
};

export function AddManualPaymentDialog({
  clients,
  onCreated,
}: AddManualPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    amountEuros: "",
    type: "external" as PaymentType,
    paidAt: new Date().toISOString().slice(0, 10),
    description: "",
    externalReference: "",
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const amountEuros = Number.parseFloat(form.amountEuros.replace(",", "."));
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      toast.error("Montant invalide.");
      return;
    }

    setLoading(true);
    try {
      const paidAt = new Date(`${form.paidAt}T12:00:00`).toISOString();
      const payment = await createManualPaymentRequest({
        clientId: form.clientId || undefined,
        amountCents: Math.round(amountEuros * 100),
        type: form.type,
        paidAt,
        description: form.description.trim() || undefined,
        externalReference: form.externalReference.trim() || undefined,
      });

      onCreated(payment);
      toast.success("Paiement enregistré.");
      setOpen(false);
      setForm({
        clientId: "",
        amountEuros: "",
        type: "external",
        paidAt: new Date().toISOString().slice(0, 10),
        description: "",
        externalReference: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ajouter un paiement</Button>
      </DialogTrigger>
      <DialogContent className="border-hairline bg-surface-card text-on-dark sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paiement externe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant (€)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="120,00"
                value={form.amountEuros}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amountEuros: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.paidAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paidAt: event.target.value }))
                }
                required
              />
            </Field>
          </div>

          <Field label="Type">
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, type: value as PaymentType }))
              }
            >
              <SelectTrigger className="border-hairline w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Client (optionnel)">
            <Select
              value={form.clientId || "none"}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  clientId: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="border-hairline w-full">
                <SelectValue placeholder="Sans client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Référence (optionnel)">
            <Input
              value={form.externalReference}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  externalReference: event.target.value,
                }))
              }
              placeholder="Virement, chèque…"
            />
          </Field>

          <Field label="Description (optionnel)">
            <textarea
              className="border-hairline bg-surface-card text-on-dark placeholder:text-muted flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-caption-uppercase text-muted">{label}</span>
      {children}
    </label>
  );
}
