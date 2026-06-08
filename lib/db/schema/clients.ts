import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clientStatusEnum } from "./enums";
import { organizations } from "./organization";

export const clients = pgTable(
  "clients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id"),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    status: clientStatusEnum("status").notNull().default("PROSPECT"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("clients_org_email_idx").on(t.organizationId, t.email),
    index("clients_org_status_idx").on(t.organizationId, t.status),
    index("clients_org_clerk_user_idx").on(t.organizationId, t.clerkUserId),
    index("clients_org_updated_idx").on(t.organizationId, t.updatedAt),
  ],
);

export const clientNotes = pgTable(
  "client_notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    authorClerkUserId: text("author_clerk_user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("client_notes_org_client_created_idx").on(
      t.organizationId,
      t.clientId,
      t.createdAt,
    ),
  ],
);

export const clientTags = pgTable(
  "client_tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("client_tags_org_name_idx").on(t.organizationId, t.name),
  ],
);

export const clientTagAssignments = pgTable(
  "client_tag_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => clientTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("client_tag_assignments_client_tag_idx").on(
      t.clientId,
      t.tagId,
    ),
    index("client_tag_assignments_org_client_idx").on(
      t.organizationId,
      t.clientId,
    ),
  ],
);

export const clientStatusEvents = pgTable(
  "client_status_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    fromStatus: clientStatusEnum("from_status").notNull(),
    toStatus: clientStatusEnum("to_status").notNull(),
    changedByClerkUserId: text("changed_by_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("client_status_events_org_client_created_idx").on(
      t.organizationId,
      t.clientId,
      t.createdAt,
    ),
  ],
);
