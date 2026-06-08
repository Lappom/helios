import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import {
  automationActionLogStatusEnum,
  automationActionTypeEnum,
  automationExecutionStatusEnum,
  automationTriggerTypeEnum,
} from "./enums";
import { organizations } from "./organization";

export const automations = pgTable(
  "automations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: automationTriggerTypeEnum("trigger_type").notNull(),
    triggerConfig: jsonb("trigger_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    isActive: boolean("is_active").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
    createdByClerkUserId: text("created_by_clerk_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("automations_org_idx").on(t.organizationId),
    index("automations_org_active_trigger_idx").on(
      t.organizationId,
      t.isActive,
      t.triggerType,
    ),
  ],
);

export const automationActions = pgTable(
  "automation_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    automationId: text("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    actionType: automationActionTypeEnum("action_type").notNull(),
    actionConfig: jsonb("action_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("automation_actions_org_automation_idx").on(
      t.organizationId,
      t.automationId,
    ),
    index("automation_actions_automation_sort_idx").on(
      t.automationId,
      t.sortOrder,
    ),
  ],
);

export const automationExecutions = pgTable(
  "automation_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    automationId: text("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    triggerEventId: text("trigger_event_id").notNull(),
    triggerType: automationTriggerTypeEnum("trigger_type").notNull(),
    status: automationExecutionStatusEnum("status")
      .notNull()
      .default("pending"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("automation_executions_idempotency_idx").on(
      t.automationId,
      t.clientId,
      t.triggerEventId,
    ),
    index("automation_executions_org_automation_idx").on(
      t.organizationId,
      t.automationId,
      t.createdAt,
    ),
    index("automation_executions_org_status_idx").on(
      t.organizationId,
      t.status,
    ),
  ],
);

export const actionLogs = pgTable(
  "action_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    executionId: text("execution_id")
      .notNull()
      .references(() => automationExecutions.id, { onDelete: "cascade" }),
    actionId: text("action_id")
      .notNull()
      .references(() => automationActions.id, { onDelete: "cascade" }),
    status: automationActionLogStatusEnum("status")
      .notNull()
      .default("pending"),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("action_logs_execution_action_idx").on(
      t.executionId,
      t.actionId,
    ),
    index("action_logs_org_execution_idx").on(t.organizationId, t.executionId),
  ],
);
