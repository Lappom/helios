import "server-only";

import { eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { getDb, runWithDbScope } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { verifyApiKey } from "@/lib/integrations/api-keys";
import { getPlanLimit } from "@/lib/billing/plans";

export type ApiKeyContext = {
  organizationId: string;
  planTier: PlanTier;
  apiKeyId: string;
};

const API_ACCESS_PLANS: PlanTier[] = ["BUSINESS", "TEAM"];

export function planHasApiAccess(planTier: PlanTier): boolean {
  return API_ACCESS_PLANS.includes(planTier);
}

export async function requireApiKey(request: Request): Promise<ApiKeyContext> {
  return runWithDbScope({ bypass: true }, () => resolveApiKey(request));
}

async function resolveApiKey(request: Request): Promise<ApiKeyContext> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw problem({
      type: "unauthorized",
      title: "API key required",
      status: 401,
      detail: "Provide a valid API key via Authorization: Bearer hls_...",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();
  const verified = await verifyApiKey(token);

  if (!verified) {
    throw problem({
      type: "unauthorized",
      title: "Invalid API key",
      status: 401,
      detail: "The provided API key is invalid or revoked.",
    });
  }

  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, verified.organizationId),
    columns: {
      id: true,
      planTier: true,
    },
  });

  if (!organization) {
    throw problem({
      type: "unauthorized",
      title: "Organization not found",
      status: 401,
      detail: "API key organization could not be resolved.",
    });
  }

  if (!planHasApiAccess(organization.planTier)) {
    throw problem({
      type: "forbidden",
      title: "API access not available",
      status: 403,
      detail: "API access requires a Business or Team plan.",
    });
  }

  const apiLimit = getPlanLimit(organization.planTier, "api");
  if (apiLimit === 0) {
    throw problem({
      type: "forbidden",
      title: "API access not available",
      status: 403,
      detail: "API access is not enabled for this plan.",
    });
  }

  return {
    organizationId: organization.id,
    planTier: organization.planTier,
    apiKeyId: verified.apiKeyId,
  };
}
