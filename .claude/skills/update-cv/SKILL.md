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

There are two sources, kept in sync by hand (since 2026-11):

- **Downloadable CV** (`apps/web/public/MehmetUnubol_CV.pdf` / `.docx`, linked
  from the homepage "Download CV" button): exported from the Google Doc
  "Mehmet_Unubol_CV_2026 (public, no phone)" in Mehmet's Google Drive, a copy
  of his main CV "Mehmet_Unubol_CV_2026 (working copy)" with the phone number
  removed. When the main CV changes, re-copy it (Drive `copy_file`), strip the
  phone line (Docs `update_doc` replaceAllText), then export PDF and DOCX
  (Drive `download_file_content` with `exportMimeType`) over the two files in
  `public/`. Check the exports with `pdftotext` that no phone number remains.
- **Website content**: `apps/web/src/lib/site.ts`. When the CV changes,
  update `site.ts` to match it.

`pnpm generate:cv` still builds a CV from `site.ts`, but only into
`apps/web/.cv-generated/` (gitignored) as a preview. It must never write to
`public/` again, or it would replace Mehmet's real CV.

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
3. If the CV itself changed, re-export the Google Doc to
   `public/MehmetUnubol_CV.pdf` and `.docx` (see Purpose). The homepage button
   already links to `/MehmetUnubol_CV.pdf`.
4. Sanity-check: read the PDF in `public/` back (Read tool handles PDFs) and
   compare it with `site.ts` (roles, dates, skills, projects).
5. Run `pnpm build` in `apps/web` to confirm nothing broke.

## Known gotchas (do not reintroduce)

- (The next two apply only to the preview generator.)
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

- Don't hand-edit or regenerate `public/MehmetUnubol_CV.docx` or `.pdf` —
  they are exports of Mehmet's Google Doc. Change the doc, then re-export.
- Never publish the CV with the phone number (scam/spam risk). Keep it out
  of `public/` and out of `site.ts`.
- Don't add data that isn't true of the actual CV/background — if unsure
  whether something belongs (e.g. a skill, a date range), ask rather than
  guess.
