import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { foods } from "./foods";
import { organizations } from "./organization";

export const recipes = pgTable(
  "recipes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    servings: integer("servings").notNull().default(1),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    instructions: jsonb("instructions").$type<string[]>().notNull().default([]),
    createdByClerkUserId: text("created_by_clerk_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("recipes_org_updated_idx").on(t.organizationId, t.updatedAt),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    foodId: text("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
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
    index("recipe_ingredients_recipe_sort_idx").on(t.recipeId, t.sortOrder),
    index("recipe_ingredients_org_idx").on(t.organizationId),
  ],
);
