CREATE TYPE "public"."training_phase_focus" AS ENUM('strength', 'hypertrophy', 'power', 'endurance', 'deload', 'custom');--> statement-breakpoint
CREATE TABLE "program_macrocycles" (
	"id" text PRIMARY KEY NOT NULL,
	"mesocycle_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"focus" "training_phase_focus",
	"target_duration_weeks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_mesocycles" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"focus" "training_phase_focus",
	"target_duration_weeks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_microcycles" (
	"id" text PRIMARY KEY NOT NULL,
	"macrocycle_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"focus" "training_phase_focus",
	"target_duration_weeks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "program_weeks_program_sort_unique_idx";--> statement-breakpoint
ALTER TABLE "program_assignments" ADD COLUMN "start_mesocycle_id" text;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD COLUMN "microcycle_id" text;--> statement-breakpoint
ALTER TABLE "program_macrocycles" ADD CONSTRAINT "program_macrocycles_mesocycle_id_program_mesocycles_id_fk" FOREIGN KEY ("mesocycle_id") REFERENCES "public"."program_mesocycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_macrocycles" ADD CONSTRAINT "program_macrocycles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_mesocycles" ADD CONSTRAINT "program_mesocycles_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_mesocycles" ADD CONSTRAINT "program_mesocycles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_microcycles" ADD CONSTRAINT "program_microcycles_macrocycle_id_program_macrocycles_id_fk" FOREIGN KEY ("macrocycle_id") REFERENCES "public"."program_macrocycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_microcycles" ADD CONSTRAINT "program_microcycles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_macrocycles_mesocycle_sort_idx" ON "program_macrocycles" USING btree ("mesocycle_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_macrocycles_mesocycle_sort_unique_idx" ON "program_macrocycles" USING btree ("mesocycle_id","sort_order");--> statement-breakpoint
CREATE INDEX "program_mesocycles_program_sort_idx" ON "program_mesocycles" USING btree ("program_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_mesocycles_program_sort_unique_idx" ON "program_mesocycles" USING btree ("program_id","sort_order");--> statement-breakpoint
CREATE INDEX "program_microcycles_macrocycle_sort_idx" ON "program_microcycles" USING btree ("macrocycle_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_microcycles_macrocycle_sort_unique_idx" ON "program_microcycles" USING btree ("macrocycle_id","sort_order");--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_start_mesocycle_id_program_mesocycles_id_fk" FOREIGN KEY ("start_mesocycle_id") REFERENCES "public"."program_mesocycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_microcycle_id_program_microcycles_id_fk" FOREIGN KEY ("microcycle_id") REFERENCES "public"."program_microcycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_weeks_microcycle_sort_idx" ON "program_weeks" USING btree ("microcycle_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_weeks_microcycle_sort_unique_idx" ON "program_weeks" USING btree ("microcycle_id","sort_order") WHERE "program_weeks"."microcycle_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "program_weeks_program_flat_sort_unique_idx" ON "program_weeks" USING btree ("program_id","sort_order") WHERE "program_weeks"."microcycle_id" IS NULL;