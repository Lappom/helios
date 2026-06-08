CREATE TYPE "public"."payment_source" AS ENUM('manual', 'booking', 'import');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('subscription', 'one_time', 'external');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"client_id" text,
	"service_id" text,
	"booking_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"type" "payment_type" NOT NULL,
	"source" "payment_source" NOT NULL,
	"external_reference" text,
	"description" text,
	"paid_at" timestamp with time zone NOT NULL,
	"status" "payment_status" DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_snapshots" (
	"organization_id" text NOT NULL,
	"month" date NOT NULL,
	"total_revenue_cents" integer DEFAULT 0 NOT NULL,
	"mrr_cents" integer DEFAULT 0 NOT NULL,
	"one_time_revenue_cents" integer DEFAULT 0 NOT NULL,
	"client_count" integer DEFAULT 0 NOT NULL,
	"new_clients" integer DEFAULT 0 NOT NULL,
	"churned_clients" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_snapshots_organization_id_month_pk" PRIMARY KEY("organization_id","month")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_service_id_coach_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."coach_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_snapshots" ADD CONSTRAINT "revenue_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_org_paid_at_idx" ON "payments" USING btree ("organization_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_org_client_idx" ON "payments" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "payments_org_type_idx" ON "payments" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_booking_unique_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "revenue_snapshots_org_month_idx" ON "revenue_snapshots" USING btree ("organization_id","month");