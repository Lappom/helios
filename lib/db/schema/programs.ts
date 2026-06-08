import { sql } from "drizzle-orm";
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
import {
  blockTypeEnum,
  programAssignmentStatusEnum,
  programStatusEnum,
  trainingPhaseFocusEnum,
} from "./enums";
import { clients } from "./clients";
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

const cycleBlockColumns = {
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  name: text("name").notNull(),
  description: text("description"),
  focus: trainingPhaseFocusEnum("focus"),
  targetDurationWeeks: integer("target_duration_weeks"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const programMesocycles = pgTable(
  "program_mesocycles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    ...cycleBlockColumns,
  },
  (t) => [
    index("program_mesocycles_program_sort_idx").on(t.programId, t.sortOrder),
    uniqueIndex("program_mesocycles_program_sort_unique_idx").on(
      t.programId,
      t.sortOrder,
    ),
  ],
);

export const programMacrocycles = pgTable(
  "program_macrocycles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    mesocycleId: text("mesocycle_id")
      .notNull()
      .references(() => programMesocycles.id, { onDelete: "cascade" }),
    ...cycleBlockColumns,
  },
  (t) => [
    index("program_macrocycles_mesocycle_sort_idx").on(
      t.mesocycleId,
      t.sortOrder,
    ),
    uniqueIndex("program_macrocycles_mesocycle_sort_unique_idx").on(
      t.mesocycleId,
      t.sortOrder,
    ),
  ],
);

export const programMicrocycles = pgTable(
  "program_microcycles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    macrocycleId: text("macrocycle_id")
      .notNull()
      .references(() => programMacrocycles.id, { onDelete: "cascade" }),
    ...cycleBlockColumns,
  },
  (t) => [
    index("program_microcycles_macrocycle_sort_idx").on(
      t.macrocycleId,
      t.sortOrder,
    ),
    uniqueIndex("program_microcycles_macrocycle_sort_unique_idx").on(
      t.macrocycleId,
      t.sortOrder,
    ),
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
    microcycleId: text("microcycle_id").references(() => programMicrocycles.id, {
      onDelete: "cascade",
    }),
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
    index("program_weeks_microcycle_sort_idx").on(t.microcycleId, t.sortOrder),
    uniqueIndex("program_weeks_microcycle_sort_unique_idx")
      .on(t.microcycleId, t.sortOrder)
      .where(sql`${t.microcycleId} IS NOT NULL`),
    uniqueIndex("program_weeks_program_flat_sort_unique_idx")
      .on(t.programId, t.sortOrder)
      .where(sql`${t.microcycleId} IS NULL`),
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

export const programAssignments = pgTable(
  "program_assignments",
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
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    startMesocycleId: text("start_mesocycle_id").references(
      () => programMesocycles.id,
      { onDelete: "set null" },
    ),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: programAssignmentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("program_assignments_org_program_idx").on(
      t.organizationId,
      t.programId,
    ),
    index("program_assignments_org_client_status_idx").on(
      t.organizationId,
      t.clientId,
      t.status,
    ),
  ],
);

export const assignmentSessionOverrides = pgTable(
  "assignment_session_overrides",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => programAssignments.id, { onDelete: "cascade" }),
    programSessionId: text("program_session_id")
      .notNull()
      .references(() => programSessions.id, { onDelete: "cascade" }),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("assignment_session_overrides_assignment_idx").on(t.assignmentId),
    uniqueIndex("assignment_session_overrides_unique_idx").on(
      t.assignmentId,
      t.programSessionId,
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
