# office — quick context

Presence ("in/out of the office") + E2E-encrypted chat for a small, admin-managed
group. Deployed standalone at `office.mehmetunubol.com`. Read `README.md` for
setup and the encryption design.

## Standing rules

- Admin is the hardcoded username `munubol` (`src/lib/constants.ts`); there is no
  roles table.
- The server must never see plaintext messages. All encrypt/decrypt happens in
  `src/lib/crypto.ts` on the client; API routes only validate and store
  ciphertext. Don't add server-side message processing (search, previews,
  notifications with content) without revisiting that design.
- Every API route re-reads the user via `getCurrentUser()` (checks
  `tokenVersion`), so password resets and deletions take effect immediately.
  Keep that pattern for new routes.
- Code avoids DB transactions so both drivers (neon-http in prod, node-postgres
  locally with `DATABASE_DRIVER=pg`) behave alike.
- Migrations: `pnpm db:generate` creates them; the user runs `pnpm db:migrate`.
- Before done: `pnpm typecheck && pnpm lint && pnpm test`.
- Decoy gate: signed-out visitors get `components/gate.tsx` at every URL
  (`proxy.ts` rewrites to `/`, whose layout renders the gate). Keep app copy,
  metadata and the manifest free of anything that reveals what the app is.
- Sessions end when the browser/tab/PWA closes (`lib/live-session.ts`):
  `getCurrentUser()` requires the session-only `office_live` cookie, and
  `SessionGuard` signs out when the tab's sessionStorage marker is missing.
