import type { UserRole } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    clinicId: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      clinicId: string;
    } & DefaultSession["user"];
  }
}

// next-auth/jwt just re-exports from here — augmenting next-auth/jwt directly
// doesn't merge with the underlying interface.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    clinicId?: string;
  }
}
