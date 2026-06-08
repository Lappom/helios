DROP INDEX "conversations_org_client_direct_idx";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "coach_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "max_participants" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_org_client_direct_idx" ON "conversations" USING btree ("organization_id","client_id") WHERE "conversations"."type" = 'direct';