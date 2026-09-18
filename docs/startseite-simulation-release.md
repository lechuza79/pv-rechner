# Release: redesigned homepage + PV simulation (new design)

Branch `claude/solar-check-integration-8b2cd3` (pushed). Not merged, not deployed.
Baseline before the change: `docs/seo/baseline-2026-09-18-startseite-simulation/`
(production HTML of both pages, Search Console queries 28/56 days, production
revision in `produktions-revision.txt`).

## How the pages are built

- `/` and `/pv-simulation` are route handlers serving the design package's
  documents one to one (`app/_neon/*.html`, filled by `lib/neon-seite.ts`).
  The React versions were removed; the rebuild was rejected (18.09.).
- Built scene bundles and their assets come from the design package via
  `node scripts/startseite-uebernehmen.mjs <package>`; every patch must hit,
  and the run aborts if a preview link (`Solar-Check-Dynamisch`, `homepage=1`,
  `rechner-uebersicht`, localhost) survives.
- **Repo-owned since 18.09.:** menu (`public/shared-nav`), footer, person card
  and every hand-written stylesheet. The takeover refuses to copy them. Codex
  edits them in the repo on a branch off this one.
- Plain pages in the new design use `lib/neon-unterseite.ts` (the package's
  own template: shared nav, breadcrumb, simple footer, overview.css):
  `/angebot-pruefen` (offer-check waitlist, noindex), `/warteliste/bestaetigen`,
  `/warteliste/abmelden`.
- All other pages are still in the old design. Their migration is the next
  block after this release, area by area.

## Search Console baseline (2026-08-18 … 2026-09-15, 28 days)

| Page | Impressions | Clicks | Avg. position |
|---|---|---|---|
| `/` | 328 | 23 | 20.4 |
| `/pv-simulation` | 176 | 3 | 25.0 |

## Unchanged (SEO)

Title, description, canonical, keywords, social cards, icons, site
verification and JSON-LD of both pages are ours, set in the document head.
The package's script used to overwrite `document.title` at runtime; patched
to the same SEO titles. Server HTML carries hero, intro, FAQ (above the
footer) and on the simulation the live output section; the other homepage
sections (tools, stories, guides, footer) are script-built — crawlers without
JavaScript do not see them (follow-up after launch: server-rendered snapshot).

## Deliberate content changes

- New hero, sections and footer as approved in the design package.
- Simulation starts with the ten-year retrospective 2016–2025 (precomputed per
  postcode, table `solar_rueckblick`, 8,298/8,298 postcodes written 18.09.).
  Headline says "gebracht", not "gespart" (feed-in is 53–78 % of the amount).
  The live output stays below it, so the title's "live" remains true.
- Weather credit: DWD (own snapshots), not Open-Meteo.
- Menu "Angebot prüfen" leads to `/angebot-pruefen` (waitlist, double opt-in,
  table `warteliste`, privacy policy section 17). "Weitere Rechner" leads to
  the homepage's calculator section (no overview page yet).

## Data and deadlines

- `/scene-data`, `/simulation-retrospective`, `/homepage-energy` serve the
  package's data calls from our sources.
- The retrospective window moves once a year (runbook
  `scripts/solar-rueckblick-verify.md`, deadline in `lib/pruefstand.ts`,
  reported by the health check).

## Before the go

1. Codex's menu/design changes merged from his branch.
2. Legal review of privacy section 17 (running).
3. Production build + throttled mobile performance on the final state.
4. Operator: acceptance in the browser, real Safari on iPhone 15 Pro, one real
   waitlist signup on production after deploy.

## Rollback

The release is one merge commit on main. Rollback = `git revert -m 1 <merge sha>`
and push, or Vercel "Instant Rollback" to the deployment of
`produktions-revision.txt`. No URL, redirect or data migration is involved;
the new tables (`solar_rueckblick`, `warteliste`) and routes are additive and
can stay. After a rollback `/angebot-pruefen` disappears; waitlist entries stay
in the table and the daily cleanup keeps its promises.
