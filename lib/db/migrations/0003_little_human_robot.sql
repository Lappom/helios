CREATE TYPE "public"."block_type" AS ENUM('single', 'superset', 'triset', 'circuit', 'amrap');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "block_exercise_alternatives" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"block_exercise_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"exercise_block_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_session_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "block_type" DEFAULT 'single' NOT NULL,
	"shared_rest_seconds" integer,
	"rounds" integer,
	"rest_between_rounds_seconds" integer,
	"duration_seconds" integer,
	"target_rpe" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_week_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer,
	"scheduled_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"cloned_from_program_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_prescriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"block_exercise_id" text NOT NULL,
	"set_number" integer NOT NULL,
	"load" text,
	"reps" text,
	"rest_seconds" integer,
	"tempo" text,
	"rpe" real,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "search_vector" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "search_vector" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "search_vector" DROP EXPRESSION;--> statement-breakpoint
ALTER TABLE "block_exercise_alternatives" ADD CONSTRAINT "block_exercise_alternatives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercise_alternatives" ADD CONSTRAINT "block_exercise_alternatives_block_exercise_id_block_exercises_id_fk" FOREIGN KEY ("block_exercise_id") REFERENCES "public"."block_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercise_alternatives" ADD CONSTRAINT "block_exercise_alternatives_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercises" ADD CONSTRAINT "block_exercises_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercises" ADD CONSTRAINT "block_exercises_exercise_block_id_exercise_blocks_id_fk" FOREIGN KEY ("exercise_block_id") REFERENCES "public"."exercise_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_exercises" ADD CONSTRAINT "block_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_blocks" ADD CONSTRAINT "exercise_blocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_blocks" ADD CONSTRAINT "exercise_blocks_program_session_id_program_sessions_id_fk" FOREIGN KEY ("program_session_id") REFERENCES "public"."program_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_program_week_id_program_weeks_id_fk" FOREIGN KEY ("program_week_id") REFERENCES "public"."program_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_prescriptions" ADD CONSTRAINT "set_prescriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_prescriptions" ADD CONSTRAINT "set_prescriptions_block_exercise_id_block_exercises_id_fk" FOREIGN KEY ("block_exercise_id") REFERENCES "public"."block_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_exercise_alts_block_sort_idx" ON "block_exercise_alternatives" USING btree ("block_exercise_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "block_exercise_alts_block_exercise_unique_idx" ON "block_exercise_alternatives" USING btree ("block_exercise_id","exercise_id");--> statement-breakpoint
CREATE INDEX "block_exercises_block_sort_idx" ON "block_exercises" USING btree ("exercise_block_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "block_exercises_block_sort_unique_idx" ON "block_exercises" USING btree ("exercise_block_id","sort_order");--> statement-breakpoint
CREATE INDEX "exercise_blocks_session_sort_idx" ON "exercise_blocks" USING btree ("program_session_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_blocks_session_sort_unique_idx" ON "exercise_blocks" USING btree ("program_session_id","sort_order");--> statement-breakpoint
CREATE INDEX "program_sessions_week_sort_idx" ON "program_sessions" USING btree ("program_week_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_sessions_week_sort_unique_idx" ON "program_sessions" USING btree ("program_week_id","sort_order");--> statement-breakpoint
CREATE INDEX "program_weeks_program_sort_idx" ON "program_weeks" USING btree ("program_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "program_weeks_program_sort_unique_idx" ON "program_weeks" USING btree ("program_id","sort_order");--> statement-breakpoint
CREATE INDEX "programs_org_status_idx" ON "programs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "programs_org_name_idx" ON "programs" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "set_prescriptions_block_exercise_idx" ON "set_prescriptions" USING btree ("block_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "set_prescriptions_block_exercise_set_unique_idx" ON "set_prescriptions" USING btree ("block_exercise_id","set_number");