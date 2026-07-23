ALTER TABLE "dentists" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "prescriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dentists" CASCADE;--> statement-breakpoint
DROP TABLE "appointments" CASCADE;--> statement-breakpoint
DROP TABLE "prescriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "patients" RENAME TO "customers";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "patient_id" TO "customer_id";--> statement-breakpoint
ALTER TABLE "payment_receipts" RENAME COLUMN "patient_id" TO "customer_id";--> statement-breakpoint
ALTER TABLE "conversations" RENAME COLUMN "patient_id" TO "customer_id";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "patients_clinic_id_clinics_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_receipts" DROP CONSTRAINT "payment_receipts_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
DROP INDEX "patients_clinic_phone_idx";--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_clinic_phone_idx" ON "customers" USING btree ("clinic_id","phone");--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "appointment_id";--> statement-breakpoint
ALTER TABLE "payment_receipts" DROP COLUMN "appointment_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "dentist_id";--> statement-breakpoint
DROP TYPE "public"."appointment_status";--> statement-breakpoint
DROP TYPE "public"."prescription_status";