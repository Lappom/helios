import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import { sessionLogs } from "@/lib/db/schema";
import type { ListSessionLogsQuery } from "@/lib/validators/integrations";

export type PublicSessionLogItem = {
  id: string;
  clientId: string;
  assignmentId: string;
  programSessionId: string;
  scheduledDate: Date;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
};

function mapSessionLog(row: typeof sessionLogs.$inferSelect): PublicSessionLogItem {
  return {
    id: row.id,
    clientId: row.clientId,
    assignmentId: row.assignmentId,
    programSessionId: row.programSessionId,
    scheduledDate: row.scheduledDate,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}

export async function listSessionLogs(
  organizationId: string,
  query: ListSessionLogsQuery,
): Promise<{ items: PublicSessionLogItem[]; total: number }> {
  const filters = [eq(sessionLogs.organizationId, organizationId)];

  if (query.clientId) {
    filters.push(eq(sessionLogs.clientId, query.clientId));
  }

  if (query.status) {
    filters.push(eq(sessionLogs.status, query.status));
  }

  if (query.from) {
    filters.push(gte(sessionLogs.scheduledDate, query.from));
  }

  if (query.to) {
    filters.push(lte(sessionLogs.scheduledDate, query.to));
  }

  const where = and(...filters);

  const [totalRow] = await db
    .select({ value: count() })
    .from(sessionLogs)
    .where(where);

  const rows = await db.query.sessionLogs.findMany({
    where,
    orderBy: [desc(sessionLogs.scheduledDate)],
    limit: query.limit,
    offset: query.offset,
  });

  return {
    items: rows.map(mapSessionLog),
    total: totalRow?.value ?? 0,
  };
}

export async function getSessionLog(
  organizationId: string,
  sessionLogId: string,
): Promise<PublicSessionLogItem> {
  const row = await db.query.sessionLogs.findFirst({
    where: and(
      eq(sessionLogs.id, sessionLogId),
      eq(sessionLogs.organizationId, organizationId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
      detail: "Session log was not found.",
    });
  }

  return mapSessionLog(row);
}
