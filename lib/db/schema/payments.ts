import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { bookings } from "./bookings";
import { coachServices } from "./coach-profiles";
import { clients } from "./clients";
import {
  paymentSourceEnum,
  paymentStatusEnum,
  paymentTypeEnum,
} from "./enums";
import { organizations } from "./organization";

export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id").references(() => coachServices.id, {
      onDelete: "set null",
    }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    type: paymentTypeEnum("type").notNull(),
    source: paymentSourceEnum("source").notNull(),
    externalReference: text("external_reference"),
    description: text("description"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    status: paymentStatusEnum("status").notNull().default("completed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_org_paid_at_idx").on(t.organizationId, t.paidAt),
    index("payments_org_client_idx").on(t.organizationId, t.clientId),
    index("payments_org_type_idx").on(t.organizationId, t.type),
    uniqueIndex("payments_booking_unique_idx").on(t.bookingId),
  ],
);

export const revenueSnapshots = pgTable(
  "revenue_snapshots",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
    mrrCents: integer("mrr_cents").notNull().default(0),
    oneTimeRevenueCents: integer("one_time_revenue_cents")
      .notNull()
      .default(0),
    clientCount: integer("client_count").notNull().default(0),
    newClients: integer("new_clients").notNull().default(0),
    churnedClients: integer("churned_clients").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.month] }),
    index("revenue_snapshots_org_month_idx").on(t.organizationId, t.month),
  ],
);

export type PaymentRow = typeof payments.$inferSelect;
export type RevenueSnapshotRow = typeof revenueSnapshots.$inferSelect;
