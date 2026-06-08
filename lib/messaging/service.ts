import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import {
  clients,
  conversationParticipants,
  conversations,
  messages,
  teamMembers,
} from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import type {
  ConversationListItem,
  GroupParticipantItem,
  MessageItem,
  MessagingActor,
} from "@/lib/messaging/types";
import type {
  AddGroupParticipantsInput,
  CreateGroupConversationInput,
  SendMessageInput,
} from "@/lib/validators/messaging";

const PREVIEW_BY_TYPE: Record<string, string> = {
  text: "",
  image: "Photo",
  video: "Video",
  audio: "Voice message",
  file: "File",
};

type ConversationRow = typeof conversations.$inferSelect & {
  client: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    clerkUserId: string | null;
  } | null;
};

function clientDisplayName(client: {
  firstName: string;
  lastName: string;
}): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

function buildPreview(type: string, content: string | null | undefined): string {
  if (type === "text") {
    const text = content?.trim() ?? "";
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }
  return PREVIEW_BY_TYPE[type] ?? "Message";
}

function mapMessageRow(
  row: typeof messages.$inferSelect,
  actorClerkUserId: string,
  senderDisplayName?: string,
): MessageItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderClerkUserId: row.senderClerkUserId,
    senderDisplayName,
    type: row.type,
    content: row.content,
    mediaPathname: row.mediaPathname,
    fileName: row.fileName,
    mimeType: row.mimeType,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    isOwn: row.senderClerkUserId === actorClerkUserId,
  };
}

async function getConversationOrThrow(
  organizationId: string,
  conversationId: string,
): Promise<ConversationRow> {
  const conversation = await getDb().query.conversations.findFirst({
    where: and(
      eq(conversations.organizationId, organizationId),
      eq(conversations.id, conversationId),
    ),
    with: {
      client: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          clerkUserId: true,
        },
      },
    },
  });

  if (!conversation) {
    throw problem({
      type: "not-found",
      title: "Conversation not found",
      status: 404,
      detail: "The conversation does not exist in this organization.",
    });
  }

  return conversation;
}

async function isConversationParticipant(
  organizationId: string,
  conversationId: string,
  clerkUserId: string,
): Promise<boolean> {
  const participant = await getDb().query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.organizationId, organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.clerkUserId, clerkUserId),
    ),
    columns: { id: true },
  });

  return Boolean(participant);
}

export async function assertConversationAccess(
  organizationId: string,
  conversationId: string,
  actor: MessagingActor,
): Promise<ConversationRow> {
  const conversation = await getConversationOrThrow(
    organizationId,
    conversationId,
  );

  if (actor.role === "client") {
    if (conversation.type === "direct") {
      if (conversation.clientId !== actor.clientId) {
        throw problem({
          type: "forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You cannot access this conversation.",
        });
      }
    } else {
      const isMember = await isConversationParticipant(
        organizationId,
        conversationId,
        actor.clerkUserId,
      );
      if (!isMember) {
        throw problem({
          type: "forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You are not a member of this group.",
        });
      }
    }
  }

  return conversation;
}

async function ensureParticipant(
  organizationId: string,
  conversationId: string,
  clerkUserId: string,
  role: "coach" | "client",
) {
  const existing = await getDb().query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.clerkUserId, clerkUserId),
    ),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  await getDb().insert(conversationParticipants).values({
    organizationId,
    conversationId,
    clerkUserId,
    role,
  });
}

async function getUnreadCount(
  organizationId: string,
  conversationId: string,
  clerkUserId: string,
  lastReadAt: Date | null,
): Promise<number> {
  const conditions = [
    eq(messages.organizationId, organizationId),
    eq(messages.conversationId, conversationId),
    isNull(messages.deletedAt),
    ne(messages.senderClerkUserId, clerkUserId),
  ];

  if (lastReadAt) {
    conditions.push(gt(messages.createdAt, lastReadAt));
  }

  const [result] = await getDb()
    .select({ value: count() })
    .from(messages)
    .where(and(...conditions));

  return result?.value ?? 0;
}

