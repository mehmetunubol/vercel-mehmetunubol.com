CREATE TYPE "public"."attachment_kind" AS ENUM('once', 'normal');--> statement-breakpoint
CREATE TABLE "attachment_views" (
	"attachment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_views_attachment_id_user_id_pk" PRIMARY KEY("attachment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"ciphertext" text,
	"iv" varchar(32) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "attachment_views" ADD CONSTRAINT "attachment_views_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_views" ADD CONSTRAINT "attachment_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;