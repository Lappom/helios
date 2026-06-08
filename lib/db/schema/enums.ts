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

export const habitFrequencyEnum = pgEnum("habit_frequency", [
  "daily",
  "weekly",
]);

export const habitAssignmentStatusEnum = pgEnum("habit_assignment_status", [
  "active",
  "paused",
  "completed",
]);

export const coachServiceTypeEnum = pgEnum("coach_service_type", [
  "assessment",
  "coaching",
  "call",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const bookingPaymentStatusEnum = pgEnum("booking_payment_status", [
  "unpaid",
  "paid",
  "external",
]);

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", [
  "percent",
  "fixed",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "subscription",
  "one_time",
  "external",
]);

export const paymentSourceEnum = pgEnum("payment_source", [
  "manual",
  "booking",
  "import",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "refunded",
  "failed",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
  "push",
]);

export const notificationTriggerEnum = pgEnum("notification_trigger", [
  "manual",
  "scheduled",
  "event",
]);

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "session_due",
  "assessment_due",
  "habit_reminder",
  "booking_reminder",
  "payment_received",
  "message_new",
  "program_published",
]);

export const notificationLogStatusEnum = pgEnum("notification_log_status", [
  "queued",
  "sent",
  "failed",
  "opened",
  "clicked",
]);

export const conversationTypeEnum = pgEnum("conversation_type", [
  "direct",
  "group",
]);

export const conversationParticipantRoleEnum = pgEnum(
  "conversation_participant_role",
  ["coach", "client"],
);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "video",
  "audio",
  "file",
]);
