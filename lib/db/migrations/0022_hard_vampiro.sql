CREATE TYPE "public"."automation_action_log_status" AS ENUM('pending', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."automation_action_type" AS ENUM('assign_program', 'assign_nutrition', 'create_assessment', 'send_notification', 'send_message', 'add_tag', 'create_task');--> statement-breakpoint
CREATE TYPE "public"."automation_execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('payment_received', 'client_created', 'form_completed', 'session_completed', 'assessment_submitted', 'schedule_cron', 'subscription_renewal_due');--> statement-breakpoint
CREATE TYPE "public"."coach_task_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "action_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"action_id" text NOT NULL,
	"status" "automation_action_log_status" DEFAULT 'pending' NOT NULL,
	"output" jsonb,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"action_type" "automation_action_type" NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"client_id" text,
	"trigger_event_id" text NOT NULL,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"status" "automation_execution_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date,
	"status" "coach_task_status" DEFAULT 'open' NOT NULL,
	"source_automation_id" text,
	"created_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_execution_id_automation_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."automation_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_action_id_automation_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."automation_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_tasks" ADD CONSTRAINT "coach_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_tasks" ADD CONSTRAINT "coach_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_tasks" ADD CONSTRAINT "coach_tasks_source_automation_id_automations_id_fk" FOREIGN KEY ("source_automation_id") REFERENCES "public"."automations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "action_logs_execution_action_idx" ON "action_logs" USING btree ("execution_id","action_id");--> statement-breakpoint
CREATE INDEX "action_logs_org_execution_idx" ON "action_logs" USING btree ("organization_id","execution_id");--> statement-breakpoint
CREATE INDEX "automation_actions_org_automation_idx" ON "automation_actions" USING btree ("organization_id","automation_id");--> statement-breakpoint
CREATE INDEX "automation_actions_automation_sort_idx" ON "automation_actions" USING btree ("automation_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_executions_idempotency_idx" ON "automation_executions" USING btree ("automation_id","client_id","trigger_event_id");--> statement-breakpoint
CREATE INDEX "automation_executions_org_automation_idx" ON "automation_executions" USING btree ("organization_id","automation_id","created_at");--> statement-breakpoint
CREATE INDEX "automation_executions_org_status_idx" ON "automation_executions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "automations_org_idx" ON "automations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "automations_org_active_trigger_idx" ON "automations" USING btree ("organization_id","is_active","trigger_type");--> statement-breakpoint
CREATE INDEX "coach_tasks_org_client_status_idx" ON "coach_tasks" USING btree ("organization_id","client_id","status");--> statement-breakpoint
CREATE INDEX "coach_tasks_org_due_date_idx" ON "coach_tasks" USING btree ("organization_id","due_date");