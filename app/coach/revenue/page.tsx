import { RevenuePageClient } from "@/components/coach/revenue/revenue-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { listAllClientsForKanban } from "@/lib/clients/service";
import {
  getRevenueByClient,
  getRevenueDashboard,
  listPayments,
} from "@/lib/revenue/service";

export default async function CoachRevenuePage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");

  const [dashboard, byClient, paymentsResult, clients] = await Promise.all([
    getRevenueDashboard(org.organizationId, 12),
    getRevenueByClient(org.organizationId, {}),
    listPayments(org.organizationId, { page: 1, limit: 50 }),
    listAllClientsForKanban(org.organizationId),
  ]);

  return (
    <RevenuePageClient
      initialDashboard={dashboard}
      initialByClient={byClient}
      initialPayments={paymentsResult.items}
      clients={clients}
    />
  );
}
