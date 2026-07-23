import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Which business to default into on next login / after switching — nullable
  // since it's just a convenience pointer, not a source of truth (that's
  // clinic_memberships).
  lastActiveClinicId: uuid("last_active_clinic_id").references(() => clinics.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
