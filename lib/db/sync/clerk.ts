import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  organizations,
  subscriptions,
  teamMembers,
} from "@/lib/db/schema";
import { mapClerkRoleToTeamMemberRole } from "@/lib/auth/roles";
import { isClientClerkRole } from "@/lib/clients/invite";
import {
  mapClerkPlanSlugToTier,
  mapClerkSubscriptionStatus,
} from "@/lib/billing/plans";
import { logger } from "@/lib/api/logger";

const TRIAL_DAYS = 14;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function ensureOrganizationSynced(clerkOrgId: string): Promise<{
  id: string;
  planTier: (typeof organizations.$inferSelect)["planTier"];
} | null> {
  const existing = await getDb().query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, clerkOrgId),
    columns: { id: true, planTier: true },
  });

  if (existing) {
    return existing;
  }

  try {
    const clerk = await clerkClient();
    const clerkOrg = await clerk.organizations.getOrganization({
      organizationId: clerkOrgId,
    });

    await handleOrganizationCreated({
      id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? clerkOrg.id,
    });

    return (
      (await getDb().query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, clerkOrgId),
        columns: { id: true, planTier: true },
      })) ?? null
    );
  } catch (error) {
    logger.warn("Failed to sync organization from Clerk", {
      clerkOrgId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function handleOrganizationCreated(data: {
  id: string;
  name: string;
  slug: string;
}): Promise<void> {
  const now = new Date();
  const trialEndsAt = addDays(now, TRIAL_DAYS);
  const periodEnd = addDays(now, 30);

  await getDb().transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        clerkOrgId: data.id,
        name: data.name,
        slug: data.slug,
        planTier: "STARTER",
        trialEndsAt,
      })
      .onConflictDoUpdate({
        target: organizations.clerkOrgId,
        set: {
          name: data.name,
          slug: data.slug,
          updatedAt: now,
        },
      })
      .returning({ id: organizations.id });

    if (!org) {
      return;
    }

    await tx
      .insert(subscriptions)
      .values({
        organizationId: org.id,
        status: "TRIALING",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .onConflictDoNothing();
  });
}

export async function handleOrganizationUpdated(data: {
  id: string;
  name: string;
  slug: string;
}): Promise<void> {
  await getDb()
    .update(organizations)
    .set({
      name: data.name,
      slug: data.slug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.clerkOrgId, data.id));
}

export async function handleOrganizationDeleted(data: {
  id?: string;
}): Promise<void> {
  if (!data.id) {
    return;
  }

  await getDb()
    .delete(organizations)
    .where(eq(organizations.clerkOrgId, data.id));
}

export async function handleOrganizationMembershipUpsert(data: {
  organization: { id: string };
  public_user_data: { user_id: string; identifier?: string };
  role: string;
}): Promise<void> {
  const org = await getDb().query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, data.organization.id),
    columns: { id: true },
  });

  if (!org) {
    logger.warn("Organization membership sync skipped: org not found", {
      clerkOrgId: data.organization.id,
    });
    return;
  }

  if (isClientClerkRole(data.role)) {
    await linkClientMembership(org.id, data);
    return;
  }

  const teamRole = mapClerkRoleToTeamMemberRole(data.role);

  await getDb()
    .insert(teamMembers)
    .values({
      organizationId: org.id,
      clerkUserId: data.public_user_data.user_id,
      role: teamRole,
      joinedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [teamMembers.organizationId, teamMembers.clerkUserId],
      set: {
        role: teamRole,
        updatedAt: new Date(),
      },
    });
}

async function linkClientMembership(
  organizationId: string,
  data: {
    public_user_data: { user_id: string; identifier?: string };
  },
): Promise<void> {
  const email = data.public_user_data.identifier?.toLowerCase();

  if (!email) {
    logger.warn("Client membership sync skipped: missing email identifier", {
      clerkUserId: data.public_user_data.user_id,
    });
    return;
  }

  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.email, email),
    ),
    columns: { id: true },
  });

  if (!client) {
    logger.warn("Client membership sync skipped: client not found", {
      organizationId,
      email,
    });
    return;
  }

  await getDb()
    .update(clients)
    .set({
      clerkUserId: data.public_user_data.user_id,
      updatedAt: new Date(),
    })
    .where(
      and(eq(clients.organizationId, organizationId), eq(clients.id, client.id)),
    );
}

