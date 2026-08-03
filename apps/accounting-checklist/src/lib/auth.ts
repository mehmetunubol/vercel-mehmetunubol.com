import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// drive.file scope only — this app can see/manage files *it* creates,
// never the user's whole Drive.
const DRIVE_SCOPE = "openid email profile https://www.googleapis.com/auth/drive.file";

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Google access token: ${response.status}`);
  }

  return (await response.json()) as { access_token: string; expires_in: number };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    signIn({ profile }) {
      return profile?.email === process.env.ALLOWED_EMAIL;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        return token;
      }

      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      if (!token.refreshToken) return token;

      try {
        const refreshed = await refreshAccessToken(token.refreshToken);
        token.accessToken = refreshed.access_token;
        token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
      } catch {
        // Leave the stale token in place — the next Drive call will fail
        // with 401 and the user can re-authenticate via sign-in.
      }

      return token;
    },
    // Only expose what the UI needs (signed-in email) — access/refresh
    // tokens stay server-only in the JWT, never serialized to the client.
    session({ session }) {
      return session;
    },
  },
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: DRIVE_SCOPE,
        },
      },
    }),
  ],
});

// Reads the raw access token straight out of the encrypted JWT cookie —
// bypasses the `session` callback entirely, so this never leaks to the
// client. Route handlers use this to authenticate Drive API calls.
export async function getDriveAccessToken(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.accessToken ?? null;
}
