import {
  boolean,
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
  promoDiscountTypeEnum,
  referralConversionStatusEnum,
  referralCreditEntryTypeEnum,
} from "./enums";
import { organizations } from "./organization";
import { payments } from "./payments";

export const referralPrograms = pgTable(
  "referral_programs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    refereeDiscountType: promoDiscountTypeEnum("referee_discount_type")
      .notNull()
      .default("percent"),
    refereeDiscountValue: integer("referee_discount_value").notNull().default(10),
    commissionType: promoDiscountTypeEnum("commission_type")
      .notNull()
      .default("percent"),
    commissionValue: integer("commission_value").notNull().default(5),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("referral_programs_org_coach_idx").on(
      t.organizationId,
      t.coachClerkUserId,
    ),
    index("referral_programs_org_idx").on(t.organizationId),
  ],
);

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => referralPrograms.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    conversionCount: integer("conversion_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("referral_codes_org_code_idx").on(t.organizationId, t.code),
    uniqueIndex("referral_codes_client_idx").on(t.clientId),
    index("referral_codes_program_idx").on(t.programId),
    index("referral_codes_org_idx").on(t.organizationId),
  ],
);

export const referralConversions = pgTable(
  "referral_conversions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    referralCodeId: text("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    referrerClientId: text("referrer_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    referredClientId: text("referred_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").notNull(),
    status: referralConversionStatusEnum("status").notNull().default("pending"),
    refereeDiscountCents: integer("referee_discount_cents").notNull().default(0),
    commissionCents: integer("commission_cents").notNull().default(0),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("referral_conversions_booking_idx").on(t.bookingId),
    index("referral_conversions_org_status_idx").on(t.organizationId, t.status),
    index("referral_conversions_referrer_idx").on(t.referrerClientId),
    index("referral_conversions_code_idx").on(t.referralCodeId),
  ],
);

export const referralCreditBalances = pgTable(
  "referral_credit_balances",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    balanceCents: integer("balance_cents").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("referral_credit_balances_client_idx").on(
      t.organizationId,
      t.clientId,
    ),
  ],
);

export const referralCreditLedger = pgTable(
  "referral_credit_ledger",
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
    amountCents: integer("amount_cents").notNull(),
    entryType: referralCreditEntryTypeEnum("entry_type").notNull(),
    conversionId: text("conversion_id").references(
      () => referralConversions.id,
      { onDelete: "set null" },
    ),
    bookingId: text("booking_id"),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("referral_credit_ledger_client_idx").on(t.organizationId, t.clientId),
    index("referral_credit_ledger_conversion_idx").on(t.conversionId),
  ],
);

export type ReferralProgramRow = typeof referralPrograms.$inferSelect;
export type ReferralCodeRow = typeof referralCodes.$inferSelect;
export type ReferralConversionRow = typeof referralConversions.$inferSelect;
export type ReferralCreditBalanceRow = typeof referralCreditBalances.$inferSelect;
export type ReferralCreditLedgerRow = typeof referralCreditLedger.$inferSelect;
