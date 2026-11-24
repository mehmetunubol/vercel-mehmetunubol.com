import { defineConfig, devices } from "@playwright/test";
import webpush from "web-push";

/**
 * End-to-end tests. They build the app, start it on PORT against a LOCAL
 * Postgres (E2E_DATABASE_URL) and WIPE that database first, so global setup
 * refuses anything that isn't on localhost. See e2e/README.md.
 */
export const PORT = 3100;

// Checked here, before Playwright starts anything: the tests wipe this database.
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Set E2E_DATABASE_URL to a LOCAL Postgres database the tests may wipe (see e2e/README.md).",
  );
}
const databaseHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error(
    `E2E_DATABASE_URL must point at localhost (got ${databaseHost}). The tests delete all data.`,
  );
}
const vapid = webpush.generateVAPIDKeys();

export default defineConfig({
  testDir: "e2e",
  // The suites build on each other's data (users, chats, passwords), so they run in order.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The full Chromium build: the headless shell can't show notifications.
    channel: "chromium",
    ...devices["iPhone 13"],
    // The iPhone preset defaults to WebKit; these tests use Chromium.
    browserName: "chromium",
    timezoneId: "Europe/Istanbul",
trace: "off",
    // Fake camera and microphone, for the voice note / video suite.
    launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
    // Fail a stuck step quickly instead of using up the whole test timeout.
    actionTimeout: 20_000,
  },
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 5 * 60_000,
    reuseExistingServer: false,
    stdout: "ignore",
    // The server logs expected errors (e.g. wrong passwords); failures show in the tests.
    stderr: "ignore",
    env: {
      DATABASE_URL: databaseUrl,
      DATABASE_DRIVER: "pg",
      AUTH_SECRET: "e2e-only-secret-e2e-only-secret-0123456789",
      AUTH_TRUST_HOST: "true",
      CRON_SECRET: "e2e-cron",
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
      // The fake push service in global setup uses a self-signed certificate.
      // This applies only to this throwaway test server.
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
  },
});
