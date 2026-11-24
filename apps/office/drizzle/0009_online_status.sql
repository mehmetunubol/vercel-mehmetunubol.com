ALTER TABLE "conversation_members" ADD COLUMN "typing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "online_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hide_online" boolean DEFAULT false NOT NULL;