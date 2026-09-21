# Municipality design workspace

Local continuation of the Atlas reference, captured on 2026-09-17.

- Owner workspace: `/Users/eule/.codex/worktrees/8baa/pv-rechner`
- Branch: `codex/kommunenseite-design`
- Source workspace: `/Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates` (read-only).
- Reference server: port 4190 (owned by the story session; do not stop).
- Own preview: http://localhost:4196/atlas-design-preview/index.html?displayfont=montserrat-bold
- Start from this workspace: `node --import tsx scripts/municipality-preview/server.ts`
- Server listens on loopback only. No env files or credentials were copied.

## Snapshot and boundaries

The complete public Atlas preview, hero, fonts, brand/design assets, shared navigation/footer/trust sources, and 90 recursively resolved story/weather source and data files were copied. Imported application dependencies are isolated under `reference/`; the current application files remain unchanged. Source fingerprints are recorded in `source-manifest.json`. Shared design source comes from the existing `solar-hero-handoff` directory; it is not redesigned here.

The preview adapter serves the unchanged story iframe URL and directly bundles the existing MunicipalStoryPreview and chart components. Its selection uses the exact current source preview selection for Höchberg. Complete source discovery reports remain local; only Höchberg's four selected stories enter the browser bundle. The embed base styles are generated from the captured source layout and shared theme tokens. The original weather route runs locally. Existing production widget embeds and external links retain their original destinations.

The adapter is a local development aid, not a production route or authentication change. There is no production deployment, merge, or new page design in this setup. Future edits belong to page composition in `public/atlas-design-preview`; story data, selection, charts, and shared components remain coordinated with the source session.

## Verified

- Desktop and 390 × 844 mobile rendering in the browser.
- Current dark/neon theme and Montserrat headings.
- Header, shared trust section and footer present.
- Live weather model loaded through the copied weather route.
- Story teaser opens a detail modal on desktop and mobile; closing restores page scrolling.
- Mobile document width equals viewport width (390 px).

## Existing findings to retain

- The owning story session fixed the ranking/radial renderer selection. Its updated component and existing charts were imported and verified in the browser: Höchberg displays rank 13 of 500 for batteries per 100 private rooftop installations, with the correct ranking detail view.
- The reference contains mixed data dates (August page figures, September stories), existing example calculations, and an old-design production widget. This is a design snapshot, not a content/data approval.
- Browser console recorded one MutationObserver initialization error. Main preview, navigation, trust section and story interaction rendered; source cause has not yet been isolated.
- Bundler warns about overlapping composed styles in the existing chart CSS; no shared styles changed.

Keep this workspace and its server available for the explicitly requested continuing design session. Do not merge or deploy before visual acceptance. Stop the owned server before eventual workspace removal.

## Shared hero update (2026-09-17)

The obsolete copied scene bundle is no longer loaded. `public/hero-system` contains the extracted common scene; municipality layout/data is configured separately. See `scripts/hero-system/README.md` for lifecycle and tests. The first-view no longer includes photographic PV modules, and the existing pause button is reachable. Source files remain local until visual acceptance.

## Live shared shell (2026-09-17)

Navigation, header, footer, trust assets and person component are now served read-only from `SOLAR_SHARED_ROOT` (default: the canonical `solar-hero-handoff` directory in the shared ChatGPT project). Old copies under `shared/` are historical snapshots and no longer used by the server. The municipality-specific person mount stays local.

Both the homepage and municipality load `shared-nav/header.css` and `header-boot.js` synchronously in the head, after host styles, with `data-sc-shell` present in the initial HTML. This owns the final logo palette, day/night contrast, mobile header dimensions and bounded font reveal. Hosts keep their server-rendered logo geometry and content. No late replacement of the logo is needed. The homepage owner removed its duplicate overrides and confirmed the shared source in its browser.

Verified: desktop 166 px logo and correct dark wordmark, mobile 155 px logo with 18/24 px padding, menu open/close with login/contact, no horizontal overflow at 390 px, no browser errors in the refreshed page. `node --test scripts/municipality-preview/header.test.mjs` covers delayed, failed and stalled fonts; all pass. Previous MutationObserver error was not reproduced in this refresh.

## Canonical story template bridge (2026-09-17)

The local server now reads story selection/copy/theme directly from `STORY_SOURCE_ROOT` and bundles `MunicipalStoryPreview` with all its TSX/CSS dependencies from that same source. The default is `/Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates`, coordinated with its owner. `reference/components` is no longer used by the story bundle. `build/story-sources.json` records the resolved build inputs, including `story-radial-viewbox.ts`. Central `story-copy.ts` and `story-energy-year.ts` are resolved through the canonical finding adapter during preparation.

This is a temporary local bridge, not a deployable cross-worktree dependency. Before a regular build, the components must be present in the shared repository revision. Coordinate before deleting either worktree. Restart the local server to pick up subsequent source edits. No production auth or routes were changed.

Verified current Höchberg preview: four stories, first donut shows 9.3 MWp without the old installed label; mobile chart area is square (278 × 278 px), 16 px corner radius, detail modal opens/closes on desktop and mobile, parent scrolling restored, no mobile horizontal overflow. The new radial components are bundled from source; Höchberg's current selected four stories do not render annual/monthly radials. Existing CSS composition warnings remain upstream. Municipality light ranking panel and its controls were preserved.
