import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getOrSet } from "@/lib/cache/get-or-set";
import { cacheKeys } from "@/lib/cache/keys";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getOrgContext } from "@/lib/auth/org-context";
import type { OrgContext } from "@/lib/auth/types";
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

const QUOTA_TTL_SECONDS = 60;

async function fetchQuotaCheck(
  organizationId: string,
  planTier: OrgContext["planTier"],
  quota: QuotaType,
): Promise<QuotaCheckResult> {
  const subscription = await getDb().query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
    columns: {
      activeClientCount: true,
      aiCreditsUsed: true,
      apiCreditsUsed: true,
      notificationsSent: true,
    },
  });

  const usedMap: Record<QuotaType, number> = {
    clients: subscription?.activeClientCount ?? 0,
    ai: subscription?.aiCreditsUsed ?? 0,
    api: subscription?.apiCreditsUsed ?? 0,
    notifications: subscription?.notificationsSent ?? 0,
    exerciseVideo: 0,
    vodVideo: 0,
    driveFile: 0,
    driveStorage: 0,
  };

  const limit = getPlanLimit(planTier, quota);
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

  return getOrSet(
    cacheKeys.quota(orgContext.organizationId, quota),
    QUOTA_TTL_SECONDS,
    () =>
      fetchQuotaCheck(
        orgContext.organizationId,
        orgContext.planTier,
        quota,
      ),
  );
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
