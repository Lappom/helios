import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { getDb, runWithDbScope } from "@/lib/db";
import { clients, teamMembers } from "@/lib/db/schema";
import { ensureOrganizationSynced } from "@/lib/db/sync/clerk";
import {
  mapTeamMemberRoleToOrgRole,
  mapClerkRoleToTeamMemberRole,
  isOrgRole,
} from "./roles";
import type { OrgContext, OrgRole } from "./types";
import { problem } from "@/lib/api/response";

export async function getOrgContext(): Promise<OrgContext | null> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    return null;
  }

  return runWithDbScope({ bypass: true }, async () => {
    const organization = await ensureOrganizationSynced(orgId);

    if (!organization) {
      return null;
    }

    const clientRecord = await getDb().query.clients.findFirst({
      where: and(
        eq(clients.organizationId, organization.id),
        eq(clients.clerkUserId, userId),
      ),
      columns: { id: true },
    });

    if (clientRecord) {
      return {
        clerkUserId: userId,
        clerkOrgId: orgId,
        organizationId: organization.id,
        role: "client" as const,
        planTier: organization.planTier,
      };
    }

    const member = await getDb().query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.organizationId, organization.id),
        eq(teamMembers.clerkUserId, userId),
      ),
      columns: { role: true },
    });

    const role: OrgRole = member
      ? mapTeamMemberRoleToOrgRole(member.role)
      : orgRole
        ? mapTeamMemberRoleToOrgRole(mapClerkRoleToTeamMemberRole(orgRole))
        : "coach";

    return {
      clerkUserId: userId,
      clerkOrgId: orgId,
      organizationId: organization.id,
      role,
      planTier: organization.planTier,
    };
  });
}

export async function requireOrg(): Promise<OrgContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw problem({
      type: "unauthorized",
      title: "Authentication required",
      status: 401,
      detail: "You must be signed in to access this resource.",
    });
  }

  if (!orgId) {
    throw problem({
      type: "forbidden",
      title: "Organization required",
      status: 403,
      detail: "An active organization context is required.",
    });
  }

  const context = await getOrgContext();

  if (!context) {
    throw problem({
      type: "forbidden",
      title: "Organization not found",
      status: 403,
      detail: "The active organization is not synced to Helios yet.",
    });
  }

  return context;
}

export async function requireRole(
  ...roles: OrgRole[]
): Promise<OrgContext> {
  const context = await requireOrg();

  if (!isOrgRole(context.role, roles)) {
    throw problem({
      type: "forbidden",
      title: "Insufficient permissions",
      status: 403,
      detail: `Required role: ${roles.join(" or ")}.`,
    });
  }

  return context;
}
