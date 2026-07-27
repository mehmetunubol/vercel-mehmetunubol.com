import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Only this username can manage other users (create/delete/reset password).
// There's no roles table — this is a personal single-operator tool, so a
// hardcoded check is simpler than modeling permissions for one admin.
export const ADMIN_USERNAME = "unubol";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.displayName ?? user.username };
      },
    }),
  ],
});

// next-auth v5's Session type carries `user.id?: string` (via DefaultUser),
// even though our jwt/session callbacks above always set it — narrowing on
// the property directly here avoids fighting the upstream type in every caller.
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCurrentUsername(): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const [user] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.username ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const username = await getCurrentUsername();
  return username === ADMIN_USERNAME;
}
