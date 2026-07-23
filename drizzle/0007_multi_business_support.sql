CREATE TABLE "clinic_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "clinic_memberships" ("user_id", "clinic_id", "role") SELECT "id", "clinic_id", "role" FROM "users";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clinic_id_clinics_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_clinic_id" uuid;--> statement-breakpoint
UPDATE "users" SET "last_active_clinic_id" = "clinic_id";
--> statement-breakpoint
ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_memberships_user_clinic_idx" ON "clinic_memberships" USING btree ("user_id","clinic_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_last_active_clinic_id_clinics_id_fk" FOREIGN KEY ("last_active_clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "clinic_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";