import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { coachServices } from "./coach-profiles";
import { clients } from "./clients";
import { promoCodes } from "./promo-codes";
import { referralCodes } from "./referrals";
import {
  bookingPaymentStatusEnum,
  bookingStatusEnum,
  coachServiceTypeEnum,
} from "./enums";
import { organizations } from "./organization";

export type BookingRemindersSent = {
  d1: boolean;
  h1: boolean;
};

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull(),
    serviceTypes: jsonb("service_types")
      .$type<Array<"assessment" | "coaching" | "call">>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("availability_rules_org_coach_idx").on(
      t.organizationId,
      t.coachClerkUserId,
    ),
    index("availability_rules_day_idx").on(t.dayOfWeek),
  ],
);

export const blockedDates = pgTable(
  "blocked_dates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    date: date("date").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("blocked_dates_org_coach_idx").on(
      t.organizationId,
      t.coachClerkUserId,
    ),
    uniqueIndex("blocked_dates_coach_date_unique_idx").on(
      t.organizationId,
      t.coachClerkUserId,
      t.date,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    serviceId: text("service_id")
      .notNull()
      .references(() => coachServices.id, { onDelete: "restrict" }),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    prospectEmail: text("prospect_email"),
    prospectName: text("prospect_name"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("Europe/Paris"),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    paymentStatus: bookingPaymentStatusEnum("payment_status")
      .notNull()
      .default("unpaid"),
    promoCodeId: text("promo_code_id").references(() => promoCodes.id, {
      onDelete: "set null",
    }),
    referralCodeId: text("referral_code_id").references(() => referralCodes.id, {
      onDelete: "set null",
    }),
    discountCents: integer("discount_cents"),
    referralCreditAppliedCents: integer("referral_credit_applied_cents")
      .notNull()
      .default(0),
    finalPriceCents: integer("final_price_cents"),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    remindersSent: jsonb("reminders_sent")
      .$type<BookingRemindersSent>()
      .notNull()
      .default({ d1: false, h1: false }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("bookings_org_coach_idx").on(t.organizationId, t.coachClerkUserId),
    index("bookings_org_start_idx").on(t.organizationId, t.startAt),
    index("bookings_client_idx").on(t.clientId),
    index("bookings_service_idx").on(t.serviceId),
    uniqueIndex("bookings_coach_start_active_unique_idx")
      .on(t.organizationId, t.coachClerkUserId, t.startAt)
      .where(sql`${t.status} != 'cancelled'`),
  ],
);

export type AvailabilityRuleRow = typeof availabilityRules.$inferSelect;
export type BlockedDateRow = typeof blockedDates.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;

export type CoachServiceType = (typeof coachServiceTypeEnum.enumValues)[number];
