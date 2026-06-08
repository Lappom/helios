CREATE TYPE "public"."assessment_field_type" AS ENUM('text', 'number', 'select', 'photo', 'measurement');--> statement-breakpoint
CREATE TYPE "public"."assessment_frequency" AS ENUM('once', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."assessment_source" AS ENUM('manual', 'cron');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('pending', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TABLE "assessment_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "assessment_field_type" NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"field_id" text NOT NULL,
	"text_value" text,
	"number_value" real,
	"json_value" jsonb,
	"photo_blob_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"frequency" "assessment_frequency" DEFAULT 'monthly' NOT NULL,
	"auto_assign_on_program_start" boolean DEFAULT true NOT NULL,
	"days_after_program_start" integer DEFAULT 30 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"client_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"program_assignment_id" text,
	"status" "assessment_status" DEFAULT 'pending' NOT NULL,
	"source" "assessment_source" DEFAULT 'manual' NOT NULL,
	"due_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"has_critical_alert" boolean DEFAULT false NOT NULL,
	"critical_summary" text,
	"coach_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_fields" ADD CONSTRAINT "assessment_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_fields" ADD CONSTRAINT "assessment_fields_template_id_assessment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_field_id_assessment_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."assessment_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_template_id_assessment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_program_assignment_id_program_assignments_id_fk" FOREIGN KEY ("program_assignment_id") REFERENCES "public"."program_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_fields_template_sort_idx" ON "assessment_fields" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_fields_template_sort_unique_idx" ON "assessment_fields" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE INDEX "assessment_responses_assessment_idx" ON "assessment_responses" USING btree ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_responses_assessment_field_unique_idx" ON "assessment_responses" USING btree ("assessment_id","field_id");--> statement-breakpoint
CREATE INDEX "assessment_templates_org_idx" ON "assessment_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "assessment_templates_org_default_idx" ON "assessment_templates" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE INDEX "assessments_org_client_status_idx" ON "assessments" USING btree ("organization_id","client_id","status");--> statement-breakpoint
CREATE INDEX "assessments_org_status_submitted_idx" ON "assessments" USING btree ("organization_id","status","submitted_at");--> statement-breakpoint
CREATE INDEX "assessments_template_idx" ON "assessments" USING btree ("template_id");