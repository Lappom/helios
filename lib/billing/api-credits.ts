import { eq } from "drizzle-orm";
import { invalidateQuota } from "@/lib/cache/invalidate";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import type { QuotaCheckResult } from "./access";
import { getPlanLimit } from "./plans";

export async function consumeApiCredit(
  organizationId: string,
  planTier: PlanTier,
): Promise<QuotaCheckResult> {
  const limit = getPlanLimit(planTier, "api");

  const subscription = await getDb().query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
    columns: { apiCreditsUsed: true },
  });

  const used = subscription?.apiCreditsUsed ?? 0;

  if (limit !== Number.POSITIVE_INFINITY && used + 1 > limit) {
    throw problem({
      type: "quota-exceeded",
      title: "API quota exceeded",
      status: 402,
      detail: `Monthly API credit quota exceeded (${used}/${limit}).`,
    });
  }

  await getDb()
    .update(subscriptions)
    .set({
      apiCreditsUsed: used + 1,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId));

  await invalidateQuota(organizationId, "api");

  const newUsed = used + 1;
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - newUsed);

  return {
    quota: "api",
    used: newUsed,
    limit,
    remaining,
    allowed: true,
  };
}

export async function resetAllApiCredits(): Promise<number> {
  const rows = await getDb()
    .update(subscriptions)
    .set({
      apiCreditsUsed: 0,
      updatedAt: new Date(),
    })
    .returning({ id: subscriptions.id });

  return rows.length;
}
