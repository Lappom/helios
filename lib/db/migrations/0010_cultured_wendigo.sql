CREATE TYPE "public"."feedback_question_type" AS ENUM('scale', 'text', 'boolean');--> statement-breakpoint
CREATE TABLE "feedback_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "feedback_question_type" NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"session_feedback_id" text NOT NULL,
	"question_id" text NOT NULL,
	"text_value" text,
	"number_value" real,
	"boolean_value" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"session_log_id" text NOT NULL,
	"client_id" text NOT NULL,
	"template_id" text,
	"feeling" real NOT NULL,
	"difficulty" real NOT NULL,
	"fatigue" real NOT NULL,
	"motivation" real NOT NULL,
	"pain_reported" boolean DEFAULT false NOT NULL,
	"pain_details" text,
	"comment" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_feedback_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_questions" ADD CONSTRAINT "feedback_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_questions" ADD CONSTRAINT "feedback_questions_template_id_session_feedback_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."session_feedback_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_session_feedback_id_session_feedback_id_fk" FOREIGN KEY ("session_feedback_id") REFERENCES "public"."session_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_question_id_feedback_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."feedback_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_session_log_id_session_logs_id_fk" FOREIGN KEY ("session_log_id") REFERENCES "public"."session_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_template_id_session_feedback_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."session_feedback_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_feedback_templates" ADD CONSTRAINT "session_feedback_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_questions_template_sort_idx" ON "feedback_questions" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_questions_template_sort_unique_idx" ON "feedback_questions" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_responses_feedback_question_unique_idx" ON "feedback_responses" USING btree ("session_feedback_id","question_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_feedback_idx" ON "feedback_responses" USING btree ("session_feedback_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_feedback_session_log_unique_idx" ON "session_feedback" USING btree ("session_log_id");--> statement-breakpoint
CREATE INDEX "session_feedback_org_client_submitted_idx" ON "session_feedback" USING btree ("organization_id","client_id","submitted_at");--> statement-breakpoint
CREATE INDEX "session_feedback_org_pain_submitted_idx" ON "session_feedback" USING btree ("organization_id","pain_reported","submitted_at");--> statement-breakpoint
CREATE INDEX "session_feedback_templates_org_idx" ON "session_feedback_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "session_feedback_templates_org_default_idx" ON "session_feedback_templates" USING btree ("organization_id","is_default");