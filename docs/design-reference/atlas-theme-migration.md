# Atlas theme migration — 15 September 2026

The active local preview is `/atlas-design-preview/index.html`.
The complete preceding asset snapshot is `/atlas-design-archive/2026-09-15/index.html`.
All archived local asset paths point to the archive; its page does not load the new theme.

Current theme source: the latest local `solar-hero-handoff/homepage-study/homepage.css`
and `design-lab/homepage-experiments.css`. Dark background #08191c, card #163338,
text #e8eee9, secondary #a7bcbb, lime #d4ff24, pill actions in Montserrat.
The weather illustration retains its contextual contrast. Story visual themes remain independent.
`current-theme.css` adapts the existing Atlas selectors; the story iframe receives the matching
page theme through its explicit `theme` parameter. No production release.

Footer and trust now load through `/api/admin/design-shared/` from the same
shared-footer source used by the homepage. The bridge is admin-only and development-only,
with an explicit asset allowlist and no cache. The Atlas no longer loads its old footer bundle.
The archive remains on its independent snapshot. This is a local prototype connection,
not a production shared-component migration.

Header navigation also loads `shared-nav/nav.js` and `nav.css` through the same bridge.
Atlas mount options only select the active Atlas link; content and behavior come from the homepage source.

## Shared navigation and offer waitlist — 16 September 2026

The source remains `solar-hero-handoff/shared-nav/nav.{js,css}`. Changes are shared
with the homepage: 12px chevrons, 20px burger/close, no current-page underline,
no separator below the last group, descriptive calculator names and a separate
“Angebot prüfen” waitlist action. The former contact link has been removed.

The form posts to `/api/warteliste/anmelden`. Local previews do not send mail.
Before release, apply `sql/2026-09-offer-waitlist.sql`, verify SMTP and the public
base URL, then set `OFFER_WAITLIST_ENABLED=true`. Do not point a preview at the
production endpoint. Confirmation requires a POST after opening the email link;
mail-link scanners cannot confirm or delete records. The database serializes
reservations, limits each address to one confirmation mail per day, and caps new
reservations at 100 per day across instances. Confirmed entries receive no repeat
confirmation. Honeypot, minimum form time and per-origin checks supplement this.
Unconfirmed entries expire after 48 hours and are purged on a later reservation
after another seven days. Launch notifications are a separate release step.

## Desktop calculator menu and hero celebration — 16 September 2026

“Angebot prüfen” is the second navigation item; its subline is mobile-only.
The waitlist explains that the check covers photovoltaic and heat-pump offers.
The calculator dropdown reuses the homepage house, balcony and heat-pump WebP
illustrations through the shared-source bridge (no copied image variant).
Photovoltaic planning/calculation are grouped in one teaser. At desktop width,
the dropdown spans the header content edges; at <=1280px navigation collapses.
Browser checked at 1440px and 390px, including dialog transition and image loads.

The Atlas hero ranking tile emits a one-shot confetti burst from its own position
when at least 60% visible. Particles are non-interactive, removed after animation,
and disabled by reduced-motion preference. The archived design is untouched.

## Final menu source corrections — 16 September 2026

The menu is boxed (12px outer margin, 20px corners) including its own header.
All five calculator cards form one continuous column, with concrete task titles.
There is no separate “Weitere Rechner” heading.

The monochrome logo is the existing calculator-result palette and original
geometry, now exposed as `Logo variant="result"`. Export for static consumers:
`node --import tsx scripts/design/export-result-logo.tsx` produces
`public/brand/logo-result.svg`; shared-nav serves that generated SVG rather than
flattening paths or removing its gradient. Its source palette was verified with
the heat-pump result session against result-design.css.

The illustration session delivered `solar-check-menu-neon-v1/web` (in the exchange
folder). The five compact transparent WebPs are centrally stored in
shared-nav/illustrations and loaded by both prototype consumers. House, balcony
and heat pump are exports from the existing Neon layers; feed-in and aircon are
new additions for user review. No original fallback image or substitute icon
remains. All five image loads and the boxed mobile view were checked in browser.

## 2026-09-16: Current weather day and scene loading
- Added `/api/atlas/solar-day`: local Berlin day, 15-minute instantaneous radiation, shared power model, null/gap/staleness guards, 5-minute upstream cache. Past hours remain model estimates; future hours are a forecast, never meter readings.
- Scene and hero cards share the immediate weather request for Höchberg. Replaced the synthetic radial sine profile with weather-driven values and a current-time marker. Failed requests show an explicit error.
- Adapted reviewed homepage scene through `scripts/design/update-atlas-scene.mjs`: static initial hero markup, extracted font/image assets, split renderer loaded after two frames, cooperative tree generation and night-only moon texture inherited from current source. No homepage navigation or content imported.
- Verified: real route HTTP 200 with 96 points for 2026-09-16, 4 solar-day tests pass, JavaScript syntax passes. HTML now 83,434 bytes / 18,196 gzip. These are payload sizes, not measured browser speed.
- Outstanding: rendered desktop/mobile regression check. Browser approval first timed out, then browser connection disappeared. Full TypeScript check passes after correcting the postcode coordinate type. Local preview server restarted on its existing port 4190; no merge/push/release.
