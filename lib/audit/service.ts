import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { LogAuditEventInput } from "./types";

const RETENTION_DAYS = 90;

function requestMetadata(request?: Request): Record<string, unknown> {
  if (!request) {
    return {};
  }

  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  const metadata = {
    ...requestMetadata(input.request),
    ...(input.metadata ?? {}),
  };

  await getDb().insert(auditLogs).values({
    organizationId: input.organizationId,
    actorClerkUserId: input.actor.clerkUserId ?? null,
    actorType: input.actor.type,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  });
}

export type ListAuditLogsOptions = {
  page: number;
  limit: number;
  offset: number;
};

export async function listAuditLogs(
  organizationId: string,
  options: ListAuditLogsOptions,
) {
  const where = eq(auditLogs.organizationId, organizationId);

  const [items, countRow] = await Promise.all([
    getDb().query.auditLogs.findMany({
      where,
      orderBy: [desc(auditLogs.createdAt)],
      limit: options.limit,
      offset: options.offset,
    }),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    items,
    total: countRow[0]?.count ?? 0,
  };
}

export async function purgeExpiredAuditLogs(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const deleted = await getDb()
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .returning({ id: auditLogs.id });

  return deleted.length;
}

export async function purgeExpiredAuditLogsForOrg(
  organizationId: string,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const deleted = await getDb()
    .delete(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        lt(auditLogs.createdAt, cutoff),
      ),
    )
    .returning({ id: auditLogs.id });

  return deleted.length;
}
