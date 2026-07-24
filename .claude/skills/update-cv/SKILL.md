---
name: update-cv
description: >
  Update Mehmet Ünübol's CV content (experience, skills, projects, certifications,
  availability) and keep the website and downloadable CV files in lockstep.
  Trigger: user asks to update the CV, add/change experience or skills, mark
  something as "active", or regenerate the CV docx/pdf.
---

# Update CV

## Purpose

`apps/web/src/lib/site.ts` is the single source of truth for both the website
content (homepage, skills, experience, projects) and the downloadable CV
(`public/MehmetUnubol_CV.docx` / `.pdf`, generated from that same file). Never
edit the CV files directly — they get overwritten by the generator. Any CV
update is really a `site.ts` update followed by regeneration.

## Process

1. Edit `apps/web/src/lib/site.ts`:
   - New/changed job → update or add an entry in `site.experience` (`company`,
     `role`, `period`, `location`, `summary`, `highlights`, `tech`).
   - New skill in active use → add to `site.activeSkills` (drives the accent
     highlight + hover tooltip on the homepage Skills section) **and** add it
     to the relevant `site.skillGroups` entry if it isn't listed as a tag yet.
   - "X is used at [company]" → add `X` to that experience entry's `tech`
     array (drives the hover-tooltip usage reference automatically via
     `lib/skill-usage.ts` — no separate data to maintain).
   - New project → add to `site.projects`.
   - New cert → add to `site.certifications`.
   - Keep `site.resumeTitle` and `site.summary` in sync with how the CV
     should read; these feed the generated CV header/summary directly.
2. Typecheck: `cd apps/web && pnpm typecheck` (or `npx tsc --noEmit`).
3. Regenerate the CV files: `cd apps/web && pnpm generate:cv`. This overwrites
   `public/MehmetUnubol_CV.docx` and `public/MehmetUnubol_CV.pdf` from the
   current `site.ts` — the homepage "Download CV" button already links to
   `/MehmetUnubol_CV.pdf`, so no other wiring is needed.
4. Sanity-check the output: read the generated PDF back (Read tool handles
   PDFs) and confirm the new/changed content appears correctly, especially
   Turkish characters (İzmir, Türkiye, Ünübol) if experience locations were
   touched.
5. Run `pnpm build` in `apps/web` to confirm nothing broke.

## Known gotchas (do not reintroduce)

- **Turkish characters**: `scripts/generate-cv.ts` embeds `dejavu-fonts-ttf`
  (`DejaVuSans.ttf/-Bold/-Oblique`) instead of pdfkit's default Helvetica,
  because Helvetica's WinAnsi encoding mangles İ/ı/ü/ş/ğ/ç. If you touch font
  registration, keep this.
- **Ligature bug**: DejaVu Sans's "fi"/"fl" ligature glyphs break the PDF's
  text layer (copy-paste, ATS parsers) even though they render correctly
  visually — e.g. "first" extracts as "frst". The generator disables ligature
  shaping via a `doc.text` wrapper passing `features: ["-liga", "-rlig"]`.
  Don't remove that wrapper. If you ever swap PDF libraries, re-verify this
  with an independent extractor (e.g. `pdf-parse`), not just a visual read —
  the visual render can look fine while the text layer is still broken.
- **Filenames**: output is `MehmetUnubol_CV.docx`/`.pdf` (no space/diacritics,
  for clean URLs). If you rename, update the `href` in the homepage's
  Download CV button (`apps/web/src/app/page.tsx`) to match.
- **No phone number on the website** — the CV itself may have one, but it was
  a deliberate decision to keep it off the public site (spam-bot scraping
  risk). Don't add it to `site.ts`.
- **Skill matching**: `lib/skill-usage.ts` tokenizes labels (splits on
  whitespace/slash/comma, strips punctuation except `+`/`.`) before matching
  — this was fixed once after "Java" false-matched inside "JavaScript /
  TypeScript" via naive substring matching. If you touch that file, keep it
  token-based, not substring-based.

## Boundaries

- Don't hand-edit `public/MehmetUnubol_CV.docx` or `.pdf` — always go through
  `site.ts` + `pnpm generate:cv`, or the next regeneration silently discards
  the edit.
- Don't add data that isn't true of the actual CV/background — if unsure
  whether something belongs (e.g. a skill, a date range), ask rather than
  guess.
