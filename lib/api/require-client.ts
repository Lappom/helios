import { and, eq } from "drizzle-orm";
import { getDb, runWithDbScope } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/org-context";
import type { OrgContext } from "@/lib/auth/types";
import { problem } from "@/lib/api/response";

export type ClientContext = OrgContext & { clientId: string };

export async function getClientIdForUser(
  organizationId: string,
  clerkUserId: string,
): Promise<string | null> {
  const row = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.clerkUserId, clerkUserId),
    ),
    columns: { id: true },
  });

  return row?.id ?? null;
}

export async function requireClient(): Promise<ClientContext> {
  const context = await requireRole("client");
  const clientId = await runWithDbScope(
    { organizationId: context.organizationId },
    () =>
      getClientIdForUser(context.organizationId, context.clerkUserId),
  );

  if (!clientId) {
    throw problem({
      type: "forbidden",
      title: "Client profile not found",
      status: 403,
      detail: "No client record is linked to this account in this organization.",
    });
  }

  return { ...context, clientId };
}
