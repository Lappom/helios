import { eq } from "drizzle-orm";
import { invalidateQuota } from "@/lib/cache/invalidate";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import type { QuotaCheckResult } from "./access";
import { getPlanLimit } from "./plans";

export const AI_CREDIT_COSTS = {
  chat: 1,
  generateProgram: 5,
} as const;

export type AiCreditAction = keyof typeof AI_CREDIT_COSTS;

export async function consumeAiCredits(
  organizationId: string,
  amount: number,
  planTier: PlanTier,
): Promise<QuotaCheckResult> {
  if (amount <= 0) {
    throw problem({
      type: "validation-error",
      title: "Invalid credit amount",
      status: 400,
      detail: "Credit amount must be positive.",
    });
  }

  const limit = getPlanLimit(planTier, "ai");

  const subscription = await getDb().query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
    columns: { aiCreditsUsed: true },
  });

  const used = subscription?.aiCreditsUsed ?? 0;

  if (limit !== Number.POSITIVE_INFINITY && used + amount > limit) {
    throw problem({
      type: "quota-exceeded",
      title: "Quota exceeded",
      status: 402,
      detail: `ai quota exceeded (${used}/${limit}).`,
    });
  }

  await getDb()
    .update(subscriptions)
    .set({
      aiCreditsUsed: used + amount,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId));

  await invalidateQuota(organizationId, "ai");

  const newUsed = used + amount;
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - newUsed);

  return {
    quota: "ai",
    used: newUsed,
    limit,
    remaining,
    allowed: true,
  };
}

export async function resetAllAiCredits(): Promise<number> {
  const rows = await getDb()
    .update(subscriptions)
    .set({
      aiCreditsUsed: 0,
      updatedAt: new Date(),
    })
    .returning({ id: subscriptions.id });

  return rows.length;
}
