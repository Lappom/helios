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
import { feedbackQuestionTypeEnum } from "./enums";
import { organizations } from "./organization";
import { sessionLogs } from "./session-logs";

export const sessionFeedbackTemplates = pgTable(
  "session_feedback_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    name: text("name").notNull(),
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
    index("session_feedback_templates_org_idx").on(t.organizationId),
    index("session_feedback_templates_org_default_idx").on(
      t.organizationId,
      t.isDefault,
    ),
  ],
);

export const feedbackQuestions = pgTable(
  "feedback_questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => sessionFeedbackTemplates.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    type: feedbackQuestionTypeEnum("type").notNull(),
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
    index("feedback_questions_template_sort_idx").on(t.templateId, t.sortOrder),
    uniqueIndex("feedback_questions_template_sort_unique_idx").on(
      t.templateId,
      t.sortOrder,
    ),
  ],
);

export const sessionFeedback = pgTable(
  "session_feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sessionLogId: text("session_log_id")
      .notNull()
      .references(() => sessionLogs.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => sessionFeedbackTemplates.id, {
      onDelete: "set null",
    }),
    feeling: real("feeling").notNull(),
    difficulty: real("difficulty").notNull(),
    fatigue: real("fatigue").notNull(),
    motivation: real("motivation").notNull(),
    painReported: boolean("pain_reported").notNull().default(false),
    painDetails: text("pain_details"),
    comment: text("comment"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("session_feedback_session_log_unique_idx").on(t.sessionLogId),
    index("session_feedback_org_client_submitted_idx").on(
      t.organizationId,
      t.clientId,
      t.submittedAt,
    ),
    index("session_feedback_org_pain_submitted_idx").on(
      t.organizationId,
      t.painReported,
      t.submittedAt,
    ),
  ],
);

export const feedbackResponses = pgTable(
  "feedback_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sessionFeedbackId: text("session_feedback_id")
      .notNull()
      .references(() => sessionFeedback.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => feedbackQuestions.id, { onDelete: "cascade" }),
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
    uniqueIndex("feedback_responses_feedback_question_unique_idx").on(
      t.sessionFeedbackId,
      t.questionId,
    ),
    index("feedback_responses_feedback_idx").on(t.sessionFeedbackId),
  ],
);
