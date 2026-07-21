ALTER TABLE "messages" ADD COLUMN "wa_message_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_wa_message_id_unique" UNIQUE("wa_message_id");