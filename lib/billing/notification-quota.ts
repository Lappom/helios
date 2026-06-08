import { eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import type { QuotaCheckResult } from "./access";
import { getPlanLimit } from "./plans";

export async function consumeNotifications(
  organizationId: string,
  amount: number,
  planTier: PlanTier,
): Promise<QuotaCheckResult> {
  if (amount <= 0) {
    throw problem({
      type: "validation-error",
      title: "Invalid notification amount",
      status: 400,
      detail: "Notification amount must be positive.",
    });
  }

  const limit = getPlanLimit(planTier, "notifications");

  const subscription = await getDb().query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
    columns: { notificationsSent: true },
  });

  const used = subscription?.notificationsSent ?? 0;

  if (limit !== Number.POSITIVE_INFINITY && used + amount > limit) {
    throw problem({
      type: "quota-exceeded",
      title: "Quota exceeded",
      status: 402,
      detail: `notifications quota exceeded (${used}/${limit}).`,
    });
  }

  await getDb()
    .update(subscriptions)
    .set({
      notificationsSent: used + amount,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId));

  const newUsed = used + amount;
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - newUsed);

  return {
    quota: "notifications",
    used: newUsed,
    limit,
    remaining,
    allowed: true,
  };
}

export async function resetAllNotificationQuotas(): Promise<number> {
  const rows = await getDb()
    .update(subscriptions)
    .set({
      notificationsSent: 0,
      updatedAt: new Date(),
    })
    .returning({ id: subscriptions.id });

  return rows.length;
}
