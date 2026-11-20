import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL!;

// Neon's HTTP driver in production; plain node-postgres for a local Postgres
// (DATABASE_DRIVER=pg). Code here never uses transactions, so both behave alike.
function createDb() {
  if (process.env.DATABASE_DRIVER === "pg") {
    return drizzlePg(new Pool({ connectionString: url }), { schema });
  }
  return drizzleNeon(neon(url), { schema });
}

export const db = createDb() as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
