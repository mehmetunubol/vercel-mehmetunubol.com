CREATE TABLE "sign_in_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_members" ADD COLUMN "muted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "ttl_hours" integer;--> statement-breakpoint
ALTER TABLE "security_alerts" ADD COLUMN "detail" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auto_lock_minutes" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
CREATE INDEX "sign_in_failures_ip_created_idx" ON "sign_in_failures" USING btree ("ip","created_at");