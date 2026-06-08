import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { blockTypeEnum, programStatusEnum } from "./enums";
import { exercises } from "./exercises";
import { organizations } from "./organization";

export const programs = pgTable(
  "programs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: programStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    clonedFromProgramId: text("cloned_from_program_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("programs_org_status_idx").on(t.organizationId, t.status),
    index("programs_org_name_idx").on(t.organizationId, t.name),
  ],
);

export const programWeeks = pgTable(
  "program_weeks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("program_weeks_program_sort_idx").on(t.programId, t.sortOrder),
    uniqueIndex("program_weeks_program_sort_unique_idx").on(
      t.programId,
      t.sortOrder,
    ),
  ],
);

export const programSessions = pgTable(
  "program_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    programWeekId: text("program_week_id")
      .notNull()
      .references(() => programWeeks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    name: text("name").notNull(),
    dayOfWeek: integer("day_of_week"),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("program_sessions_week_sort_idx").on(t.programWeekId, t.sortOrder),
    uniqueIndex("program_sessions_week_sort_unique_idx").on(
      t.programWeekId,
      t.sortOrder,
    ),
  ],
);

export const exerciseBlocks = pgTable(
  "exercise_blocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    programSessionId: text("program_session_id")
      .notNull()
      .references(() => programSessions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    type: blockTypeEnum("type").notNull().default("single"),
    sharedRestSeconds: integer("shared_rest_seconds"),
    rounds: integer("rounds"),
    restBetweenRoundsSeconds: integer("rest_between_rounds_seconds"),
    durationSeconds: integer("duration_seconds"),
    targetRpe: real("target_rpe"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("exercise_blocks_session_sort_idx").on(
      t.programSessionId,
      t.sortOrder,
    ),
    uniqueIndex("exercise_blocks_session_sort_unique_idx").on(
      t.programSessionId,
      t.sortOrder,
    ),
  ],
);

export const blockExercises = pgTable(
  "block_exercises",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    exerciseBlockId: text("exercise_block_id")
      .notNull()
      .references(() => exerciseBlocks.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("block_exercises_block_sort_idx").on(t.exerciseBlockId, t.sortOrder),
    uniqueIndex("block_exercises_block_sort_unique_idx").on(
      t.exerciseBlockId,
      t.sortOrder,
    ),
  ],
);

export const blockExerciseAlternatives = pgTable(
  "block_exercise_alternatives",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    blockExerciseId: text("block_exercise_id")
      .notNull()
      .references(() => blockExercises.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("block_exercise_alts_block_sort_idx").on(
      t.blockExerciseId,
      t.sortOrder,
    ),
    uniqueIndex("block_exercise_alts_block_exercise_unique_idx").on(
      t.blockExerciseId,
      t.exerciseId,
    ),
  ],
);

export const setPrescriptions = pgTable(
  "set_prescriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    blockExerciseId: text("block_exercise_id")
      .notNull()
      .references(() => blockExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    load: text("load"),
    reps: text("reps"),
    restSeconds: integer("rest_seconds"),
    tempo: text("tempo"),
    rpe: real("rpe"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("set_prescriptions_block_exercise_idx").on(t.blockExerciseId),
    uniqueIndex("set_prescriptions_block_exercise_set_unique_idx").on(
      t.blockExerciseId,
      t.setNumber,
    ),
  ],
);
