import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clientNotes,
  clients,
  clientStatusEvents,
  clientTagAssignments,
  clientTags,
} from "@/lib/db/schema";
import type { PlanTier } from "@/lib/auth/types";
import { ApiProblemError, problem } from "@/lib/api/response";
import type {
  AssignClientTagsInput,
  ClientStatus,
  CreateClientInput,
  ImportClientRow,
} from "@/lib/validators/clients";
import {
  assertQuotaForNewClients,
  assertQuotaForStatusChange,
  countsTowardQuota,
  reconcileActiveClientCount,
} from "./quota-sync";

export type ClientListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ClientStatus;
  clerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; color: string | null }[];
};

export type ClientDetail = ClientListItem & {
  notes: {
    id: string;
    body: string;
    authorClerkUserId: string;
    createdAt: Date;
  }[];
  statusEvents: {
    id: string;
    fromStatus: ClientStatus;
    toStatus: ClientStatus;
    changedByClerkUserId: string;
    createdAt: Date;
  }[];
};

export type TimelineEntry =
  | {
      type: "note";
      id: string;
      createdAt: Date | string;
      body: string;
      authorClerkUserId: string;
    }
  | {
      type: "status";
      id: string;
      createdAt: Date | string;
      fromStatus: ClientStatus;
      toStatus: ClientStatus;
      changedByClerkUserId: string;
    };

export type ListClientsOptions = {
  status?: ClientStatus;
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

async function loadTagsForClients(
  organizationId: string,
  clientIds: string[],
): Promise<Map<string, ClientListItem["tags"]>> {
  const tagMap = new Map<string, ClientListItem["tags"]>();

  if (clientIds.length === 0) {
    return tagMap;
  }

  const rows = await getDb()
    .select({
      clientId: clientTagAssignments.clientId,
      tagId: clientTags.id,
      name: clientTags.name,
      color: clientTags.color,
    })
    .from(clientTagAssignments)
    .innerJoin(clientTags, eq(clientTagAssignments.tagId, clientTags.id))
    .where(
      and(
        eq(clientTagAssignments.organizationId, organizationId),
        inArray(clientTagAssignments.clientId, clientIds),
      ),
    );

  for (const row of rows) {
    const existing = tagMap.get(row.clientId) ?? [];
    existing.push({ id: row.tagId, name: row.name, color: row.color });
    tagMap.set(row.clientId, existing);
  }

  return tagMap;
}

function buildClientWhere(organizationId: string, options: ListClientsOptions) {
  const conditions = [eq(clients.organizationId, organizationId)];

  if (options.status) {
    conditions.push(eq(clients.status, options.status));
  }

  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
        ilike(clients.email, term),
      )!,
    );
  }

  return and(...conditions);
}

export async function listClients(
  organizationId: string,
  options: ListClientsOptions,
): Promise<{ items: ClientListItem[]; total: number }> {
  const where = buildClientWhere(organizationId, options);

  const [rows, totalResult] = await Promise.all([
    getDb().query.clients.findMany({
      where,
      orderBy: [desc(clients.updatedAt)],
      limit: options.limit,
      offset: options.offset,
    }),
    getDb().select({ value: count() }).from(clients).where(where),
  ]);

  const tagMap = await loadTagsForClients(
    organizationId,
    rows.map((row) => row.id),
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      clerkUserId: row.clerkUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: tagMap.get(row.id) ?? [],
    })),
    total: totalResult[0]?.value ?? 0,
  };
}

