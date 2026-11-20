import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL!;
  if (process.env.DATABASE_DRIVER === "pg") {
    const pool = new Pool({ connectionString: url });
    await migratePg(drizzlePg(pool), { migrationsFolder: "./drizzle" });
    await pool.end();
  } else {
    await migrateNeon(drizzleNeon(neon(url)), { migrationsFolder: "./drizzle" });
  }
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
