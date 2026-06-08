CREATE TABLE "recipe_ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"food_id" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text DEFAULT 'g' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"servings" integer DEFAULT 1 NOT NULL,
	"prep_time_minutes" integer,
	"cook_time_minutes" integer,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_sort_idx" ON "recipe_ingredients" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_org_idx" ON "recipe_ingredients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recipes_org_updated_idx" ON "recipes" USING btree ("organization_id","updated_at");