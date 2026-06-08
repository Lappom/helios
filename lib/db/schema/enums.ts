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

export const programAssignmentStatusEnum = pgEnum("program_assignment_status", [
  "active",
  "completed",
  "paused",
  "cancelled",
]);

export const sessionLogStatusEnum = pgEnum("session_log_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

export const foodSourceEnum = pgEnum("food_source", ["off", "usda", "custom"]);

export const mealItemTypeEnum = pgEnum("meal_item_type", ["food", "recipe"]);

export const assessmentFieldTypeEnum = pgEnum("assessment_field_type", [
  "text",
  "number",
  "select",
  "photo",
  "measurement",
]);

export const assessmentFrequencyEnum = pgEnum("assessment_frequency", [
  "once",
  "weekly",
  "monthly",
  "custom",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "pending",
  "submitted",
  "reviewed",
]);

export const assessmentSourceEnum = pgEnum("assessment_source", [
  "manual",
  "cron",
]);

export const feedbackQuestionTypeEnum = pgEnum("feedback_question_type", [
  "scale",
  "text",
  "boolean",
]);
