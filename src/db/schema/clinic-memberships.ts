import { pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./users";

export const userRole = pgEnum("user_role", ["admin", "staff"]);
export type UserRole = (typeof userRole.enumValues)[number];

// A user can belong to (and switch between) several businesses — this is the
// many-to-many join; role lives here (per-business) rather than on `users`.
export const clinicMemberships = pgTable(
  "clinic_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("clinic_memberships_user_clinic_idx").on(table.userId, table.clinicId)],
);