async function getParticipantCount(conversationId: string): Promise<number> {
  const [result] = await getDb()
    .select({ value: count() })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));

  return result?.value ?? 0;
}

async function getClientParticipantLastRead(
  organizationId: string,
  conversationId: string,
  clientClerkUserId: string | null,
): Promise<Date | null> {
  if (!clientClerkUserId) {
    return null;
  }

  const participant = await getDb().query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.organizationId, organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.clerkUserId, clientClerkUserId),
      eq(conversationParticipants.role, "client"),
    ),
    columns: { lastReadAt: true },
  });

  return participant?.lastReadAt ?? null;
}

async function getCoachParticipantsLastRead(
  organizationId: string,
  conversationId: string,
): Promise<Date | null> {
  const participants = await getDb().query.conversationParticipants.findMany({
    where: and(
      eq(conversationParticipants.organizationId, organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.role, "coach"),
    ),
    columns: { lastReadAt: true },
  });

  const timestamps = participants
    .map((participant) => participant.lastReadAt)
    .filter((value): value is Date => value instanceof Date);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps.map((value) => value.getTime())));
}

async function mapConversationListItem(
  row: ConversationRow,
  viewerClerkUserId: string,
): Promise<ConversationListItem> {
  const participant = await getDb().query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, row.id),
      eq(conversationParticipants.clerkUserId, viewerClerkUserId),
    ),
    columns: { lastReadAt: true },
  });

  const unreadCount = await getUnreadCount(
    row.organizationId,
    row.id,
    viewerClerkUserId,
    participant?.lastReadAt ?? null,
  );

  const coachLastReadAt = await getCoachParticipantsLastRead(
    row.organizationId,
    row.id,
  );

  if (row.type === "group") {
    const participantCount = await getParticipantCount(row.id);

    return {
      id: row.id,
      type: "group",
      name: row.name ?? "Groupe",
      participantCount,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      lastMessagePreview: row.lastMessagePreview,
      unreadCount,
      clientLastReadAt: null,
      coachLastReadAt: coachLastReadAt?.toISOString() ?? null,
    };
  }

  if (!row.client) {
    throw problem({
      type: "internal-error",
      title: "Invalid conversation",
      status: 500,
      detail: "Direct conversation is missing client data.",
    });
  }

  const clientLastReadAt = await getClientParticipantLastRead(
    row.organizationId,
    row.id,
    row.client.clerkUserId,
  );

  return {
    id: row.id,
    type: "direct",
    clientId: row.client.id,
    clientName: clientDisplayName(row.client),
    clientEmail: row.client.email,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: row.lastMessagePreview,
    unreadCount,
    clientLastReadAt: clientLastReadAt?.toISOString() ?? null,
    coachLastReadAt: coachLastReadAt?.toISOString() ?? null,
  };
}

function sortConversationItems(items: ConversationListItem[]): ConversationListItem[] {
  return [...items].sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });
}

async function resolveDefaultCoachClerkUserId(
  organizationId: string,
  fallbackClerkUserId: string,
): Promise<string> {
  const member = await getDb().query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.organizationId, organizationId),
      inArray(teamMembers.role, ["owner", "admin", "coach"]),
    ),
    columns: { clerkUserId: true },
  });

  return member?.clerkUserId ?? fallbackClerkUserId;
}

async function resolveClientsForGroup(
  organizationId: string,
  clientIds: string[],
) {
  const uniqueIds = [...new Set(clientIds)];

  const rows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.id, uniqueIds),
    ),
    columns: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      clerkUserId: true,
    },
  });

  if (rows.length !== uniqueIds.length) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: "One or more clients do not exist in this organization.",
    });
  }

  const missingClerk = rows.filter((row) => !row.clerkUserId);
  if (missingClerk.length > 0) {
    throw problem({
      type: "validation-error",
      title: "Client not onboarded",
      status: 422,
      detail:
        "All group participants must have an active account. Some clients are not onboarded yet.",
    });
  }

  return rows;
}

