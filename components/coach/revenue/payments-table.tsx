"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaymentListItem } from "@/lib/revenue/types";
import { formatPriceCents } from "@/lib/validators/coach-profile";
import type { PaymentType } from "@/lib/validators/payments";

const TYPE_LABELS: Record<PaymentType, string> = {
  subscription: "Abonnement",
  one_time: "Ponctuel",
  external: "Externe",
};

const SOURCE_LABELS = {
  manual: "Manuel",
  booking: "Boutique",
  import: "Import",
} as const;

type PaymentsTableProps = {
  payments: PaymentListItem[];
  loading?: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PaymentsTable({ payments, loading }: PaymentsTableProps) {
  if (loading) {
    return <p className="text-muted text-sm">Chargement…</p>;
  }

  if (payments.length === 0) {
    return (
      <div className="border-hairline bg-surface-card rounded-lg border p-6">
        <p className="text-muted text-sm">Aucun paiement pour cette période.</p>
      </div>
    );
  }

  return (
    <div className="border-hairline bg-surface-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="border-hairline hover:bg-transparent">
            <TableHead className="text-muted">Date</TableHead>
            <TableHead className="text-muted">Client</TableHead>
            <TableHead className="text-muted">Prestation</TableHead>
            <TableHead className="text-muted">Type</TableHead>
            <TableHead className="text-muted">Source</TableHead>
            <TableHead className="text-muted text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} className="border-hairline">
              <TableCell className="text-on-dark">
                {formatDate(payment.paidAt)}
              </TableCell>
              <TableCell className="text-on-dark">
                {payment.clientName ?? "—"}
              </TableCell>
              <TableCell className="text-body-md text-muted">
                {payment.serviceName ?? payment.description ?? "—"}
              </TableCell>
              <TableCell className="text-body-md text-muted">
                {TYPE_LABELS[payment.type]}
              </TableCell>
              <TableCell className="text-body-md text-muted">
                {SOURCE_LABELS[payment.source]}
              </TableCell>
              <TableCell className="text-primary text-right font-semibold">
                {formatPriceCents(payment.amountCents, payment.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
