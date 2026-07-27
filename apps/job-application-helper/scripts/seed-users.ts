import { readFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

// Operator-only script — there is no self-signup UI anywhere in this app.
// Reads username/password pairs from a local, gitignored JSON file:
//   [{ "username": "mehmet", "password": "...", "displayName": "Mehmet" }, ...]
// Path defaults to scripts/seed-users.local.json (gitignored); override with
// SEED_USERS_FILE.

interface SeedUser {
  username: string;
  password: string;
  displayName?: string;
}

async function main() {
  const filePath = process.env.SEED_USERS_FILE ?? "scripts/seed-users.local.json";
  const raw = readFileSync(filePath, "utf-8");
  const seedUsers = JSON.parse(raw) as SeedUser[];

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  for (const seedUser of seedUsers) {
    const passwordHash = await hash(seedUser.password, 12);
    await db
      .insert(schema.users)
      .values({
        username: seedUser.username,
        passwordHash,
        displayName: seedUser.displayName,
      })
      .onConflictDoUpdate({
        target: schema.users.username,
        set: { passwordHash, displayName: seedUser.displayName },
      });
    console.log(`Seeded user: ${seedUser.username}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
