import { eq, sql } from "drizzle-orm";
import type { PlanTier } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import { driveFiles } from "@/lib/db/schema";
import { getPlanLimit } from "./plans";
import type { QuotaCheckResult } from "./access";

export async function getDriveStorageUsed(
  organizationId: string,
): Promise<number> {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${driveFiles.sizeBytes}), 0)::int`,
    })
    .from(driveFiles)
    .where(eq(driveFiles.organizationId, organizationId));

  return row?.total ?? 0;
}

export async function checkDriveStorageQuota(
  organizationId: string,
  planTier: PlanTier,
  additionalBytes = 0,
): Promise<QuotaCheckResult> {
  const used = await getDriveStorageUsed(organizationId);
  const projected = used + additionalBytes;
  const limit = getPlanLimit(planTier, "driveStorage");
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - projected);

  return {
    quota: "driveStorage",
    used: projected,
    limit,
    remaining,
    allowed: projected <= limit,
  };
}
