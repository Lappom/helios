import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";
import { automations } from "./automations";
import { clients } from "./clients";
import { coachTaskStatusEnum } from "./enums";
import { organizations } from "./organization";

export const coachTasks = pgTable(
  "coach_tasks",
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
    title: text("title").notNull(),
    description: text("description"),
    dueDate: date("due_date"),
    status: coachTaskStatusEnum("status").notNull().default("open"),
    sourceAutomationId: text("source_automation_id").references(
      () => automations.id,
      { onDelete: "set null" },
    ),
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
    index("coach_tasks_org_client_status_idx").on(
      t.organizationId,
      t.clientId,
      t.status,
    ),
    index("coach_tasks_org_due_date_idx").on(t.organizationId, t.dueDate),
  ],
);
