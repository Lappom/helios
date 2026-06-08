import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { checkQuota } from "@/lib/billing/access";
import { getPlanLimit } from "@/lib/billing/plans";
import { withApiHandler, jsonOk } from "@/lib/api/handler";

export const GET = withApiHandler(
  { requireOrg: true, rateLimit: true },
  async ({ org }) => {
    if (!org) {
      return jsonOk({ error: "Organization required" }, { status: 403 });
    }

    const [clients, ai, notifications] = await Promise.all([
      checkQuota("clients"),
      checkQuota("ai"),
      checkQuota("notifications"),
    ]);

    const subscription = await getDb().query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, org.organizationId),
      columns: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    return jsonOk({
      organizationId: org.organizationId,
      planTier: org.planTier,
      subscription: subscription ?? null,
      quotas: {
        clients,
        ai,
        notifications,
      },
      limits: {
        clients: getPlanLimit(org.planTier, "clients"),
        ai: getPlanLimit(org.planTier, "ai"),
        notifications: getPlanLimit(org.planTier, "notifications"),
      },
    });
  },
);
