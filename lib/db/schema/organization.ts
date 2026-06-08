import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import {
  planTierEnum,
  subscriptionStatusEnum,
  teamMemberRoleEnum,
} from "./enums";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    clerkOrgId: text("clerk_org_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    planTier: planTierEnum("plan_tier").notNull().default("STARTER"),
    clerkPlanSlug: text("clerk_plan_slug"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("organizations_slug_idx").on(t.slug)],
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clerkSubscriptionId: text("clerk_subscription_id").unique(),
  status: subscriptionStatusEnum("status").notNull().default("TRIALING"),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  activeClientCount: integer("active_client_count").notNull().default(0),
  aiCreditsUsed: integer("ai_credits_used").notNull().default(0),
  apiCreditsUsed: integer("api_credits_used").notNull().default(0),
  notificationsSent: integer("notifications_sent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    role: teamMemberRoleEnum("role").notNull().default("coach"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    invitedBy: text("invited_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("team_members_org_user_idx").on(
      t.organizationId,
      t.clerkUserId,
    ),
    index("team_members_org_role_idx").on(t.organizationId, t.role),
  ],
);
