CREATE TYPE "public"."referral_conversion_status" AS ENUM('pending', 'converted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."referral_credit_entry_type" AS ENUM('commission_earned', 'credit_applied', 'adjustment');--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text NOT NULL,
	"client_id" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"referral_code_id" text NOT NULL,
	"referrer_client_id" text NOT NULL,
	"referred_client_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"status" "referral_conversion_status" DEFAULT 'pending' NOT NULL,
	"referee_discount_cents" integer DEFAULT 0 NOT NULL,
	"commission_cents" integer DEFAULT 0 NOT NULL,
	"payment_id" text,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_credit_balances" (
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"entry_type" "referral_credit_entry_type" NOT NULL,
	"conversion_id" text,
	"booking_id" text,
	"payment_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"referee_discount_type" "promo_discount_type" DEFAULT 'percent' NOT NULL,
	"referee_discount_value" integer DEFAULT 10 NOT NULL,
	"commission_type" "promo_discount_type" DEFAULT 'percent' NOT NULL,
	"commission_value" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "referral_code_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "referral_credit_applied_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_program_id_referral_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."referral_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referrer_client_id_clients_id_fk" FOREIGN KEY ("referrer_client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_client_id_clients_id_fk" FOREIGN KEY ("referred_client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_balances" ADD CONSTRAINT "referral_credit_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_balances" ADD CONSTRAINT "referral_credit_balances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_ledger" ADD CONSTRAINT "referral_credit_ledger_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_ledger" ADD CONSTRAINT "referral_credit_ledger_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_ledger" ADD CONSTRAINT "referral_credit_ledger_conversion_id_referral_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."referral_conversions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credit_ledger" ADD CONSTRAINT "referral_credit_ledger_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_org_code_idx" ON "referral_codes" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_client_idx" ON "referral_codes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "referral_codes_program_idx" ON "referral_codes" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "referral_codes_org_idx" ON "referral_codes" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_conversions_booking_idx" ON "referral_conversions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "referral_conversions_org_status_idx" ON "referral_conversions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "referral_conversions_referrer_idx" ON "referral_conversions" USING btree ("referrer_client_id");--> statement-breakpoint
CREATE INDEX "referral_conversions_code_idx" ON "referral_conversions" USING btree ("referral_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_credit_balances_client_idx" ON "referral_credit_balances" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "referral_credit_ledger_client_idx" ON "referral_credit_ledger" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "referral_credit_ledger_conversion_idx" ON "referral_credit_ledger" USING btree ("conversion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_programs_org_coach_idx" ON "referral_programs" USING btree ("organization_id","coach_clerk_user_id");--> statement-breakpoint
CREATE INDEX "referral_programs_org_idx" ON "referral_programs" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE set null ON UPDATE no action;