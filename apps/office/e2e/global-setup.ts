import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { FAKE_PUSH_ADMIN_PORT, FAKE_PUSH_PORT, type PushDelivery } from "./helpers";

/** Refuses to run against anything but a local database, because the tests wipe it. */
function testDatabaseUrl() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Set E2E_DATABASE_URL to a LOCAL Postgres database the tests may wipe (see e2e/README.md).",
    );
  }
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `E2E_DATABASE_URL must point at localhost (got ${host}). The tests delete all data.`,
    );
  }
  return url;
}

/**
 * A fake Web Push service: records each delivery. HTTPS on FAKE_PUSH_PORT (push
 * endpoints must be https), plus a plain-HTTP admin port the tests read from.
 * Paths starting with /gone answer 410, like an expired subscription.
 */
function startFakePushService() {
  const dir = mkdtempSync(path.join(tmpdir(), "office-e2e-push-"));
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-keyout",
        path.join(dir, "key.pem"),
        "-out",
        path.join(dir, "cert.pem"),
      ],
      { stdio: "ignore" },
    );
  } catch {
    console.warn("openssl not found: the push suite will fail.");
    return () => {};
  }
  const log: PushDelivery[] = [];
  const receiver = https
    .createServer(
      {
        key: readFileSync(path.join(dir, "key.pem")),
        cert: readFileSync(path.join(dir, "cert.pem")),
      },
      (req, res) => {
        let bytes = 0;
        req.on("data", (chunk: Buffer) => (bytes += chunk.length));
        req.on("end", () => {
          log.push({
            path: req.url ?? "",
            bytes,
            encoding: (req.headers["content-encoding"] as string | undefined) ?? null,
            ttl: (req.headers.ttl as string | undefined) ?? null,
            vapid: /^vapid /i.test(req.headers.authorization ?? ""),
          });
          res.statusCode = req.url?.startsWith("/gone") ? 410 : 201;
          res.end();
        });
      },
    )
    .listen(FAKE_PUSH_PORT);
  const admin = http
    .createServer((req, res) => {
      if (req.url === "/clear") log.length = 0;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(log));
    })
    .listen(FAKE_PUSH_ADMIN_PORT);
  return () => {
    receiver.close();
    admin.close();
  };
}

export default async function globalSetup() {
  const url = testDatabaseUrl();
  const pool = new pg.Pool({ connectionString: url });
  await pool.query(
    "drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;",
  );
  await pool.end();

  const env = { ...process.env, DATABASE_URL: url, DATABASE_DRIVER: "pg" };
  const run = (script: string, extra: Record<string, string> = {}) =>
    execFileSync("pnpm", ["exec", "tsx", script], { env: { ...env, ...extra }, stdio: "inherit" });
  run("scripts/migrate.ts");
  run("scripts/upsert-user.ts", {
    OFFICE_USERNAME: "user",
    OFFICE_DISPLAY_NAME: "Mehmet Ünübol",
    OFFICE_PASSWORD: "admin-pass-123",
  });

  return startFakePushService();
}
