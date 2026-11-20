import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

// Bootstrap / recovery: creates a user, or resets an existing user's password
// (which also clears their E2E keys and signs them out everywhere).
//   OFFICE_USERNAME=munubol OFFICE_DISPLAY_NAME="Mehmet" OFFICE_PASSWORD='...' pnpm user:upsert
async function main() {
  const username = process.env.OFFICE_USERNAME?.trim().toLowerCase();
  const password = process.env.OFFICE_PASSWORD;
  const displayName = process.env.OFFICE_DISPLAY_NAME?.trim() || username;
  if (!username || !password || password.length < 8) {
    throw new Error(
      "Set OFFICE_USERNAME and OFFICE_PASSWORD (min 8 chars), optionally OFFICE_DISPLAY_NAME.",
    );
  }
  const passwordHash = await hash(password, 12);
  await db
    .insert(users)
    .values({ username, displayName: displayName!, passwordHash })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        passwordHash,
        publicKey: null,
        encryptedPrivateKey: null,
        failedLogins: 0,
        lockedUntil: null,
        tokenVersion: sql`${users.tokenVersion} + 1`,
      },
    });
  console.log(`Upserted user: ${username}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