export async function getClientOrThrow(
  organizationId: string,
  clientId: string,
): Promise<typeof clients.$inferSelect> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client '${clientId}' was not found in this organization.`,
    });
  }

  return client;
}

export async function getClientDetail(
  organizationId: string,
  clientId: string,
): Promise<ClientDetail> {
  const client = await getClientOrThrow(organizationId, clientId);

  const [notes, statusEvents, tagMap] = await Promise.all([
    getDb().query.clientNotes.findMany({
      where: and(
        eq(clientNotes.organizationId, organizationId),
        eq(clientNotes.clientId, clientId),
      ),
      orderBy: [desc(clientNotes.createdAt)],
    }),
    getDb().query.clientStatusEvents.findMany({
      where: and(
        eq(clientStatusEvents.organizationId, organizationId),
        eq(clientStatusEvents.clientId, clientId),
      ),
      orderBy: [desc(clientStatusEvents.createdAt)],
    }),
    loadTagsForClients(organizationId, [clientId]),
  ]);

  return {
    id: client.id,
    email: client.email,
    firstName: client.firstName,
    lastName: client.lastName,
    status: client.status,
    clerkUserId: client.clerkUserId,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    tags: tagMap.get(clientId) ?? [],
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      authorClerkUserId: note.authorClerkUserId,
      createdAt: note.createdAt,
    })),
    statusEvents: statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      changedByClerkUserId: event.changedByClerkUserId,
      createdAt: event.createdAt,
    })),
  };
}

export function buildClientTimeline(detail: ClientDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...detail.notes.map((note) => ({
      type: "note" as const,
      id: note.id,
      createdAt: note.createdAt,
      body: note.body,
      authorClerkUserId: note.authorClerkUserId,
    })),
    ...detail.statusEvents.map((event) => ({
      type: "status" as const,
      id: event.id,
      createdAt: event.createdAt,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      changedByClerkUserId: event.changedByClerkUserId,
    })),
  ];

  return entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function findClientByEmail(
  organizationId: string,
  email: string,
) {
  return getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.email, email.toLowerCase()),
    ),
  });
}

export async function createClient(
  organizationId: string,
  planTier: PlanTier,
  input: CreateClientInput,
): Promise<ClientListItem> {
  if (countsTowardQuota(input.status ?? "PROSPECT")) {
    await assertQuotaForNewClients(organizationId, planTier, 1);
  }

  const status = input.status ?? "PROSPECT";

  try {
    const [created] = await getDb()
      .insert(clients)
      .values({
        organizationId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        status,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create client");
    }

    if (countsTowardQuota(status)) {
      await reconcileActiveClientCount(organizationId);
    }

    return {
      id: created.id,
      email: created.email,
      firstName: created.firstName,
      lastName: created.lastName,
      status: created.status,
      clerkUserId: created.clerkUserId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      tags: [],
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw problem({
        type: "validation-error",
        title: "Duplicate client",
        status: 409,
        detail: "A client with this email already exists in your organization.",
      });
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && (error as { code: string }).code === "23505") {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : "";

  return message.includes("clients_org_email_idx");
}

export async function updateClientStatus(
  organizationId: string,
  planTier: PlanTier,
  clientId: string,
  status: ClientStatus,
  changedByClerkUserId: string,
): Promise<ClientListItem> {
  const client = await getClientOrThrow(organizationId, clientId);

  if (client.status === status) {
    const tagMap = await loadTagsForClients(organizationId, [clientId]);
    return {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
      clerkUserId: client.clerkUserId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      tags: tagMap.get(clientId) ?? [],
    };
  }

  await assertQuotaForStatusChange(
    organizationId,
    planTier,
    client.status,
    status,
  );

  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .update(clients)
      .set({ status, updatedAt: now })
      .where(
        and(
          eq(clients.organizationId, organizationId),
          eq(clients.id, clientId),
        ),
      );

    await tx.insert(clientStatusEvents).values({
      organizationId,
      clientId,
      fromStatus: client.status,
      toStatus: status,
      changedByClerkUserId,
    });
  });

  await reconcileActiveClientCount(organizationId);

  const updated = await getClientOrThrow(organizationId, clientId);
  const tagMap = await loadTagsForClients(organizationId, [clientId]);

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    status: updated.status,
    clerkUserId: updated.clerkUserId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    tags: tagMap.get(clientId) ?? [],
  };
}

export async function addClientNote(
  organizationId: string,
  clientId: string,
  authorClerkUserId: string,
  body: string,
) {
  await getClientOrThrow(organizationId, clientId);

  const [note] = await getDb()
    .insert(clientNotes)
    .values({
      organizationId,
      clientId,
      authorClerkUserId,
      body,
    })
    .returning();

  return note;
}

export async function listClientNotes(
  organizationId: string,
  clientId: string,
) {
  await getClientOrThrow(organizationId, clientId);

  return getDb().query.clientNotes.findMany({
    where: and(
      eq(clientNotes.organizationId, organizationId),
      eq(clientNotes.clientId, clientId),
    ),
    orderBy: [desc(clientNotes.createdAt)],
  });
}

export async function addClientTag(
  organizationId: string,
  clientId: string,
  tagName: string,
  color?: string,
): Promise<ClientListItem["tags"]> {
  await getClientOrThrow(organizationId, clientId);
  const name = tagName.trim();
  if (!name) {
    throw problem({
      type: "validation-error",
      title: "Invalid tag",
      status: 400,
      detail: "Tag name cannot be empty.",
    });
  }

  const [existingTag] = await getDb()
    .select()
    .from(clientTags)
    .where(
      and(
        eq(clientTags.organizationId, organizationId),
        eq(clientTags.name, name),
      ),
    )
    .limit(1);

  const tag =
    existingTag ??
    (
      await getDb()
        .insert(clientTags)
        .values({ organizationId, name, color: color ?? null })
        .returning()
    )[0]!;

  const existingAssignment = await getDb().query.clientTagAssignments.findFirst({
    where: and(
      eq(clientTagAssignments.organizationId, organizationId),
      eq(clientTagAssignments.clientId, clientId),
      eq(clientTagAssignments.tagId, tag.id),
    ),
    columns: { id: true },
  });

  if (!existingAssignment) {
    await getDb().insert(clientTagAssignments).values({
      organizationId,
      clientId,
      tagId: tag.id,
    });
  }

  const tagMap = await loadTagsForClients(organizationId, [clientId]);
  return tagMap.get(clientId) ?? [];
}

export async function addClientTagById(
  organizationId: string,
  clientId: string,
  tagId: string,
): Promise<ClientListItem["tags"]> {
  await getClientOrThrow(organizationId, clientId);

  const tag = await getDb().query.clientTags.findFirst({
    where: and(
      eq(clientTags.organizationId, organizationId),
      eq(clientTags.id, tagId),
    ),
    columns: { id: true },
  });

  if (!tag) {
    throw problem({
      type: "not-found",
      title: "Tag not found",
      status: 404,
      detail: "The tag does not exist in this organization.",
    });
  }

  const existingAssignment = await getDb().query.clientTagAssignments.findFirst({
    where: and(
      eq(clientTagAssignments.organizationId, organizationId),
      eq(clientTagAssignments.clientId, clientId),
      eq(clientTagAssignments.tagId, tagId),
    ),
    columns: { id: true },
  });

  if (!existingAssignment) {
    await getDb().insert(clientTagAssignments).values({
      organizationId,
      clientId,
      tagId,
    });
  }

  const tagMap = await loadTagsForClients(organizationId, [clientId]);
  return tagMap.get(clientId) ?? [];
}

export async function setClientTags(
  organizationId: string,
  clientId: string,
  input: AssignClientTagsInput,
): Promise<ClientListItem["tags"]> {
  await getClientOrThrow(organizationId, clientId);

  const uniqueNames = [...new Set(input.tagNames.map((name) => name.trim()))];

  await getDb().transaction(async (tx) => {
    await tx
      .delete(clientTagAssignments)
      .where(
        and(
          eq(clientTagAssignments.organizationId, organizationId),
          eq(clientTagAssignments.clientId, clientId),
        ),
      );

    if (uniqueNames.length === 0) {
      return;
    }

    const tagRows = await Promise.all(
      uniqueNames.map(async (name) => {
        const [existing] = await tx
          .select()
          .from(clientTags)
          .where(
            and(
              eq(clientTags.organizationId, organizationId),
              eq(clientTags.name, name),
            ),
          )
          .limit(1);

        if (existing) {
          return existing;
        }

        const [created] = await tx
          .insert(clientTags)
          .values({ organizationId, name })
          .returning();

        return created!;
      }),
    );

    await tx.insert(clientTagAssignments).values(
      tagRows.map((tag) => ({
        organizationId,
        clientId,
        tagId: tag.id,
      })),
    );
  });

  const tagMap = await loadTagsForClients(organizationId, [clientId]);
  return tagMap.get(clientId) ?? [];
}

export async function importClientsFromCsv(
  organizationId: string,
  planTier: PlanTier,
  rows: ImportClientRow[],
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      await createClient(organizationId, planTier, row);
      imported += 1;
    } catch (error) {
      if (error instanceof ApiProblemError && error.problem.status === 409) {
        skipped += 1;
        errors.push(`Skipped duplicate: ${row.email}`);
        continue;
      }

      if (
        error instanceof ApiProblemError &&
        error.problem.type === "quota-exceeded"
      ) {
        errors.push(`Quota exceeded after ${imported} imports.`);
        break;
      }

      errors.push(
        `Failed to import ${row.email}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  await reconcileActiveClientCount(organizationId);

  return { imported, skipped, errors };
}

export async function listAllClientsForKanban(
  organizationId: string,
): Promise<ClientListItem[]> {
  const rows = await getDb().query.clients.findMany({
    where: eq(clients.organizationId, organizationId),
    orderBy: [asc(clients.lastName), asc(clients.firstName)],
  });

  const tagMap = await loadTagsForClients(
    organizationId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.status,
    clerkUserId: row.clerkUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: tagMap.get(row.id) ?? [],
  }));
}
