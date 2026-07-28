CREATE TABLE "aggregator_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"auto_sync_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracked_boards" ADD COLUMN "auto_sync_enabled" boolean DEFAULT true NOT NULL;