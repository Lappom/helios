import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import {
  questionnaireQuestionTypeEnum,
  questionnaireScheduleTriggerEnum,
  questionnaireSubmissionStatusEnum,
  questionnaireTypeEnum,
} from "./enums";
import { organizations } from "./organization";

export const questionnaires = pgTable(
  "questionnaires",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    name: text("name").notNull(),
    type: questionnaireTypeEnum("type").notNull().default("custom"),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("questionnaires_org_idx").on(t.organizationId),
    index("questionnaires_org_type_idx").on(t.organizationId, t.type),
    index("questionnaires_org_active_idx").on(t.organizationId, t.isActive),
  ],
);

export const questionnaireQuestions = pgTable(
  "questionnaire_questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    questionnaireId: text("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    type: questionnaireQuestionTypeEnum("type").notNull(),
    label: text("label").notNull(),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<string[] | null>(),
    config: jsonb("config").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("questionnaire_questions_questionnaire_sort_idx").on(
      t.questionnaireId,
      t.sortOrder,
    ),
    uniqueIndex("questionnaire_questions_questionnaire_sort_unique_idx").on(
      t.questionnaireId,
      t.sortOrder,
    ),
  ],
);

export const questionnaireSchedules = pgTable(
  "questionnaire_schedules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    questionnaireId: text("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, { onDelete: "cascade" }),
    triggerType: questionnaireScheduleTriggerEnum("trigger_type").notNull(),
    sendDayOfWeek: integer("send_day_of_week"),
    sendHourUtc: integer("send_hour_utc"),
    reminderDayOfWeek: integer("reminder_day_of_week"),
    reminderHourUtc: integer("reminder_hour_utc"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("questionnaire_schedules_questionnaire_unique_idx").on(
      t.questionnaireId,
    ),
    index("questionnaire_schedules_org_active_idx").on(
      t.organizationId,
      t.isActive,
    ),
  ],
);

export const questionnaireSubmissions = pgTable(
  "questionnaire_submissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    questionnaireId: text("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, { onDelete: "cascade" }),
    scheduleId: text("schedule_id").references(() => questionnaireSchedules.id, {
      onDelete: "set null",
    }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: questionnaireSubmissionStatusEnum("status")
      .notNull()
      .default("pending"),
    periodKey: text("period_key").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("questionnaire_submissions_unique_period_idx").on(
      t.questionnaireId,
      t.clientId,
      t.periodKey,
    ),
    index("questionnaire_submissions_org_status_idx").on(
      t.organizationId,
      t.status,
    ),
    index("questionnaire_submissions_client_status_idx").on(
      t.clientId,
      t.status,
    ),
    index("questionnaire_submissions_questionnaire_idx").on(t.questionnaireId),
  ],
);

export const questionnaireResponses = pgTable(
  "questionnaire_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => questionnaireSubmissions.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
    textValue: text("text_value"),
    numberValue: real("number_value"),
    booleanValue: boolean("boolean_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("questionnaire_responses_submission_question_unique_idx").on(
      t.submissionId,
      t.questionId,
    ),
    index("questionnaire_responses_submission_idx").on(t.submissionId),
  ],
);
