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

## Adding a new app

1. Scaffold under `apps/<name>` with `npx create-next-app@latest` (latest stable).
2. Add `@repo/ui` and `@repo/config` as workspace dependencies.
3. Wire it into the pnpm workspace (already globbed via `apps/*`) and it will be
   picked up by the Turborepo pipelines automatically.
4. Decide its deployment strategy per-app (subpath of the main domain, or a
   standalone subdomain) — this is not a global decision.

Never import one app's code from another app, and keep business logic out of
`packages/ui`.
