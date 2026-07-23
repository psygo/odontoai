import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { clinicMemberships, users } from "@/db/schema";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (!user) return null;

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        const memberships = await db.query.clinicMemberships.findMany({
          where: eq(clinicMemberships.userId, user.id),
          orderBy: (m, { asc }) => [asc(m.createdAt)],
        });
        if (memberships.length === 0) return null;

        // Default into whichever business the user last switched to, falling
        // back to the oldest membership (e.g. first login, or the last-active
        // one was removed).
        const active = memberships.find((m) => m.clinicId === user.lastActiveClinicId) ?? memberships[0];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: active.role,
          clinicId: active.clinicId,
        };
      },
    }),
  ],
});
