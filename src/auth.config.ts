import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuthPage = nextUrl.pathname === "/sign-in" || nextUrl.pathname === "/sign-up";

      if (isOnDashboard) {
        return isLoggedIn;
      }

      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.clinicId = user.clinicId;
      }
      // Triggered by unstable_update() from switchBusinessAction/createBusinessAction
      // — re-stamps the token with the newly active business without a full re-login.
      if (trigger === "update" && session?.user?.clinicId) {
        token.clinicId = session.user.clinicId;
        token.role = session.user.role;
      }
      return token;
    },
    session({ session, token }) {
      // token.role/clinicId are always set by the jwt callback above for any
      // session that came from our Credentials authorize(), so this is safe.
      if (session.user && token.role && token.clinicId) {
        session.user.role = token.role;
        session.user.clinicId = token.clinicId;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  // Filled in by auth.ts — kept empty here so middleware never bundles
  // the Credentials provider's db/bcrypt logic into the Edge runtime.
  providers: [],
} satisfies NextAuthConfig;
