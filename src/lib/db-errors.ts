// Drizzle wraps the underlying pg error in a DrizzleQueryError, so the real
// Postgres error code lives on `error.cause`, not the error itself — this
// walks the cause chain to find it.
function hasPgCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === code) return true;
  return "cause" in error && hasPgCode(error.cause, code);
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPgCode(error, "23505");
}
