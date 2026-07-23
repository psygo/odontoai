import { customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { customers } from "./customers";
import { payments } from "./payments";

// node-postgres (the driver underlying both `pg` and `@neondatabase/serverless`)
// round-trips bytea as a Buffer by default — no custom to/from mapping needed.
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// A photo/PDF a customer sends over WhatsApp as proof of a Pix transfer. Stored
// as-is (not yet reconciled) until staff link it to a specific payment — the
// image arriving never auto-marks anything as paid.
export const paymentReceipts = pgTable("payment_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  // A customer can have several pending payments at once, so a bare incoming
  // image can't always be pinned to one automatically — staff pick the exact
  // payment by hand (see linkReceiptToPaymentAction).
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  imageData: bytea("image_data").notNull(),
  mimeType: text("mime_type").notNull(),
  // Meta's message id for the inbound image/document — the same idempotency
  // pattern as messages.waMessageId, guarding against webhook redelivery.
  waMessageId: text("wa_message_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
