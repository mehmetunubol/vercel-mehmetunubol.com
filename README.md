# mehmetunubol.com

Personal website and multi-app monorepo, built with [Turborepo](https://turbo.build/repo) and [pnpm workspaces](https://pnpm.io/workspaces).

The repository hosts a personal website (the "shell") plus multiple independent
applications. Apps are functionally independent — they do not share state, auth,
or business logic. The only thing shared across apps is presentation: UI
components, design tokens, and the visual shell.

## Structure

```
.
├── apps/
│   └── web/            # Personal website / shell (Next.js App Router)
└── packages/
    ├── config/         # Shared tsconfig, ESLint config, Tailwind v4 preset
    └── ui/             # Presentational-only shared component library
```

- **`apps/*`** — one self-contained Next.js app per folder, with its own
  routing, local state, and data layer. Apps only import from `packages/ui`
  and `packages/config`; they never import from each other.
- **`packages/config`** — shared `tsconfig.base.json`, ESLint flat config, and
  a Tailwind CSS v4 CSS-first `@theme` preset (design tokens: colors + fonts).
- **`packages/ui`** — presentational component library (Button, Card, Shell,
  ThemeProvider). No data fetching, no global state, no app-specific copy.

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Monorepo       | Turborepo + pnpm workspaces             |
| Framework      | Next.js 16 (App Router, Turbopack)      |
| UI runtime     | React 19                                |
| Styling        | Tailwind CSS v4 (CSS-first `@theme`)    |
| Language       | TypeScript 6 (`strict`)                 |

> Core dependency versions track the current **latest stable** releases. Before
> scaffolding or upgrading, confirm with `npm view <package> version` rather
> than relying on cached defaults.

## Getting started

Requires Node.js `>= 22` and pnpm.

```bash
pnpm install       # install all workspace dependencies
pnpm dev           # run all apps in dev mode (Turborepo)
pnpm build         # build all apps and packages
pnpm lint          # lint the whole repo
pnpm typecheck     # type-check the whole repo
pnpm format        # format with Prettier
```

To work on a single app:

```bash
pnpm --filter web dev
```

## Deploying `apps/web` to Vercel

`apps/web` is a static-first Next.js app and deploys cleanly on Vercel with the
monorepo-aware zero-config path:

1. **Import the repo** into Vercel (New Project → import this Git repository).
2. **Set the Root Directory** to `apps/web`. Vercel auto-detects Next.js, pnpm
   workspaces, and Turborepo, installs dependencies from the workspace root, and
   builds with the correct Turborepo filter. No `vercel.json` is required.
3. **Add environment variables** (Production + Preview), see `apps/web/.env.example`:
   - `NEXT_PUBLIC_SITE_URL` — your canonical origin, e.g. `https://mehmetunubol.com`
     (drives metadata, canonical URLs, `sitemap.xml`, and `robots.txt`).
   - `GOOGLE_SITE_VERIFICATION` — optional Search Console token.
4. **Deploy**, then point your domain at the project in Vercel → Settings → Domains.

Node version is pinned via `.nvmrc` / `engines` (Node 22).

### Domain: `www` → apex

The canonical origin is the apex `https://mehmetunubol.com` (matches
`NEXT_PUBLIC_SITE_URL`, committed as a non-secret default in `apps/web/.env`).
Add **both** domains in Vercel → Settings → Domains and set `www.mehmetunubol.com`
to **redirect to the apex** (`mehmetunubol.com`) so there's a single canonical
host for SEO. Typical DNS:

- Apex `mehmetunubol.com` → **A** `76.76.21.21` (or ALIAS/ANAME → `cname.vercel-dns.com`)
- `www` → **CNAME** `cname.vercel-dns.com`

Vercel provisions SSL automatically once DNS resolves. Per-environment overrides
of `NEXT_PUBLIC_SITE_URL` (e.g. a staging domain) go in the Vercel dashboard;
local secrets go in `.env.local` (gitignored).

### SEO checklist after first deploy

- Confirm `https://<domain>/robots.txt` and `https://<domain>/sitemap.xml` resolve.
- Verify the domain in [Google Search Console](https://search.google.com/search-console)
  and submit the sitemap.
- Check the social preview (Open Graph / Twitter) — a branded card is generated
  at `/opengraph-image`.
- Structured data (schema.org `Person` + `WebSite`) is embedded as JSON-LD;
  validate it with the [Rich Results Test](https://search.google.com/test/rich-results).

## Adding a new app

1. Scaffold under `apps/<name>` with `npx create-next-app@latest` (latest stable).
2. Add `@repo/ui` and `@repo/config` as workspace dependencies.
3. Wire it into the pnpm workspace (already globbed via `apps/*`) and it will be
   picked up by the Turborepo pipelines automatically.
4. Decide its deployment strategy per-app (subpath of the main domain, or a
   standalone subdomain) — this is not a global decision.

Never import one app's code from another app, and keep business logic out of
`packages/ui`.
