import { pgEnum } from "drizzle-orm/pg-core";

export const planTierEnum = pgEnum("plan_tier", [
  "STARTER",
  "PRO",
  "BUSINESS",
  "TEAM",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "PROSPECT",
  "TRIAL",
  "ACTIVE",
  "PAUSED",
  "CHURNED",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "owner",
  "admin",
  "coach",
  "assistant",
]);

export const exerciseTypeEnum = pgEnum("exercise_type", [
  "strength",
  "cardio",
  "mobility",
  "plyometric",
]);

export const exerciseSourceEnum = pgEnum("exercise_source", [
  "system",
  "custom",
]);

export const programStatusEnum = pgEnum("program_status", [
  "draft",
  "published",
  "archived",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "single",
  "superset",
  "triset",
  "circuit",
  "amrap",
]);
