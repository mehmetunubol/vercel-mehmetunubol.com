# Office

`office.mehmetunubol.com`: a small installable app for a fixed group of people,
disguised as **Day Planner** (see "Getting in").

- **Status bar**: everyone flips themselves _In_ or _Out_ of the office. The
  home screen lists who's in and who's out, and the admin's status is pinned at
  the top.
- **Online status** (separate from In / Out of the office): someone is
  _Online_ while they have the app open and on screen, shown as a blue ring
  around their avatar. Otherwise others see the exact time they were last
  active ("Last seen 14:05", "Last seen yesterday 09:07"). Leaving the app
  marks you offline within a second or two. Chats show "typing…".
  Account → Privacy → _Show when I'm online_ hides your status and typing.
  It's reciprocal: you then don't see anyone else's either, admin included.
  Notifications are skipped while you're online, since you're already looking.
- **Scheduled status**: set when you'll be back or leave ("in 2 h", "today at
  15:00", "Wed 25 Nov, morning"). Morning, afternoon and evening start at 09:00,
  13:00 and 18:00. The status flips automatically when the time arrives, and a
  manual change cancels the plan.
- **Messages**: end-to-end encrypted private chats (anyone ↔ anyone) and group
  chats (created and managed by the admin only). Messages are deleted after a
  configurable number of hours.
  - **Announcement groups**: only the admin can post (enforced by the server).
    Members read and react.
  - **Read receipts**: "Sent / Read" in private chats, "Read by N of M" in
    groups. Tap your own message to see who has and hasn't read it. Members who
    joined after a message was sent aren't counted, and a device whose key is
    locked doesn't mark anything as read.
  - **Replies, edits and deletes**: tap a message to reply (the quote is
    shown from each device's own decrypted copy). Your own messages can be
    edited, re-encrypted on your device and marked "edited", or deleted for
    everyone.
  - **Photos**: the phone shrinks each photo, strips its hidden data (GPS
    location, camera details), and encrypts it with its own key, which travels
    inside the encrypted message. The server only stores the encrypted bytes.
    - _One-time photos_ (always available): each recipient can open one once,
      viewing it only while holding a finger on it, for 5 seconds in total.
      It's drawn so there's no "Save image" option, and it closes if you leave
      the app. The sender can't reopen it and sees "Opened" / "Opened by N".
      The server erases the photo once every recipient has opened it, or when
      the message expires. Screenshots can't be blocked by any web app (or any
      app on iPhone).
    - _One-time voice notes and videos_ (up to 5 seconds, recorded in the app):
      same rules as one-time photos; they play while held and close when they
      end.
    - _Ordinary photos_ stay in the chat until the message expires. Admin →
      Messages → "Allow ordinary photos" turns them on (off by default).
  - **Chat details** (tap the chat's name): how long messages last in this
    chat (default, 1 hour, 8 hours, 1 day, 1 week). Either person can change
    it in a private chat; only the admin can for groups. **Mute** a chat for 8
    hours, a week or always: no notifications from it, just for you.
  - **Reactions**: 👍 / 👎 on received messages, one per person per message.
- **Events**: anyone can plan an event with a title, a date and start time,
  an estimated duration and an optional description (up to 500 characters),
  and invite people. Invitees answer Going / Maybe / Can't go and see who else
  is coming. Only the creator and invitees can see an event. The creator can
  edit it, change invitees or cancel it. Changing the time asks everyone to
  answer again. The Events tab has a month calendar (dots mark days with
  events) and shows a badge for unanswered invitations. Events are removed 7
  days after they end.
- **Admin** (`user` only): add, rename and remove people, reset passwords,
  create groups and change their members, and set the message lifetime.
- **Quick hide and auto-lock**: the eye button (tab bar and chat header), or
  Esc twice on a computer, signs out at once and shows the Day Planner.
  The app also locks itself after 1 / 5 (default) / 15 / 30 idle minutes,
  chosen under Account. Time in the background counts as idle.
- **Guessing limit**: after 20 failed sign-ins within 15 minutes from one
  network address, that address gets the ordinary "locked" message for the rest
  of the window, whatever username it tries. The admin gets an alert naming the
  address, with "Unblock". (People on one office network share an address,
  which is why the limit is generous. `SIGNIN_IP_LIMIT` overrides it.)
- **Security alerts**: when any account is locked after 5 wrong passwords, the
  admin gets a banner, an Admin-tab badge, a nudge (below) and an entry under
  Admin → Security, with "Unlock now".
- **Panic buttons** (Admin → Emergency): _Delete all messages now_, _Delete all events now_, and
  _Disable sign-ins_, which signs everyone but the admin out and blocks
  sign-in. Blocked users see the ordinary "account locked, try again in 15
  minutes" message.
- **Activity log** (Admin → Activity): every admin action with its time:
  people added, renamed, reset, unlocked or removed, group and setting
  changes, and each panic button. Kept for 90 days.
- **Notifications**: optional per device (Account → Notifications). They are
  deliberately content-free: the server sends an empty push, and the phone
  shows a random everyday line ("Reminder: Your weekly summary is ready").
  Nothing about the app, the sender or the content is sent. Triggers: a new
  message, a new or rescheduled event invitation, and (admin) a lockout. At
  most one per device per minute. On iPhone they need the app on the Home
  Screen (iOS 16.4+). The phone still shows the installed app's name, and on
  Android browsers the web address, in the notification header.
- **PWA**: installable on iOS and Android ("Add to Home Screen"), runs standalone,
  and shows an offline screen.

## Getting in

To anyone who isn't signed in, the app is **"Day Planner"**: that's its
installed name, its checklist icon, the browser tab title and the name shown on
notifications. Every address (including `/login`) shows a small, working
to-do list. Its items are kept only in that browser and never sent to the
server. To sign in, **tap the date at the top three times quickly**. Taps more
than 0.8 s apart start the count again.

Sessions end when you close the browser, the tab or the installed app. You
then land on the planner again and must sign in again. A new tab also needs its
own sign-in. Sessions also expire after 12 hours.

This hides the app from casual visitors. It is not the security boundary:
that's still the password, the lockout and the encryption.

Stack: Next.js 16 · Auth.js v5 credentials · Drizzle + Neon Postgres (free tier) ·
Tailwind v4 · WebCrypto.

## Setup

1. **Database.** Create a new free Neon project (keep it separate from the job
   helper's database) and copy its connection string.
2. **Env.** `cp .env.example .env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`) and `CRON_SECRET`. For notifications, also
   `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from `npx web-push generate-vapid-keys`.
3. **Migrate and create the admin.**

   ```bash
   pnpm --filter office db:migrate
   ```

   ```bash
   OFFICE_USERNAME=user OFFICE_DISPLAY_NAME="Mehmet Ünübol" OFFICE_PASSWORD='choose-one' pnpm --filter office user:upsert
   ```

   Run the same command again to recover a forgotten password. Everyone else is
   added from the in-app Admin screen.

4. **Run.** `pnpm --filter office dev` → http://localhost:3003

To use a plain local Postgres instead of Neon, set `DATABASE_DRIVER=pg`.

## Tests

Every push and pull request touching the app runs type checks, lint, unit tests
and all browser suites on GitHub (`.github/workflows/office.yml`).

- Unit tests: `pnpm --filter office test`
- Browser tests (needs a local Postgres): see [`e2e/README.md`](e2e/README.md)

## Deploy (Vercel, subdomain)

1. New Vercel project from this repo, **Root Directory** `apps/office`.
2. Env vars (Production + Preview): `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`,
   and for notifications `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (optionally
   `VAPID_SUBJECT`, a `mailto:` contact only the push service sees).
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

Not encrypted: status and scheduled changes, online / last seen and typing, read times, reactions, and events (title, description, time, invitees and answers), and which photos were opened by whom (who
reacted 👍/👎 to which message id). These are metadata the app needs to show
everyone; message text stays encrypted.

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
