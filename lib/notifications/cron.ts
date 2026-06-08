import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type { PlanTier } from "@/lib/auth/types";

export async function getOrganizationPlanTier(
  organizationId: string,
): Promise<PlanTier> {
  const org = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { planTier: true },
  });

  return org?.planTier ?? "STARTER";
}
