import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cnpj: text("cnpj").unique(),
  phone: text("phone"),
  // Meta phone_number_id for this clinic's WhatsApp Business number — identifies
  // which clinic an inbound webhook belongs to (see src/lib/whatsapp.ts).
  whatsappPhoneNumberId: text("whatsapp_phone_number_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
