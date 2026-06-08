CREATE TYPE "public"."questionnaire_question_type" AS ENUM('scale', 'text', 'boolean', 'select');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_schedule_trigger" AS ENUM('on_client_created', 'weekly_cron');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_submission_status" AS ENUM('pending', 'submitted', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_type" AS ENUM('onboarding', 'weekly_checkin', 'custom');--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE 'questionnaire_due';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE 'questionnaire_reminder';--> statement-breakpoint
CREATE TABLE "questionnaire_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"questionnaire_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "questionnaire_question_type" NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"question_id" text NOT NULL,
	"text_value" text,
	"number_value" real,
	"boolean_value" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"questionnaire_id" text NOT NULL,
	"trigger_type" "questionnaire_schedule_trigger" NOT NULL,
	"send_day_of_week" integer,
	"send_hour_utc" integer,
	"reminder_day_of_week" integer,
	"reminder_hour_utc" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"questionnaire_id" text NOT NULL,
	"schedule_id" text,
	"client_id" text NOT NULL,
	"status" "questionnaire_submission_status" DEFAULT 'pending' NOT NULL,
	"period_key" text NOT NULL,
	"due_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "questionnaire_type" DEFAULT 'custom' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_submission_id_questionnaire_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."questionnaire_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_question_id_questionnaire_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_schedules" ADD CONSTRAINT "questionnaire_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_schedules" ADD CONSTRAINT "questionnaire_schedules_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_schedule_id_questionnaire_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."questionnaire_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questionnaire_questions_questionnaire_sort_idx" ON "questionnaire_questions" USING btree ("questionnaire_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_questions_questionnaire_sort_unique_idx" ON "questionnaire_questions" USING btree ("questionnaire_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_responses_submission_question_unique_idx" ON "questionnaire_responses" USING btree ("submission_id","question_id");--> statement-breakpoint
CREATE INDEX "questionnaire_responses_submission_idx" ON "questionnaire_responses" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_schedules_questionnaire_unique_idx" ON "questionnaire_schedules" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "questionnaire_schedules_org_active_idx" ON "questionnaire_schedules" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_submissions_unique_period_idx" ON "questionnaire_submissions" USING btree ("questionnaire_id","client_id","period_key");--> statement-breakpoint
CREATE INDEX "questionnaire_submissions_org_status_idx" ON "questionnaire_submissions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "questionnaire_submissions_client_status_idx" ON "questionnaire_submissions" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "questionnaire_submissions_questionnaire_idx" ON "questionnaire_submissions" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "questionnaires_org_idx" ON "questionnaires" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "questionnaires_org_type_idx" ON "questionnaires" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "questionnaires_org_active_idx" ON "questionnaires" USING btree ("organization_id","is_active");