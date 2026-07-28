import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // dedupe.ts imports src/lib/db, which throws at import time if
    // DATABASE_URL is unset — tests never execute a query, so a placeholder
    // is enough to let the module load.
    env: { DATABASE_URL: "postgres://test:test@localhost:5432/test" },
  },
});
