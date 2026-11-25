@AGENTS.md

# web — quick context

Personal site/blog (mehmetunubol.com). Next.js 16 App Router, Tailwind 4.

## Standing rules
- Same repo, separate Vercel project from job-application-helper (two
  projects, one monorepo — confirmed safe for auto-deploy).
- Don't deploy/push without being asked.
- `src/lib/site.ts` is the single source of truth for CV/profile content
  (name, experience, projects list, etc.) — `/api/profile/route.ts` serves
  a subset of it as JSON, gated by `PROFILE_API_SECRET` header (defense in
  depth, not real access control — everything returned is already public).
  job-application-helper's profile-fetch feature is the consumer.
- Cloudflare Bot Fight Mode has blocked server-to-server fetches to this
  API before (403 before even reaching the app) — if debugging a
  mysterious 403 from another service calling this domain, check
  Cloudflare WAF settings before assuming an app bug.
- `PROFILE_API_SECRET` must match between this app's Vercel env and
  whatever service calls `/api/profile` — a missing/mismatched value here
  is a silent 401, not an error in the caller.
- Fonts are IBM Plex Sans/Mono (`layout.tsx`, CSS vars `--font-sans-app`/
  `--font-mono-app`), not the Next.js default Geist pairing.
- Accent color is two-hue by design: `--color-accent` (warm amber, primary
  interactive elements) + `--color-accent-2` (cool blue, used sparingly —
  e.g. "Recently shipped" link, active-skill tags) — see
  `globals.css`. Don't collapse back to a single hue.
- Card treatment is intentionally two-tier: `.glass`/`glow-ring` for
  "showcase" content (Experience timeline, Projects, featured blog post);
  plain `border-border bg-surface` for reference/listing content (Skills
  groups, Education/Certifications, Contact panel, blog post-listing
  cards, disclosure banners). Don't default new content to `.glass`.

## Analytics
- Vercel Web Analytics + Speed Insights (`<Analytics />`, `<SpeedInsights />`
  in `layout.tsx`). Vercel project is on the free Hobby plan by choice: no
  custom events (`track()` is Pro-only) and no paid analytics tools.

## WebGL background (homepage + blog index)
- `src/components/wireframe-scene.tsx` — a single persistent Three.js/
  React Three Fiber scene: a morphing wireframe "brain" solid (icosahedron
  + noise displacement + central fissure), bright synapse dots at random
  vertices, and short electric-signal line segments that fire between
  randomly-changing synapse pairs. `Formation` is a plain `string` — any
  section/category id works; `profileForKey()` deterministically hashes
  the key into an amplitude/frequency/scale/rotation "personality," so new
  formations (e.g. a new blog category) need no manual tuning.
- `src/components/site-background.tsx` — gated, page-level wrapper.
  Takes `sectionIds: readonly string[]` + `children`; tracks which id is
  in view via `IntersectionObserver` (same pattern as `SiteHeader`'s nav
  active-state) and passes it down as the active formation. Wraps
  `children` in `relative z-10` so content stacks above the `fixed`
  canvas.
- `src/hooks/use-can-render-webgl.ts` — gates the scene off (renders
  `null`, zero JS cost) on narrow viewports (<768px), `prefers-reduced-
  motion`, or no WebGL support. Uses `useSyncExternalStore`; the `resize`
  listener is debounced 200ms — do not remove the debounce, an
  un-debounced listener causes visible flicker (canvas mount/unmount)
  during a live window drag.
- **Any page that mounts `<SiteBackground>` must pass `bg-transparent` to
  its `<Shell>`** (e.g. `<Shell className="bg-transparent" ...>`). `Shell`
  (`packages/ui`) has its own opaque `bg-background` by default; if it
  isn't overridden, it paints over the WebGL canvas as one solid layer and
  the scene becomes invisible even though it's rendering correctly
  underneath — this bit us twice (homepage, then blog) before landing
  here as a standing rule.
- Currently wired up: homepage (`page.tsx`, `sectionIds` = the 5 section
  ids) and `/blog` index (`sectionIds` = category ids, each category
  rendered as a real `<section id={category}>` so scrolling past it
  morphs the shape).
- `src/components/background-scene.tsx` (an earlier node-network variant,
  before the wireframe-brain direction was picked) is orphaned — nothing
  imports it. Kept for now as a reference; safe to delete.
- Global CSS backdrop (`body::before` grid, `body::after` glow blobs) was
  removed from `globals.css` — it visually competed with the WebGL scene
  and read as a distracting rectangular pattern once the canvas was added.
  Don't re-add a competing CSS backdrop layer; the WebGL scene is the
  site's sole ambient background now.

## Blog content
- Posts under `content/blog/*/*.json` are AI-generated summaries of other
  people's YouTube videos (via the `yt-note-agent` pipeline, a separate
  project in this workspace), not hand-written — the blog index and each
  post page both carry an explicit disclosure about this. Don't remove
  the disclosure or present these as originally-authored posts.

## Known open items
- None outstanding as of 2026-08-12.
