import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getOrgContext } from "@/lib/auth/org-context";
import { problem } from "@/lib/api/response";
import {
  getPlanLimit,
  type ClerkFeature,
  type QuotaType,
} from "./plans";

export async function hasPlan(plan: string): Promise<boolean> {
  const { has } = await auth();
  return has({ plan });
}

export async function hasFeature(feature: ClerkFeature | string): Promise<boolean> {
  const { has } = await auth();
  return has({ feature });
}

export type QuotaCheckResult = {
  quota: QuotaType;
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
};

export async function checkQuota(quota: QuotaType): Promise<QuotaCheckResult> {
  const orgContext = await getOrgContext();

  if (!orgContext) {
    throw problem({
      type: "unauthorized",
      title: "Authentication required",
      status: 401,
      detail: "Organization context is required to check quotas.",
    });
  }

  const resolvedOrgId = orgContext.organizationId;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, resolvedOrgId),
    columns: {
      activeClientCount: true,
      aiCreditsUsed: true,
      notificationsSent: true,
    },
  });

  const usedMap: Record<QuotaType, number> = {
    clients: subscription?.activeClientCount ?? 0,
    ai: subscription?.aiCreditsUsed ?? 0,
    notifications: subscription?.notificationsSent ?? 0,
    exerciseVideo: 0,
    driveFile: 0,
    driveStorage: 0,
  };

  const limit = getPlanLimit(orgContext.planTier, quota);
  const used = usedMap[quota];
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - used);

  return {
    quota,
    used,
    limit,
    remaining,
    allowed: used < limit,
  };
}

export async function requireQuota(quota: QuotaType): Promise<QuotaCheckResult> {
  const result = await checkQuota(quota);

  if (!result.allowed) {
    throw problem({
      type: "quota-exceeded",
      title: "Quota exceeded",
      status: 402,
      detail: `${quota} quota exceeded (${result.used}/${result.limit}).`,
    });
  }

  return result;
}
