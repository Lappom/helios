CREATE TYPE "public"."video_source" AS ENUM('youtube', 'upload');--> statement-breakpoint
CREATE TYPE "public"."video_visibility" AS ENUM('all_clients', 'selected');--> statement-breakpoint
CREATE TABLE "video_access" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"video_id" text NOT NULL,
	"client_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"coach_clerk_user_id" text NOT NULL,
	"category_id" text,
	"title" text NOT NULL,
	"description" text,
	"source" "video_source" NOT NULL,
	"youtube_id" text,
	"blob_pathname" text,
	"thumbnail_pathname" text,
	"mime_type" text,
	"size_bytes" bigint,
	"duration_seconds" integer,
	"visibility" "video_visibility" DEFAULT 'all_clients' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_access" ADD CONSTRAINT "video_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_access" ADD CONSTRAINT "video_access_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_access" ADD CONSTRAINT "video_access_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_category_id_video_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."video_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "video_access_video_client_idx" ON "video_access" USING btree ("video_id","client_id");--> statement-breakpoint
CREATE INDEX "video_access_org_client_idx" ON "video_access" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "video_access_org_video_idx" ON "video_access" USING btree ("organization_id","video_id");--> statement-breakpoint
CREATE INDEX "video_categories_org_idx" ON "video_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "video_categories_org_sort_idx" ON "video_categories" USING btree ("organization_id","sort_order");--> statement-breakpoint
CREATE INDEX "videos_org_idx" ON "videos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "videos_org_category_idx" ON "videos" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX "videos_org_visibility_idx" ON "videos" USING btree ("organization_id","visibility");