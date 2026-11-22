import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ADMIN_USERNAME, LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from "@/lib/constants";
import { recordLockout } from "@/lib/security";
import { getLoginsDisabled } from "@/lib/settings";

/**
 * Shown as "account locked, try again in 15 minutes". Used both for a real
 * lockout and when the admin has disabled sign-ins, so users can't tell the
 * two apart.
 */
class AccountLocked extends CredentialsSignin {
  override code = "locked";
}

declare module "next-auth" {
  interface User {
    tokenVersion?: number;
  }
  interface Session {
    tokenVersion: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Short upper bound; closing the browser/app ends the session sooner (lib/live-session.ts).
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/" },
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
        // Panic switch: everyone except the admin sees a lockout, even for unknown usernames.
        if (user?.username !== ADMIN_USERNAME && (await getLoginsDisabled()))
          throw new AccountLocked();
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) throw new AccountLocked();

        if (!(await compare(password, user.passwordHash))) {
          const failed = user.failedLogins + 1;
          const locking = failed >= MAX_FAILED_LOGINS;
          await db
            .update(users)
            .set(
              locking
                ? {
                    failedLogins: 0,
                    lockedUntil: sql`now() + make_interval(mins => ${LOCKOUT_MINUTES})`,
                  }
                : { failedLogins: failed },
            )
            .where(eq(users.id, user.id));
          if (locking) {
            await recordLockout(user.id);
            throw new AccountLocked();
          }
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
