# Release: redesigned homepage + PV simulation

Branch `claude/solar-check-integration-8b2cd3`. Not merged, not deployed.
Baseline before the change: `docs/seo/baseline-2026-09-18-startseite-simulation/`
(production HTML of both pages, Search Console queries 28/56 days, production
revision in `produktions-revision.txt`).

## Search Console baseline (2026-08-18 … 2026-09-15, 28 days)

| Page | Impressions | Clicks | Avg. position |
|---|---|---|---|
| `/` | 328 | 23 | 20.4 |
| `/pv-simulation` | 176 | 3 | 25.0 |

Top queries `/`: solarcheck, solardach check ibbenbüren, solar check, photovoltaik check.
Top queries `/pv-simulation`: pv simulation, simulation solaranlage, pv-simulation,
photovoltaik simulation, pv simulation tagesverlauf.

## Unchanged (measured against production HTML)

Title, meta description, canonical, robots (none = indexable), JSON-LD types
(FAQPage with 4 questions, Organization, SoftwareApplication, Offer), all
internal link targets of both pages (none removed; added: /ueber,
/ratgeber/gasheizung-oder-waermepumpe, /ratgeber/waermepumpe-foerderung).
Global header/footer of every other page unchanged.

## Deliberate content changes

Homepage
- h1 "Energie ehrlich berechnet." → "Da oben steckt mehr für dich drin." (desktop)
  / "Dein Dach. Deine Energie." (phone; both in the HTML).
- Solar-Atlas Germany map (MastrHeroSection) removed; replaced by town stories
  with a link to the Solar-Atlas.
- Trust badge "Keine Anmeldung nötig · Keine Werbung · …" removed (the
  "keine Werbung" claim was no longer true since the affiliate block).
- Eight equal tool cards → four illustrated cards plus a link row for the rest.

Simulation
- New entry: ten-year retrospective (2016–2025) per postcode.
- The live output stays on the page below it; title/description ("live")
  therefore remain true.
- h1 added ("PV-Simulation"); production had none in its server HTML.

Excluded until decided: waitlist "Angebotscheck" (collects e-mail
addresses), "Für Fachbetriebe/Kommunen/Versorger" block (outward offers),
hero chart carousel.

## Dependencies before release

1. Weather branch (`claude/dwd-live-weather`) on main — provides
   `/api/weather-now`. Until then the hero says "weather not available" and
   the browser logs a 404 (the site walk test fails on it).
2. Retrospective data: table `solar_rueckblick` (`/api/solar-rueckblick/setup`)
   filled by the preparation run over the ERA5 archive 2016–2025. Without it
   every postcode shows "noch nicht verfügbar".
3. Council on the retrospective model and its wording.

## Rollback

The release is one merge commit on main. Rollback = `git revert -m 1 <merge sha>`
and push, or in Vercel "Instant Rollback" to the deployment of
`produktions-revision.txt`. No URL, redirect or data migration is involved, so
both are complete rollbacks. The new table and routes are additive and can
stay.

## Checks

Done on the integrated local version (dev server, headless Chromium):
desktop 1440, 708, 393, 320 px; no horizontal overflow (after fix at 320);
postcode Enter, unknown postcode, geolocation denied/granted, postcode kept
after reload, place edit returns to the form; story strip → reader of the
same town, Escape, focus in/out; WebGL disabled + reduced motion (static
fallback); console clean except the expected weather 404.

Not done / needs a person: real Safari on an iPhone 15 Pro (only emulated
here); throttled mobile performance on the production build; night and rain
look of the stage with real weather (needs the weather branch).
