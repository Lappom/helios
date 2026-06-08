CREATE TYPE "public"."drive_share_permission" AS ENUM('read');--> statement-breakpoint
CREATE TABLE "drive_files" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"blob_pathname" text NOT NULL,
	"uploaded_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"file_id" text,
	"folder_id" text,
	"client_id" text NOT NULL,
	"permission" "drive_share_permission" DEFAULT 'read' NOT NULL,
	"shared_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_folder_id_drive_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."drive_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_folders" ADD CONSTRAINT "drive_folders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_shares" ADD CONSTRAINT "drive_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_shares" ADD CONSTRAINT "drive_shares_file_id_drive_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."drive_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_shares" ADD CONSTRAINT "drive_shares_folder_id_drive_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."drive_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_shares" ADD CONSTRAINT "drive_shares_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_files_org_folder_idx" ON "drive_files" USING btree ("organization_id","folder_id");--> statement-breakpoint
CREATE INDEX "drive_files_org_idx" ON "drive_files" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "drive_folders_org_parent_idx" ON "drive_folders" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "drive_folders_org_idx" ON "drive_folders" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drive_shares_file_client_idx" ON "drive_shares" USING btree ("file_id","client_id") WHERE "drive_shares"."file_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "drive_shares_folder_client_idx" ON "drive_shares" USING btree ("folder_id","client_id") WHERE "drive_shares"."folder_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "drive_shares_org_client_idx" ON "drive_shares" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "drive_shares_org_file_idx" ON "drive_shares" USING btree ("organization_id","file_id");--> statement-breakpoint
CREATE INDEX "drive_shares_org_folder_idx" ON "drive_shares" USING btree ("organization_id","folder_id");