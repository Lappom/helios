import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, subscriptions } from "@/lib/db/schema";
import type { ClientStatus } from "@/lib/validators/clients";
import { getPlanLimit } from "@/lib/billing/plans";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { countsTowardQuota, quotaDelta, QUOTA_STATUSES } from "./quota-rules";

export { QUOTA_STATUSES, countsTowardQuota, quotaDelta } from "./quota-rules";

export async function countQuotaClients(organizationId: string): Promise<number> {
  const [result] = await getDb()
    .select({ value: count() })
    .from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        inArray(clients.status, QUOTA_STATUSES),
      ),
    );

  return result?.value ?? 0;
}

export async function reconcileActiveClientCount(
  organizationId: string,
): Promise<number> {
  const total = await countQuotaClients(organizationId);

  await getDb()
    .update(subscriptions)
    .set({
      activeClientCount: total,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId));

  return total;
}

export async function assertQuotaForNewClients(
  organizationId: string,
  planTier: PlanTier,
  additionalCount: number,
): Promise<void> {
  if (additionalCount <= 0) {
    return;
  }

  const limit = getPlanLimit(planTier, "clients");

  if (limit === Number.POSITIVE_INFINITY) {
    return;
  }

  const used = await countQuotaClients(organizationId);

  if (used + additionalCount > limit) {
    throw problem({
      type: "quota-exceeded",
      title: "Quota exceeded",
      status: 402,
      detail: `clients quota exceeded (${used + additionalCount}/${limit}).`,
    });
  }
}

export async function assertQuotaForStatusChange(
  organizationId: string,
  planTier: PlanTier,
  from: ClientStatus,
  to: ClientStatus,
): Promise<void> {
  const delta = quotaDelta(from, to);

  if (delta <= 0) {
    return;
  }

  await assertQuotaForNewClients(organizationId, planTier, delta);
}
