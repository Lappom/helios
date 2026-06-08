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
import { db } from "@/lib/db";
import {
  clients,
  conversationParticipants,
  conversations,
  messages,
  teamMembers,
} from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit";
import type {
  ConversationListItem,
  MessageItem,
  MessagingActor,
} from "@/lib/messaging/types";
import type { SendMessageInput } from "@/lib/validators/messaging";

const PREVIEW_BY_TYPE: Record<string, string> = {
  text: "",
  image: "Photo",
  video: "Video",
  audio: "Voice message",
  file: "File",
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
): MessageItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderClerkUserId: row.senderClerkUserId,
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
) {
  const conversation = await db.query.conversations.findFirst({
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

export async function assertConversationAccess(
  organizationId: string,
  conversationId: string,
  actor: MessagingActor,
): Promise<typeof conversations.$inferSelect & { client: NonNullable<Awaited<ReturnType<typeof getConversationOrThrow>>["client"]> }> {
  const conversation = await getConversationOrThrow(
    organizationId,
    conversationId,
  );

  if (actor.role === "client") {
    if (conversation.clientId !== actor.clientId) {
      throw problem({
        type: "forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You cannot access this conversation.",
      });
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
  const existing = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.clerkUserId, clerkUserId),
    ),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  await db.insert(conversationParticipants).values({
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

  const [result] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(...conditions));

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

  const participant = await db.query.conversationParticipants.findFirst({
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
  const participants = await db.query.conversationParticipants.findMany({
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
  row: typeof conversations.$inferSelect & {
    client: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      clerkUserId: string | null;
    };
  },
  coachClerkUserId: string,
): Promise<ConversationListItem> {
  const participant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, row.id),
      eq(conversationParticipants.clerkUserId, coachClerkUserId),
    ),
    columns: { lastReadAt: true },
  });

  const unreadCount = await getUnreadCount(
    row.organizationId,
    row.id,
    coachClerkUserId,
    participant?.lastReadAt ?? null,
  );

  const clientLastReadAt = await getClientParticipantLastRead(
    row.organizationId,
    row.id,
    row.client.clerkUserId,
  );

  const coachLastReadAt = await getCoachParticipantsLastRead(
    row.organizationId,
    row.id,
  );

  return {
    id: row.id,
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

async function resolveDefaultCoachClerkUserId(
  organizationId: string,
  fallbackClerkUserId: string,
): Promise<string> {
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.organizationId, organizationId),
      inArray(teamMembers.role, ["owner", "admin", "coach"]),
    ),
    columns: { clerkUserId: true },
  });

  return member?.clerkUserId ?? fallbackClerkUserId;
}

export async function findOrCreateDirectConversation(
  organizationId: string,
  clientId: string,
  coachClerkUserId: string,
): Promise<ConversationListItem> {
  const client = await db.query.clients.findFirst({
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

  const existing = await db.query.conversations.findFirst({
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

  const [created] = await db
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

  return mapConversationListItem(
    { ...created, client },
    coachClerkUserId,
  );
}

export async function listConversationsForCoach(
  organizationId: string,
  coachClerkUserId: string,
  options: { page: number; limit: number; offset: number },
): Promise<{ items: ConversationListItem[]; total: number }> {
  const where = and(
    eq(conversations.organizationId, organizationId),
    eq(conversations.type, "direct"),
  );

  const [totalRow] = await db
    .select({ value: count() })
    .from(conversations)
    .where(where);

  const rows = await db.query.conversations.findMany({
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

  items.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });

  return { items, total: totalRow?.value ?? 0 };
}

export async function getClientConversation(
  organizationId: string,
  clientId: string,
  clientClerkUserId: string,
): Promise<ConversationListItem | null> {
  const existing = await db.query.conversations.findFirst({
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
  await assertConversationAccess(organizationId, conversationId, actor);

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

  const [totalRow] = await db
    .select({ value: count() })
    .from(messages)
    .where(where);

  const rows = await db.query.messages.findMany({
    where,
    orderBy: [desc(messages.createdAt)],
    limit: options.limit,
    offset: options.offset,
  });

  return {
    items: rows
      .map((row) => mapMessageRow(row, actor.clerkUserId))
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

  const [message] = await db
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

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessagePreview: preview,
    })
    .where(eq(conversations.id, conversationId));

  const item = mapMessageRow(message, actor.clerkUserId);

  const { publishMessageNew } = await import("@/lib/messaging/realtime");
  await publishMessageNew(organizationId, conversationId, item);

  emitHeliosEvent("message.new", {
    organizationId,
    conversationId,
    clientId: conversation.clientId,
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
    const target = await db.query.messages.findFirst({
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

  await db
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

  const message = await db.query.messages.findFirst({
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
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.clientId, actor.clientId),
      ),
      columns: { id: true },
    });
    return conversation ? [conversation.id] : [];
  }

  const rows = await db.query.conversations.findMany({
    where: eq(conversations.organizationId, organizationId),
    columns: { id: true },
  });

  return rows.map((row) => row.id);
}
