# Local dev: web + job-application-helper + accounting-checklist + yt-note-agent together

Runs the monorepo apps and yt-note-agent with one command. Assumes
`mehmetunubol.com` and `yt-note-agent` are sibling folders on disk (e.g. both
under `~/workspace`) — the compose file references `yt-note-agent` via
`../../yt-note-agent`.

## Prerequisites

- Docker Desktop running.
- `apps/job-application-helper/.env.local` populated (`DATABASE_URL`,
  `AUTH_SECRET`, `PROFILE_API_SECRET`, `GEMINI_API_KEY`, `CRON_SECRET`,
  `APPS_WEB_URL`) — this compose file loads it via `env_file`, it does not
  create it.
- `apps/accounting-checklist/.env.local` populated (`AUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL`) — see that
  app's `.env.example`. Google OAuth redirect URI must be
  `http://localhost:3002/api/auth/callback/google`. This compose file loads
  the env file via `env_file`, it does not create it.
- `yt-note-agent/.env` populated with real secrets (`GEMINI_API_KEY`, `EMAIL`,
  `EMAIL_PASS`, etc.) — see that repo's `SETUP.md`. This compose file loads
  it via `env_file`, it does not create it.

## Run

```bash
cd docker
docker compose up --build
```

- Website: http://localhost:3000
- Job application helper: http://localhost:3001
- Accounting checklist: http://localhost:3002
- yt-note-agent tool UI: http://localhost:4000

First run installs pnpm deps inside the container (isolated from your host
`node_modules` via named volumes, since the container is Linux and your host
node_modules may be built for macOS) — expect it to take a minute before the
site is reachable. Subsequent runs are fast.

Publishing a post from the yt-note-agent UI writes straight into
`apps/web/content/blog` on your host (bind-mounted into the yt-note-agent
container at `/blog-content`), so it shows up on the running site without
any extra step.

## Stop

```bash
docker compose down
```

Add `-v` to also drop the node_modules volumes (forces a clean reinstall next
time).
