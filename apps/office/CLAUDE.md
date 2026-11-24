# office — quick context

Presence ("in/out of the office") + E2E-encrypted chat for a small, admin-managed
group. Deployed standalone at `office.mehmetunubol.com`. Read `README.md` for
setup and the encryption design.

## Standing rules

- Admin is the hardcoded username `user` (`src/lib/constants.ts`); there is no
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
- Before done: `pnpm typecheck && pnpm lint && pnpm test`, and for UI or API
  changes the browser tests too: `E2E_DATABASE_URL=<local db> pnpm e2e` (see
  `e2e/README.md`). Add or update a suite step for new behaviour. Assertions
  must not depend on the time of day (the planner switches modes after 22:00,
  and "in 2 h" becomes "tomorrow at …" near midnight).
- Decoy gate: signed-out visitors get `components/gate.tsx` at every URL
  (`proxy.ts` rewrites to `/`, whose layout renders the gate). Keep app copy,
  metadata and the manifest free of anything that reveals what the app is.
- Sessions end when the browser/tab/PWA closes (`lib/live-session.ts`):
  `getCurrentUser()` requires the session-only `office_live` cookie, and
  `SessionGuard` signs out when the tab's sessionStorage marker is missing.
- Push notifications must stay content-free: `lib/push.ts` sends an empty
  payload and `public/sw.js` picks a random generic line. Never put the app
  name, sender, title or message text into a push or a notification.
- Panic switch "disable sign-ins" exempts only `ADMIN_USERNAME`, and blocked
  users must see the same "locked" message as a real lockout.
- Photos (`lib/photo.ts`, `components/photo-views.tsx`): the photo key lives
  inside the E2E-encrypted message; the server stores only ciphertext in
  `attachments`. One-time photos: never serve them to the sender, record a view
  per recipient (`attachment_views`), erase the ciphertext once all recipients
  have viewed. Don't add server-side image processing (thumbnails, previews).