async function buildSenderDisplayNameMap(
  organizationId: string,
  conversationId: string,
  senderClerkUserIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(senderClerkUserIds)];
  const map = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return map;
  }

  const clientRows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.clerkUserId, uniqueIds),
    ),
    columns: {
      clerkUserId: true,
      firstName: true,
      lastName: true,
    },
  });

  for (const client of clientRows) {
    if (client.clerkUserId) {
      map.set(client.clerkUserId, clientDisplayName(client));
    }
  }

  const coachRows = await getDb().query.teamMembers.findMany({
    where: and(
      eq(teamMembers.organizationId, organizationId),
      inArray(teamMembers.clerkUserId, uniqueIds),
    ),
    columns: { clerkUserId: true },
  });

  for (const coach of coachRows) {
    map.set(coach.clerkUserId, "Coach");
  }

  const participants = await getDb().query.conversationParticipants.findMany({
    where: and(
      eq(conversationParticipants.organizationId, organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      inArray(conversationParticipants.clerkUserId, uniqueIds),
    ),
    columns: { clerkUserId: true, role: true },
  });

  for (const participant of participants) {
    if (!map.has(participant.clerkUserId)) {
      map.set(
        participant.clerkUserId,
        participant.role === "coach" ? "Coach" : "Client",
      );
    }
  }

  return map;
}

export async function findOrCreateDirectConversation(
  organizationId: string,
  clientId: string,
  coachClerkUserId: string,
): Promise<ConversationListItem> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      clerkUserId: true,
    },
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: "The client does not exist in this organization.",
    });
  }

  const existing = await getDb().query.conversations.findFirst({
    where: and(
      eq(conversations.organizationId, organizationId),
      eq(conversations.clientId, clientId),
      eq(conversations.type, "direct"),
    ),
    with: {
      client: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          clerkUserId: true,
        },
      },
    },
  });

  if (existing) {
    await ensureParticipant(
      organizationId,
      existing.id,
      coachClerkUserId,
      "coach",
    );
    return mapConversationListItem(existing, coachClerkUserId);
  }

  const [created] = await getDb()
    .insert(conversations)
    .values({
      organizationId,
      type: "direct",
      clientId,
    })
    .returning();

  await ensureParticipant(
    organizationId,
    created.id,
    coachClerkUserId,
    "coach",
  );

  if (client.clerkUserId) {
    await ensureParticipant(
      organizationId,
      created.id,
      client.clerkUserId,
      "client",
    );
  }

  return mapConversationListItem({ ...created, client }, coachClerkUserId);
}

export async function createGroupConversation(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateGroupConversationInput,
): Promise<ConversationListItem> {
  const clientRows = await resolveClientsForGroup(
    organizationId,
    input.clientIds,
  );

  const [created] = await getDb()
    .insert(conversations)
    .values({
      organizationId,
      type: "group",
      name: input.name,
      coachClerkUserId,
      maxParticipants: 50,
    })
    .returning();

  await ensureParticipant(
    organizationId,
    created.id,
    coachClerkUserId,
    "coach",
  );

  for (const client of clientRows) {
    if (client.clerkUserId) {
      await ensureParticipant(
        organizationId,
        created.id,
        client.clerkUserId,
        "client",
      );
    }
  }

  return mapConversationListItem({ ...created, client: null }, coachClerkUserId);
}

export async function addGroupParticipants(
  organizationId: string,
  conversationId: string,
  input: AddGroupParticipantsInput,
): Promise<GroupParticipantItem[]> {
  const conversation = await getConversationOrThrow(
    organizationId,
    conversationId,
  );

  if (conversation.type !== "group") {
    throw problem({
      type: "validation-error",
      title: "Not a group conversation",
      status: 422,
      detail: "Participants can only be added to group conversations.",
    });
  }

  const currentCount = await getParticipantCount(conversationId);
  const clientRows = await resolveClientsForGroup(
    organizationId,
    input.clientIds,
  );

  const newClients = [];
  for (const client of clientRows) {
    const alreadyMember = client.clerkUserId
      ? await isConversationParticipant(
          organizationId,
          conversationId,
          client.clerkUserId,
        )
      : false;
    if (!alreadyMember) {
      newClients.push(client);
    }
  }

  if (currentCount + newClients.length > conversation.maxParticipants) {
    throw problem({
      type: "validation-error",
      title: "Group is full",
      status: 422,
      detail: `This group can have at most ${conversation.maxParticipants} participants.`,
    });
  }

  for (const client of newClients) {
    if (client.clerkUserId) {
      await ensureParticipant(
        organizationId,
        conversationId,
        client.clerkUserId,
        "client",
      );
    }
  }

  return getGroupParticipants(organizationId, conversationId);
}

