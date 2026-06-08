import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";
import { auditActorTypeEnum } from "./enums";
import { organizations } from "./organization";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorClerkUserId: text("actor_clerk_user_id"),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_org_action_idx").on(t.organizationId, t.action),
  ],
);
