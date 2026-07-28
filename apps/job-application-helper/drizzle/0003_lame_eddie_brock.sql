ALTER TYPE "public"."job_source" ADD VALUE 'linkedin';--> statement-breakpoint
CREATE TABLE "linkedin_saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"keywords" varchar(256) DEFAULT '' NOT NULL,
	"location" varchar(256) DEFAULT '' NOT NULL,
	"geo_id" varchar(32),
	"posted_within" varchar(16),
	"experience" varchar(16),
	"job_type" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"workplace" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"easy_apply_only" boolean DEFAULT false NOT NULL,
	"few_applicants" boolean DEFAULT false NOT NULL,
	"sort" varchar(8) DEFAULT 'DD' NOT NULL,
	"radius_miles" varchar(8),
	"active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "linkedin_saved_searches" ADD CONSTRAINT "linkedin_saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;