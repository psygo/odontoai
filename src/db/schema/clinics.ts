import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cnpj: text("cnpj").unique(),
  phone: text("phone"),
  // Meta phone_number_id for this clinic's WhatsApp Business number — identifies
  // which clinic an inbound webhook belongs to (see src/lib/whatsapp.ts).
  whatsappPhoneNumberId: text("whatsapp_phone_number_id").unique(),
  // Shared verbatim by the WhatsApp agent's share_pix_key tool — never typed
  // out by the model itself, so a hallucinated character can't misdirect a
  // real payment.
  pixKey: text("pix_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