export async function removeGroupParticipant(
  organizationId: string,
  conversationId: string,
  clientId: string,
): Promise<GroupParticipantItem[]> {
  const conversation = await getConversationOrThrow(
    organizationId,
    conversationId,
  );

  if (conversation.type !== "group") {
    throw problem({
      type: "validation-error",
      title: "Not a group conversation",
      status: 422,
      detail: "Participants can only be removed from group conversations.",
    });
  }

  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: { clerkUserId: true },
  });

  if (!client?.clerkUserId) {
    throw problem({
      type: "not-found",
      title: "Participant not found",
      status: 404,
      detail: "This client is not a member of the group.",
    });
  }

  await getDb()
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.organizationId, organizationId),
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.clerkUserId, client.clerkUserId),
        eq(conversationParticipants.role, "client"),
      ),
    );

  return getGroupParticipants(organizationId, conversationId);
}

export async function getGroupParticipants(
  organizationId: string,
  conversationId: string,
): Promise<GroupParticipantItem[]> {
  const conversation = await getConversationOrThrow(
    organizationId,
    conversationId,
  );

  if (conversation.type !== "group") {
    throw problem({
      type: "validation-error",
      title: "Not a group conversation",
      status: 422,
      detail: "This conversation is not a group.",
    });
  }

  const participants = await getDb().query.conversationParticipants.findMany({
    where: and(
      eq(conversationParticipants.organizationId, organizationId),
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.role, "client"),
    ),
    columns: {
      clerkUserId: true,
      joinedAt: true,
    },
  });

  if (participants.length === 0) {
    return [];
  }

  const clerkUserIds = participants.map((p) => p.clerkUserId);
  const clientRows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.clerkUserId, clerkUserIds),
    ),
    columns: {
      id: true,
      clerkUserId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const clientByClerk = new Map(
    clientRows
      .filter((row) => row.clerkUserId)
      .map((row) => [row.clerkUserId!, row]),
  );

  return participants
    .map((participant) => {
      const client = clientByClerk.get(participant.clerkUserId);
      if (!client) {
        return null;
      }
      return {
        clientId: client.id,
        clerkUserId: participant.clerkUserId,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        joinedAt: participant.joinedAt.toISOString(),
      };
    })
    .filter((item): item is GroupParticipantItem => item !== null);
}

export async function listConversationsForCoach(
  organizationId: string,
  coachClerkUserId: string,
  options: { page: number; limit: number; offset: number },
): Promise<{ items: ConversationListItem[]; total: number }> {
  const where = eq(conversations.organizationId, organizationId);

  const [totalRow] = await getDb()
    .select({ value: count() })
    .from(conversations)
    .where(where);

  const rows = await getDb().query.conversations.findMany({
    where,
    with: {
      client: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          clerkUserId: true,
        },
      },
    },
    orderBy: [desc(conversations.lastMessageAt), desc(conversations.createdAt)],
    limit: options.limit,
    offset: options.offset,
  });

  const items = await Promise.all(
    rows.map((row) => mapConversationListItem(row, coachClerkUserId)),
  );

  return { items: sortConversationItems(items), total: totalRow?.value ?? 0 };
}

