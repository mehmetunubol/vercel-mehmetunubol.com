ALTER TABLE "users" ADD COLUMN "planned_presence" "presence";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planned_precision" varchar(16);