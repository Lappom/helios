import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { foodSourceEnum } from "./enums";
import { organizations } from "./organization";

export const foods = pgTable(
  "foods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    source: foodSourceEnum("source").notNull().default("custom"),
    externalId: text("external_id"),
    name: text("name").notNull(),
    brand: text("brand"),
    barcode: text("barcode"),
    servingSize: real("serving_size").notNull().default(100),
    servingUnit: text("serving_unit").notNull().default("g"),
    caloriesPer100g: real("calories_per_100g").notNull(),
    proteinGPer100g: real("protein_g_per_100g").notNull(),
    carbsGPer100g: real("carbs_g_per_100g").notNull(),
    fatGPer100g: real("fat_g_per_100g").notNull(),
    fiberGPer100g: real("fiber_g_per_100g"),
    sugarGPer100g: real("sugar_g_per_100g"),
    searchVector: text("search_vector").notNull().default(""),
    createdByClerkUserId: text("created_by_clerk_user_id"),
    offSyncedAt: timestamp("off_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("foods_org_source_idx").on(t.organizationId, t.source),
    uniqueIndex("foods_barcode_idx")
      .on(t.barcode)
      .where(sql`${t.barcode} IS NOT NULL`),
    uniqueIndex("foods_off_external_idx")
      .on(t.externalId, t.source)
      .where(sql`${t.source} = 'off'`),
    index("foods_source_idx").on(t.source),
  ],
);