export async function listConversationsForClient(
  organizationId: string,
  clientId: string,
  clientClerkUserId: string,
): Promise<ConversationListItem[]> {
  const direct = await getClientConversation(
    organizationId,
    clientId,
    clientClerkUserId,
  );

  const groupParticipantRows =
    await getDb().query.conversationParticipants.findMany({
      where: and(
        eq(conversationParticipants.organizationId, organizationId),
        eq(conversationParticipants.clerkUserId, clientClerkUserId),
        eq(conversationParticipants.role, "client"),
      ),
      columns: { conversationId: true },
    });

  const groupConversationIds = groupParticipantRows.map(
    (row) => row.conversationId,
  );

  const groupRows =
    groupConversationIds.length > 0
      ? await getDb().query.conversations.findMany({
          where: and(
            eq(conversations.organizationId, organizationId),
            eq(conversations.type, "group"),
            inArray(conversations.id, groupConversationIds),
          ),
          with: {
            client: {
              columns: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                clerkUserId: true,
              },
            },
          },
        })
      : [];

  const groupItems = await Promise.all(
    groupRows.map((row) => mapConversationListItem(row, clientClerkUserId)),
  );

  const items = [...(direct ? [direct] : []), ...groupItems];
  return sortConversationItems(items);
}

export async function getClientConversation(
  organizationId: string,
  clientId: string,
  clientClerkUserId: string,
): Promise<ConversationListItem | null> {
  const existing = await getDb().query.conversations.findFirst({
    where: and(
      eq(conversations.organizationId, organizationId),
      eq(conversations.clientId, clientId),
      eq(conversations.type, "direct"),
    ),
    with: {
      client: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          clerkUserId: true,
        },
      },
    },
  });

  if (existing) {
    await ensureParticipant(
      organizationId,
      existing.id,
      clientClerkUserId,
      "client",
    );
    return mapConversationListItem(existing, clientClerkUserId);
  }

  const coachClerkUserId = await resolveDefaultCoachClerkUserId(
    organizationId,
    clientClerkUserId,
  );

  return findOrCreateDirectConversation(
    organizationId,
    clientId,
    coachClerkUserId,
  );
}

export async function listMessages(
  organizationId: string,
  conversationId: string,
  actor: MessagingActor,
  options: { page: number; limit: number; offset: number },
): Promise<{ items: MessageItem[]; total: number }> {
  const conversation = await assertConversationAccess(
    organizationId,
    conversationId,
    actor,
  );

  if (actor.role === "coach") {
    await ensureParticipant(
      organizationId,
      conversationId,
      actor.clerkUserId,
      "coach",
    );
  }

  const where = and(
    eq(messages.organizationId, organizationId),
    eq(messages.conversationId, conversationId),
    isNull(messages.deletedAt),
  );

  const [totalRow] = await getDb()
    .select({ value: count() })
    .from(messages)
    .where(where);

  const rows = await getDb().query.messages.findMany({
    where,
    orderBy: [desc(messages.createdAt)],
    limit: options.limit,
    offset: options.offset,
  });

  const isGroup = conversation.type === "group";
  const senderNameMap = isGroup
    ? await buildSenderDisplayNameMap(
        organizationId,
        conversationId,
        rows.map((row) => row.senderClerkUserId),
      )
    : new Map<string, string>();

  return {
    items: rows
      .map((row) =>
        mapMessageRow(
          row,
          actor.clerkUserId,
          isGroup
            ? senderNameMap.get(row.senderClerkUserId)
            : undefined,
        ),
      )
      .reverse(),
    total: totalRow?.value ?? 0,
  };
}

