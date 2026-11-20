import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from "@/lib/constants";

declare module "next-auth" {
  interface User {
    tokenVersion?: number;
  }
  interface Session {
    tokenVersion: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.ver = user.tokenVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.uid as string;
      session.tokenVersion = typeof token.ver === "number" ? token.ver : 0;
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim().toLowerCase()
            : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!username || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        if (!(await compare(password, user.passwordHash))) {
          const failed = user.failedLogins + 1;
          await db
            .update(users)
            .set(
              failed >= MAX_FAILED_LOGINS
                ? {
                    failedLogins: 0,
                    lockedUntil: sql`now() + make_interval(mins => ${LOCKOUT_MINUTES})`,
                  }
                : { failedLogins: failed },
            )
            .where(eq(users.id, user.id));
          return null;
        }

        if (user.failedLogins > 0 || user.lockedUntil) {
          await db
            .update(users)
            .set({ failedLogins: 0, lockedUntil: null })
            .where(eq(users.id, user.id));
        }
        return { id: user.id, name: user.displayName, tokenVersion: user.tokenVersion };
      },
    }),
  ],
});
