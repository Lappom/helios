import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import {
  conversationParticipantRoleEnum,
  conversationTypeEnum,
  messageTypeEnum,
} from "./enums";
import { organizations } from "./organization";

export const conversations = pgTable(
  "conversations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: conversationTypeEnum("type").notNull().default("direct"),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    name: text("name"),
    coachClerkUserId: text("coach_clerk_user_id"),
    maxParticipants: integer("max_participants").notNull().default(50),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("conversations_org_client_direct_idx")
      .on(t.organizationId, t.clientId)
      .where(sql`${t.type} = 'direct'`),
    index("conversations_org_last_message_idx").on(
      t.organizationId,
      t.lastMessageAt,
    ),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    role: conversationParticipantRoleEnum("role").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("conversation_participants_conv_clerk_idx").on(
      t.conversationId,
      t.clerkUserId,
    ),
    index("conversation_participants_org_clerk_idx").on(
      t.organizationId,
      t.clerkUserId,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderClerkUserId: text("sender_clerk_user_id").notNull(),
    type: messageTypeEnum("type").notNull().default("text"),
    content: text("content"),
    mediaPathname: text("media_pathname"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("messages_conversation_created_idx").on(
      t.conversationId,
      t.createdAt,
    ),
    index("messages_org_conversation_idx").on(
      t.organizationId,
      t.conversationId,
    ),
  ],
);
