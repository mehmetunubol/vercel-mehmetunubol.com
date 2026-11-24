import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // Unit tests only; the browser tests in e2e/ run with Playwright (pnpm e2e).
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
