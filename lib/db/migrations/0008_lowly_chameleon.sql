CREATE TYPE "public"."meal_item_type" AS ENUM('food', 'recipe');--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"meal_id" text NOT NULL,
	"item_type" "meal_item_type" NOT NULL,
	"food_id" text,
	"recipe_id" text,
	"quantity" real NOT NULL,
	"unit" text DEFAULT 'g' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_log_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"meal_log_id" text NOT NULL,
	"item_type" "meal_item_type" NOT NULL,
	"food_id" text,
	"recipe_id" text,
	"quantity" real NOT NULL,
	"unit" text DEFAULT 'g' NOT NULL,
	"calories" real,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"assignment_id" text NOT NULL,
	"meal_id" text,
	"logged_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"time_slot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"client_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"status" "program_assignment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"target_calories" real DEFAULT 2000 NOT NULL,
	"target_protein_g" real DEFAULT 150 NOT NULL,
	"target_carbs_g" real DEFAULT 200 NOT NULL,
	"target_fat_g" real DEFAULT 65 NOT NULL,
	"published_at" timestamp with time zone,
	"cloned_from_plan_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_items" ADD CONSTRAINT "meal_log_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_items" ADD CONSTRAINT "meal_log_items_meal_log_id_meal_logs_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_items" ADD CONSTRAINT "meal_log_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_items" ADD CONSTRAINT "meal_log_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_assignment_id_nutrition_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."nutrition_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_plan_id_nutrition_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_assignments" ADD CONSTRAINT "nutrition_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_assignments" ADD CONSTRAINT "nutrition_assignments_plan_id_nutrition_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_assignments" ADD CONSTRAINT "nutrition_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_items_meal_sort_idx" ON "meal_items" USING btree ("meal_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_items_meal_sort_unique_idx" ON "meal_items" USING btree ("meal_id","sort_order");--> statement-breakpoint
CREATE INDEX "meal_log_items_meal_log_idx" ON "meal_log_items" USING btree ("meal_log_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_logs_assignment_date_meal_unique_idx" ON "meal_logs" USING btree ("assignment_id","logged_date","meal_id");--> statement-breakpoint
CREATE INDEX "meal_logs_org_client_date_idx" ON "meal_logs" USING btree ("organization_id","client_id","logged_date");--> statement-breakpoint
CREATE INDEX "meal_logs_assignment_idx" ON "meal_logs" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "meals_plan_sort_idx" ON "meals" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "meals_plan_sort_unique_idx" ON "meals" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "nutrition_assignments_org_plan_idx" ON "nutrition_assignments" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE INDEX "nutrition_assignments_org_client_status_idx" ON "nutrition_assignments" USING btree ("organization_id","client_id","status");--> statement-breakpoint
CREATE INDEX "nutrition_plans_org_status_idx" ON "nutrition_plans" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "nutrition_plans_org_name_idx" ON "nutrition_plans" USING btree ("organization_id","name");