export async function sendMessage(
  organizationId: string,
  conversationId: string,
  actor: MessagingActor,
  input: SendMessageInput,
): Promise<MessageItem> {
  const conversation = await assertConversationAccess(
    organizationId,
    conversationId,
    actor,
  );

  if (actor.role === "coach") {
    await ensureParticipant(
      organizationId,
      conversationId,
      actor.clerkUserId,
      "coach",
    );
  } else {
    await ensureParticipant(
      organizationId,
      conversationId,
      actor.clerkUserId,
      "client",
    );
  }

  const now = new Date();
  const preview = buildPreview(input.type, input.content ?? null);

  const [message] = await getDb()
    .insert(messages)
    .values({
      organizationId,
      conversationId,
      senderClerkUserId: actor.clerkUserId,
      type: input.type,
      content: input.content ?? null,
      mediaPathname: input.mediaPathname ?? null,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      durationSeconds: input.durationSeconds ?? null,
    })
    .returning();

  await getDb()
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessagePreview: preview,
    })
    .where(eq(conversations.id, conversationId));

  const isGroup = conversation.type === "group";
  const senderNameMap = isGroup
    ? await buildSenderDisplayNameMap(organizationId, conversationId, [
        actor.clerkUserId,
      ])
    : new Map<string, string>();

  const item = mapMessageRow(
    message,
    actor.clerkUserId,
    isGroup ? senderNameMap.get(actor.clerkUserId) : undefined,
  );

  const { publishMessageNew } = await import("@/lib/messaging/realtime");
  await publishMessageNew(organizationId, conversationId, item);

  emitHeliosEvent("message.new", {
    organizationId,
    conversationId,
    conversationType: conversation.type,
    clientId: conversation.clientId ?? undefined,
    senderClerkUserId: actor.clerkUserId,
    messageId: message.id,
  });

  return item;
}

export async function markConversationRead(
  organizationId: string,
  conversationId: string,
  actor: MessagingActor,
  messageId?: string,
): Promise<{ lastReadAt: string }> {
  await assertConversationAccess(organizationId, conversationId, actor);

  const role = actor.role === "coach" ? "coach" : "client";
  await ensureParticipant(
    organizationId,
    conversationId,
    actor.clerkUserId,
    role,
  );

  let readUntil = new Date();

  if (messageId) {
    const target = await getDb().query.messages.findFirst({
      where: and(
        eq(messages.organizationId, organizationId),
        eq(messages.conversationId, conversationId),
        eq(messages.id, messageId),
        isNull(messages.deletedAt),
      ),
      columns: { createdAt: true },
    });

    if (!target) {
      throw problem({
        type: "not-found",
        title: "Message not found",
        status: 404,
        detail: "The message does not exist in this conversation.",
      });
    }

    readUntil = target.createdAt;
  }

  await getDb()
    .update(conversationParticipants)
    .set({ lastReadAt: readUntil })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.clerkUserId, actor.clerkUserId),
      ),
    );

  const { publishMessageRead } = await import("@/lib/messaging/realtime");
  await publishMessageRead(organizationId, conversationId, {
    clerkUserId: actor.clerkUserId,
    lastReadAt: readUntil.toISOString(),
  });

  return { lastReadAt: readUntil.toISOString() };
}

export async function getMessageForMedia(
  organizationId: string,
  conversationId: string,
  messageId: string,
  actor: MessagingActor,
) {
  await assertConversationAccess(organizationId, conversationId, actor);

  const message = await getDb().query.messages.findFirst({
    where: and(
      eq(messages.organizationId, organizationId),
      eq(messages.conversationId, conversationId),
      eq(messages.id, messageId),
      isNull(messages.deletedAt),
    ),
  });

  if (!message?.mediaPathname) {
    throw problem({
      type: "not-found",
      title: "Media not found",
      status: 404,
      detail: "This message has no media attachment.",
    });
  }

  return message;
}

export async function listAccessibleConversationIds(
  organizationId: string,
  actor: MessagingActor,
): Promise<string[]> {
  if (actor.role === "client") {
    const ids: string[] = [];

    const direct = await getDb().query.conversations.findFirst({
      where: and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.clientId, actor.clientId),
        eq(conversations.type, "direct"),
      ),
      columns: { id: true },
    });

    if (direct) {
      ids.push(direct.id);
    }

    const groupParticipants = await getDb().query.conversationParticipants.findMany({
      where: and(
        eq(conversationParticipants.organizationId, organizationId),
        eq(conversationParticipants.clerkUserId, actor.clerkUserId),
      ),
      columns: { conversationId: true },
    });

    for (const participant of groupParticipants) {
      if (!ids.includes(participant.conversationId)) {
        ids.push(participant.conversationId);
      }
    }

    return ids;
  }

  const rows = await getDb().query.conversations.findMany({
    where: eq(conversations.organizationId, organizationId),
    columns: { id: true },
  });

  return rows.map((row) => row.id);
}