export async function handleOrganizationMembershipDeleted(data: {
  organization: { id: string };
  public_user_data: { user_id: string; identifier?: string };
  role?: string;
}): Promise<void> {
  const org = await getDb().query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, data.organization.id),
    columns: { id: true },
  });

  if (!org) {
    return;
  }

  if (data.role && isClientClerkRole(data.role)) {
    await getDb()
      .update(clients)
      .set({ clerkUserId: null, updatedAt: new Date() })
      .where(
        and(
          eq(clients.organizationId, org.id),
          eq(clients.clerkUserId, data.public_user_data.user_id),
        ),
      );
    return;
  }

  await getDb().delete(teamMembers).where(
    and(
      eq(teamMembers.organizationId, org.id),
      eq(teamMembers.clerkUserId, data.public_user_data.user_id),
    ),
  );
}

export async function handleUserUpdated(data: {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
}): Promise<void> {
  const email = data.email_addresses?.[0]?.email_address;
  if (!email) {
    return;
  }

  await getDb()
    .update(clients)
    .set({ email, updatedAt: new Date() })
    .where(eq(clients.clerkUserId, data.id));
}

export async function handleUserDeleted(data: { id: string }): Promise<void> {
  const linkedClients = await getDb().query.clients.findMany({
    where: eq(clients.clerkUserId, data.id),
    columns: {
      id: true,
      organizationId: true,
    },
  });

  if (linkedClients.length === 0) {
    return;
  }

  const { eraseClientData } = await import("@/lib/privacy/service");

  for (const client of linkedClients) {
    await eraseClientData(
      client.organizationId,
      client.id,
      { type: "system" },
      { skipClerkDeletion: true },
    );
  }
}

type SubscriptionWebhookData = {
  id?: string;
  status?: string;
  payer_id?: string;
  current_period_start?: number;
  current_period_end?: number;
  plan?: { slug?: string | null } | null;
  items?: Array<{ plan?: { slug?: string | null } | null }>;
};

function extractPlanSlug(data: SubscriptionWebhookData): string | undefined {
  if (data.plan?.slug) {
    return data.plan.slug;
  }

  for (const item of data.items ?? []) {
    if (item.plan?.slug) {
      return item.plan.slug;
    }
  }

  return undefined;
}

export async function handleSubscriptionUpsert(
  data: SubscriptionWebhookData,
): Promise<void> {
  const clerkOrgId = data.payer_id;
  if (!clerkOrgId) {
    logger.warn("Subscription sync skipped: missing payer_id", {
      subscriptionId: data.id,
    });
    return;
  }

  const org = await getDb().query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, clerkOrgId),
    columns: { id: true },
  });

  if (!org) {
    logger.warn("Subscription sync skipped: org not found", { clerkOrgId });
    return;
  }

  const planSlug = extractPlanSlug(data);
  const planTier = planSlug ? mapClerkPlanSlugToTier(planSlug) : undefined;
  const status = mapClerkSubscriptionStatus(data.status ?? "trialing");
  const periodStart = data.current_period_start
    ? new Date(data.current_period_start)
    : new Date();
  const periodEnd = data.current_period_end
    ? new Date(data.current_period_end)
    : addDays(periodStart, 30);

  await getDb().transaction(async (tx) => {
    if (planTier || planSlug) {
      await tx
        .update(organizations)
        .set({
          ...(planTier ? { planTier } : {}),
          ...(planSlug ? { clerkPlanSlug: planSlug } : {}),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id));
    }

    await tx
      .insert(subscriptions)
      .values({
        organizationId: org.id,
        clerkSubscriptionId: data.id,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptions.organizationId,
        set: {
          clerkSubscriptionId: data.id,
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        },
      });
  });
}

export async function handleSubscriptionDeleted(data: {
  id?: string;
  payer_id?: string;
}): Promise<void> {
  const clerkOrgId = data.payer_id;
  if (!clerkOrgId) {
    return;
  }

  const org = await getDb().query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, clerkOrgId),
    columns: { id: true },
  });

  if (!org) {
    return;
  }

  await getDb()
    .update(subscriptions)
    .set({
      status: "CANCELED",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, org.id));
}
