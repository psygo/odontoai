import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// neon-http only does one-shot queries; sign-up needs a real transaction
// (clinic + first user created atomically), so we use the WebSocket driver.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// node-postgres Pools emit "error" when an idle pooled connection drops
// (e.g. Neon closing it after idling) — without a listener, Node treats that
// as an uncaught exception and can crash the whole process, not just the
// in-flight query.
pool.on("error", (err: Error) => {
  console.error("Neon pool connection error (idle client dropped):", err);
});

export const db = drizzle(pool, { schema });
