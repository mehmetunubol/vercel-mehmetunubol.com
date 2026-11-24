# Browser tests

Eleven Playwright suites that drive the real app in a browser, the way people use
it: the sign-in gate, chats and encryption, presence, events, security and
push notifications, photos, online status, and safety controls. They run in order, because later suites use the people and
chats created by earlier ones.

| Suite               | Covers                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01-core`           | Decoy page and triple-tap, adding people and groups, private and group chats (decrypted on each side), session ends when the window closes, unlocking on a new device, password change and admin reset |
| `02-presence`       | In / Out lists, scheduled changes ("back in 2 h", a day + morning), the automatic flip                                                                                                                 |
| `03-chat`           | Announcement groups, reactions, read receipts, the locked-device rule, replies, edits and deletes                                                                                                      |
| `04-events`         | Creating, inviting, answers, the calendar, privacy, editing, cancelling                                                                                                                                |
| `05-security`       | Lockout alerts, Unlock now, both panic buttons, Delete all events, the activity log                                                                                                                    |
| `06-push`           | Who gets a nudge, the one-per-minute limit, that the push carries nothing, what the phone shows                                                                                                        |
| `07-photos`         | One-time photos (view once, the sender can't open them, erased after everyone has seen them, the viewer closes when you leave the app), ordinary photos and the admin switch                           |
| `08-online`         | Online / last seen, the reciprocal hide switch, typing, no notifications while you're in the app                                                                                                       |
| `09-controls`       | The per-address guessing limit and Unblock, quick hide (button and Esc twice), auto-lock, per-chat message lifetime, mute                                                                              |
| `10-clips`          | One-time voice notes and videos recorded with a fake camera/microphone; one-time photos allow 5 seconds                                                                                                |
| `11-planner-health` | The Day Planner's Week / Notes / Settings pages (device-only), the admin Health panel                                                                                                                  |

## Running them

They need a **local** Postgres that the tests are allowed to wipe. They refuse
to start if `E2E_DATABASE_URL` isn't on `localhost`, so your Neon database is
never touched.

One-time setup on a Mac:

```bash
brew install postgresql@16 && brew services start postgresql@16
```

```bash
createdb office_e2e
```

```bash
pnpm --filter office exec playwright install chromium
```

Then, from the repository root:

```bash
E2E_DATABASE_URL=postgres://localhost:5432/office_e2e pnpm --filter office e2e
```

Each run builds the app, starts it on port 3100 (plus a fake push service on
4519/4520, which needs `openssl`), wipes and migrates the test database, and
creates the admin `user` with password `admin-pass-123`. It takes about three
minutes.

To run a single suite, run the earlier ones too, since it builds on their data:

```bash
E2E_DATABASE_URL=postgres://localhost:5432/office_e2e pnpm --filter office exec playwright test e2e/01-core.spec.ts e2e/02-presence.spec.ts
```
