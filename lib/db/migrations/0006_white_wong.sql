CREATE TYPE "public"."food_source" AS ENUM('off', 'usda', 'custom');--> statement-breakpoint
CREATE TABLE "foods" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"source" "food_source" DEFAULT 'custom' NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"serving_size" real DEFAULT 100 NOT NULL,
	"serving_unit" text DEFAULT 'g' NOT NULL,
	"calories_per_100g" real NOT NULL,
	"protein_g_per_100g" real NOT NULL,
	"carbs_g_per_100g" real NOT NULL,
	"fat_g_per_100g" real NOT NULL,
	"fiber_g_per_100g" real,
	"sugar_g_per_100g" real,
	"search_vector" text DEFAULT '' NOT NULL,
	"created_by_clerk_user_id" text,
	"off_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "foods_org_source_idx" ON "foods" USING btree ("organization_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_barcode_idx" ON "foods" USING btree ("barcode") WHERE "foods"."barcode" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "foods_off_external_idx" ON "foods" USING btree ("external_id","source") WHERE "foods"."source" = 'off';--> statement-breakpoint
CREATE INDEX "foods_source_idx" ON "foods" USING btree ("source");--> statement-breakpoint
CREATE INDEX "foods_search_trgm_idx" ON "foods" USING gin ("search_vector" gin_trgm_ops);