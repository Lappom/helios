import {
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import {
  mealItemTypeEnum,
  programAssignmentStatusEnum,
  programStatusEnum,
} from "./enums";
import { foods } from "./foods";
import { organizations } from "./organization";
import { recipes } from "./recipes";

export const nutritionPlans = pgTable(
  "nutrition_plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    name: text("name").notNull(),
    status: programStatusEnum("status").notNull().default("draft"),
    targetCalories: real("target_calories").notNull().default(2000),
    targetProteinG: real("target_protein_g").notNull().default(150),
    targetCarbsG: real("target_carbs_g").notNull().default(200),
    targetFatG: real("target_fat_g").notNull().default(65),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    clonedFromPlanId: text("cloned_from_plan_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("nutrition_plans_org_status_idx").on(t.organizationId, t.status),
    index("nutrition_plans_org_name_idx").on(t.organizationId, t.name),
  ],
);

export const meals = pgTable(
  "meals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => nutritionPlans.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    name: text("name").notNull(),
    timeSlot: text("time_slot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("meals_plan_sort_idx").on(t.planId, t.sortOrder),
    uniqueIndex("meals_plan_sort_unique_idx").on(t.planId, t.sortOrder),
  ],
);

export const mealItems = pgTable(
  "meal_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    itemType: mealItemTypeEnum("item_type").notNull(),
    foodId: text("food_id").references(() => foods.id, { onDelete: "restrict" }),
    recipeId: text("recipe_id").references(() => recipes.id, {
      onDelete: "restrict",
    }),
    quantity: real("quantity").notNull(),
    unit: text("unit").notNull().default("g"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("meal_items_meal_sort_idx").on(t.mealId, t.sortOrder),
    uniqueIndex("meal_items_meal_sort_unique_idx").on(t.mealId, t.sortOrder),
  ],
);

export const nutritionAssignments = pgTable(
  "nutrition_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => nutritionPlans.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
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
    index("nutrition_assignments_org_plan_idx").on(t.organizationId, t.planId),
    index("nutrition_assignments_org_client_status_idx").on(
      t.organizationId,
      t.clientId,
      t.status,
    ),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
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
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => nutritionAssignments.id, { onDelete: "cascade" }),
    mealId: text("meal_id").references(() => meals.id, { onDelete: "set null" }),
    loggedDate: date("logged_date").notNull(),
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
    uniqueIndex("meal_logs_assignment_date_meal_unique_idx").on(
      t.assignmentId,
      t.loggedDate,
      t.mealId,
    ),
    index("meal_logs_org_client_date_idx").on(
      t.organizationId,
      t.clientId,
      t.loggedDate,
    ),
    index("meal_logs_assignment_idx").on(t.assignmentId),
  ],
);

export const mealLogItems = pgTable(
  "meal_log_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    mealLogId: text("meal_log_id")
      .notNull()
      .references(() => mealLogs.id, { onDelete: "cascade" }),
    itemType: mealItemTypeEnum("item_type").notNull(),
    foodId: text("food_id").references(() => foods.id, { onDelete: "restrict" }),
    recipeId: text("recipe_id").references(() => recipes.id, {
      onDelete: "restrict",
    }),
    quantity: real("quantity").notNull(),
    unit: text("unit").notNull().default("g"),
    calories: real("calories"),
    proteinG: real("protein_g"),
    carbsG: real("carbs_g"),
    fatG: real("fat_g"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("meal_log_items_meal_log_idx").on(t.mealLogId)],
);
