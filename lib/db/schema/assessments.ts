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
  assessmentFieldTypeEnum,
  assessmentFrequencyEnum,
  assessmentSourceEnum,
  assessmentStatusEnum,
} from "./enums";
import { organizations } from "./organization";
import { programAssignments } from "./programs";

export const assessmentTemplates = pgTable(
  "assessment_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    name: text("name").notNull(),
    frequency: assessmentFrequencyEnum("frequency").notNull().default("monthly"),
    autoAssignOnProgramStart: boolean("auto_assign_on_program_start")
      .notNull()
      .default(true),
    daysAfterProgramStart: integer("days_after_program_start")
      .notNull()
      .default(30),
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
    index("assessment_templates_org_idx").on(t.organizationId),
    index("assessment_templates_org_default_idx").on(
      t.organizationId,
      t.isDefault,
    ),
  ],
);

export const assessmentFields = pgTable(
  "assessment_fields",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => assessmentTemplates.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    type: assessmentFieldTypeEnum("type").notNull(),
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
    index("assessment_fields_template_sort_idx").on(t.templateId, t.sortOrder),
    uniqueIndex("assessment_fields_template_sort_unique_idx").on(
      t.templateId,
      t.sortOrder,
    ),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => assessmentTemplates.id, { onDelete: "restrict" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    programAssignmentId: text("program_assignment_id").references(
      () => programAssignments.id,
      { onDelete: "set null" },
    ),
    status: assessmentStatusEnum("status").notNull().default("pending"),
    source: assessmentSourceEnum("source").notNull().default("manual"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    hasCriticalAlert: boolean("has_critical_alert").notNull().default(false),
    criticalSummary: text("critical_summary"),
    coachNotes: text("coach_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("assessments_org_client_status_idx").on(
      t.organizationId,
      t.clientId,
      t.status,
    ),
    index("assessments_org_status_submitted_idx").on(
      t.organizationId,
      t.status,
      t.submittedAt,
    ),
    index("assessments_template_idx").on(t.templateId),
  ],
);

export const assessmentResponses = pgTable(
  "assessment_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => assessmentFields.id, { onDelete: "restrict" }),
    textValue: text("text_value"),
    numberValue: real("number_value"),
    jsonValue: jsonb("json_value").$type<Record<string, number> | null>(),
    photoBlobPath: text("photo_blob_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("assessment_responses_assessment_idx").on(t.assessmentId),
    uniqueIndex("assessment_responses_assessment_field_unique_idx").on(
      t.assessmentId,
      t.fieldId,
    ),
  ],
);
