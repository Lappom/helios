"use client";

import { useCallback, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddManualPaymentDialog } from "@/components/coach/revenue/add-manual-payment-dialog";
import { PaymentsTable } from "@/components/coach/revenue/payments-table";
import { RevenueChart } from "@/components/coach/revenue/revenue-chart";
import { RevenueKpiGrid } from "@/components/coach/revenue/revenue-kpi-grid";
import { TopClientsPanel } from "@/components/coach/revenue/top-clients-panel";
import type { ClientListItem } from "@/lib/clients/service";
import {
  fetchPayments,
  fetchRevenueByClient,
  fetchRevenueDashboard,
  getRevenueExportUrl,
} from "@/lib/revenue/api-client";
import type {
  PaymentListItem,
  RevenueByClientReport,
  RevenueDashboard,
} from "@/lib/revenue/types";
import {
  PAYMENT_TYPES,
  type PaymentType,
} from "@/lib/validators/payments";
import { cn } from "@/lib/utils";

type RevenuePageClientProps = {
  initialDashboard: RevenueDashboard;
  initialByClient: RevenueByClientReport;
  initialPayments: PaymentListItem[];
  clients: ClientListItem[];
};

const TYPE_LABELS: Record<PaymentType, string> = {
  subscription: "Abonnement",
  one_time: "Ponctuel",
  external: "Externe",
};

function getDefaultExportRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 11);
  start.setUTCDate(1);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function RevenuePageClient({
  initialDashboard,
  initialByClient,
  initialPayments,
  clients,
}: RevenuePageClientProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [byClient, setByClient] = useState(initialByClient);
  const [payments, setPayments] = useState(initialPayments);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [filters, setFilters] = useState({
    clientId: "",
    type: "",
    from: "",
    to: "",
  });
  const exportRange = useMemo(() => getDefaultExportRange(), []);

  const refreshDashboard = useCallback(async () => {
    const [nextDashboard, nextByClient] = await Promise.all([
      fetchRevenueDashboard(),
      fetchRevenueByClient(),
    ]);
    setDashboard(nextDashboard);
    setByClient(nextByClient);
  }, []);

  const loadPayments = useCallback(async (nextFilters = filters) => {
    setLoadingPayments(true);
    try {
      const response = await fetchPayments({
        page: 1,
        limit: 50,
        clientId: nextFilters.clientId || undefined,
        type: nextFilters.type || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined,
      });
      setPayments(response.items);
    } catch {
      toast.error("Impossible de charger les paiements.");
    } finally {
      setLoadingPayments(false);
    }
  }, [filters]);

  async function handlePaymentCreated(payment: PaymentListItem) {
    setPayments((prev) => [payment, ...prev]);
    await refreshDashboard();
    void loadPayments();
  }

  function handleApplyFilters() {
    void loadPayments(filters);
  }

  function handleExport() {
    window.location.href = getRevenueExportUrl(exportRange.from, exportRange.to);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Revenus
          </h1>
          <p className="text-body-md text-muted mt-2">
            Suivi comptable — paiements boutique, espèces et virements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-hairline"
            onClick={handleExport}
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
          <AddManualPaymentDialog
            clients={clients}
            onCreated={handlePaymentCreated}
          />
        </div>
      </div>

      <RevenueKpiGrid dashboard={dashboard} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <RevenueChart dashboard={dashboard} />
        <TopClientsPanel report={byClient} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="border-hairline bg-surface-card">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <PaymentsTable payments={payments.slice(0, 5)} />
          <p className="text-muted text-sm">
            Les 5 derniers paiements. Consultez l&apos;onglet Paiements pour la
            liste complète.
          </p>
        </TabsContent>

        <TabsContent value="payments" className="mt-6 space-y-4">
          <div className="border-hairline bg-surface-card flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <FilterField label="Client">
              <Select
                value={filters.clientId || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    clientId: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="border-hairline w-[180px]">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Type">
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="border-hairline w-[160px]">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Du">
              <Input
                type="date"
                className="border-hairline w-[150px]"
                value={filters.from}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, from: event.target.value }))
                }
              />
            </FilterField>

            <FilterField label="Au">
              <Input
                type="date"
                className="border-hairline w-[150px]"
                value={filters.to}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, to: event.target.value }))
                }
              />
            </FilterField>

            <Button
              variant="outline"
              className={cn("border-hairline mb-0.5")}
              onClick={handleApplyFilters}
            >
              Filtrer
            </Button>
          </div>

          <PaymentsTable payments={payments} loading={loadingPayments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-caption-uppercase text-muted block">{label}</span>
      {children}
    </label>
  );
}
