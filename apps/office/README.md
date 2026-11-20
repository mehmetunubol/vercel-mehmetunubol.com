# Office

`office.mehmetunubol.com`: a small installable app for a fixed group of people.

- **Status bar**: everyone flips themselves _In_ or _Out_ of the office. Everyone
  sees everyone's status, and the admin's status is pinned at the top.
- **Messages**: end-to-end encrypted private chats (anyone ↔ anyone) and group
  chats (created and managed by the admin only). Messages are deleted after a
  configurable number of hours.
- **Admin** (`munubol` only): add, rename and remove people, reset passwords,
  create groups and change their members, and set the message lifetime.
- **PWA**: installable on iOS and Android ("Add to Home Screen"), runs standalone,
  and shows an offline screen.

Stack: Next.js 16 · Auth.js v5 credentials · Drizzle + Neon Postgres (free tier) ·
Tailwind v4 · WebCrypto.

## Setup

1. **Database.** Create a new free Neon project (keep it separate from the job
   helper's database) and copy its connection string.
2. **Env.** `cp .env.example .env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`) and `CRON_SECRET`.
3. **Migrate and create the admin.**

   ```bash
   pnpm --filter office db:migrate
   ```

   ```bash
   OFFICE_USERNAME=munubol OFFICE_DISPLAY_NAME="Mehmet Ünübol" OFFICE_PASSWORD='choose-one' pnpm --filter office user:upsert
   ```

   Run the same command again to recover a forgotten password. Everyone else is
   added from the in-app Admin screen.

4. **Run.** `pnpm --filter office dev` → http://localhost:3003

To use a plain local Postgres instead of Neon, set `DATABASE_DRIVER=pg`.

## Deploy (Vercel, subdomain)

1. New Vercel project from this repo, **Root Directory** `apps/office`.
2. Env vars (Production + Preview): `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`.
3. Settings → Domains → add `office.mehmetunubol.com` (a `CNAME` to
   `cname.vercel-dns.com` if DNS isn't on Vercel).
4. `vercel.json` registers a daily cleanup cron. Expired messages are also
   filtered out on every read and purged lazily, so the cron is only a backstop.

## How encryption works

All of it runs in the browser (`src/lib/crypto.ts`). The server stores only
public keys, password-encrypted private keys, and ciphertext.

- **Identity.** On first sign-in the browser creates an ECDH P-256 key pair. The
  private key is encrypted with AES-GCM under a key derived from the user's
  password (PBKDF2-SHA256, 600k iterations) and uploaded. A non-extractable copy is
  kept in IndexedDB. On a new device, the password unlocks the uploaded copy.
- **Messages.** Each message gets a random AES-256-GCM key. That key is wrapped
  for every member (sender included) with a key from HKDF(ECDH(sender,
  recipient)). The conversation id, sender id and message id are bound into the
  ciphertext as AAD, so the server can't move a message to another chat or change
  its sender.
- **Membership.** Only current members receive a wrapped key. People added to a
  group later can't read what was sent before they joined. People who are removed
  can't fetch anything new.
- **Password change** (by the user) re-encrypts the same private key, so history
  stays readable. **Admin reset** can't do that without the old password: the
  user gets a new key pair and loses access to messages sent to them before the
  reset. Both actions sign the user out on every other device.

**Limits, stated honestly:** the password reaches the server at sign-in (over
TLS, stored as bcrypt). An operator who could modify the server code could
capture it, or swap public keys. This protects against database leaks and casual
access, but not against a malicious server operator. Nobody else can read
messages, including through the Neon console.

## Limits worth knowing

- Updates arrive by polling (every 2.5 s in an open chat, 5 s on the home
  screen), and polling pauses while the app is in the background. There are no
  push notifications yet. That would need Web Push (VAPID keys) and is a natural
  next step.
- Presence is manual. An optional "auto-set In when I'm at the office" would
  need geolocation or office Wi-Fi detection.
