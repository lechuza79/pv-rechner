# Shared district pages

Status: visually accepted; release authorized on 25 September 2026. Production verification is required before reporting the deployment complete.
Canonical route: `/solar-atlas/bayern/landkreis-wuerzburg`. Both preview variants permanently redirect here. The operator authorized all districts on 25 September 2026; country/state pages remain unchanged.

## Scope and shared components

All district regions use `LandkreisSeite`; metadata, index policy, canonical,
breadcrumb and dataset structured data remain on the existing route. The
introduction is shared with the existing route, with unincorporated areas
excluded from the municipality count. The live fetch was firewall-blocked;
text provenance is the existing page implementation.

The dark full-width hero owns `SharedSiteHeader`, like the homepage. The layout's
`SiteHeaderFrame` omits its ordinary header on this exact route, including during
client navigation. Other routes keep the existing header. There is one header.
The hero uses the existing Atlas dark foundation, date above the heading, and
no extra eyebrow, jump link or map caption.

`Auswahl` switches the map between solar capacity, installation count and battery
capacity. Arrow navigation wraps in both directions using the shared Auswahl component.
Each metric has its own proportional scale and canonical formatter.
No town is preselected. Hover previews a viewport-clamped flag; clicking or tapping a municipality opens its canonical municipality page. The WÜ pin only explains the independent city context. Context areas explain their administrative status;
they never show a fabricated zero or a previous municipality's link.

## Real 3D scene

`RegionScene` lazily imports `region-scene.ts`. Three.js renders closed extruded
municipal polygons with holes and detached parts preserved, vertical yellow bars,
lighting and shadows. Screen-space outlines retain a 1.35px width; the plane
has a stronger tonal gradient in its existing hue. The existing BKG geometry has 56 features: 52 municipalities,
three unincorporated forests and the independent city of Würzburg. Membership and
values come from the region register and existing `foldSiblings` aggregation,
not from the geometry. Battery capacity never enters the solar capacity sum.

A raycaster resolves hover and click on the real geometry. The full municipality table provides accessible links independently of WebGL. The SVG is a WebGL-unavailable fallback; it remains hidden during loading
so fully grown fallback bars cannot flash before the entrance animation. No fake
SVG trees remain. The camera uses a flatter view with a fixed initial composition around the actual
surfaces, bars and trees. The larger map shares the hero stage with the heading;
only the introduction remains below. Rotation retains a geographic pivot on world Y. Mouse dragging rotates the scene; ordinary
scrolling remains page scrolling.

Touch (26.09.2026, measured with real CDP touch sequences at 390 px, not with
clicks or viewport resizing): one finger sideways rotates, one finger vertically
scrolls the page (the canvas keeps `touch-action: pan-y pinch-zoom`, and the tilt is
locked for touch so a vertical swipe cannot tilt the map), two fingers pinch-zoom and
rotate (`DOLLY_ROTATE`), a tap opens the municipality. Before, the code had
`TWO = ROTATE`, which OrbitControls does not support for two fingers (treated as
none), and `touch-action: pan-y` let the browser swallow pinch: live measured no
zoom (factor 1) and no reliable two-finger rotation, while tap and vertical scroll
worked. The WebGL-less SVG fallback scrolls, pinch-zooms via the browser and opens
a municipality on tap. Not verified: real iOS Safari / Android Chrome devices
(synthetic touch in Chromium only).

EZ Tree generates simplified, seeded deciduous and pine meshes. A denser forest
grid uses smaller trees with varied sizes; pines retain needles in winter. Three variants
share geometry/materials across forest positions, with varied size and rotation.
Positions are checked against the actual forest polygons. `Season` and the scene's
`season()` method retains winter leaf visibility changes while keeping branches.
Bark and foliage now share the map surface colour; the leaf texture supplies only
its silhouette, so natural green pigment cannot tint the monochrome scene. The React scene accepts a season prop;
a public seasonal selector is intentionally not part of this step.

The full-bleed map fades in over 240 ms; bars follow after 180 ms with a short
geographic stagger and 420 ms ease-out growth. It rotates slowly, pauses during dragging and resumes on release; reduced
motion skips both entrance and rotation. Metric changes animate only bar heights.
Offscreen or background-tab rendering pauses. A visible fine CSS grain overlays the scene, with soft shading at viewport edges. Geometries, materials, textures,
shadow targets, controls, observers and the canvas are released on unmount.
Three.js and EZ Tree are pinned package dependencies; no build step depends on an
external worktree or the old prototype directory.

## Municipality grid

All 52 cards render the real `GemeindeKopfMonitor` inline, without iframes or a
second widget renderer. Its weather source uses the town's representative postcode.
The common live/monthly/feed-in selector controls all cards. Compact prepared
packages load only for visible cards, with at most four requests at once. Loaded
data stays in the card; charts unmount offscreen and in background tabs. Reduced
motion pauses monthly animation. Missing/failed packages are explicit states.
A separate light overview overlaps the dark hero and renders all 52 current-day
charts using `CurrentPower`: no clock/unit labels and two guide rings. Hover, focus
and tap expand the town into the actual `GemeindeKopfMonitor` live widget with its
name, installed capacity, simulation note and link.
Both grids share package/weather requests and a four-request concurrency limit.
The original cards and existing ranking table remain below.

## Validation and remaining work

On 24 September 2026: production build and typecheck passed, six geometry assertions
passed, and the browser checks cover all-town membership, shared widgets, empty
initial selection, 3D raycast hover/click, city/forest selection, metric switching,
keyboard selection, no page errors, no iframes, offscreen charts and 320/375px widths.
Sommer/autumn/winter were separately rendered through the actual scene API and
canvas cleanup was verified. Screenshots were visually inspected.

Still pending: visual acceptance, regional stories between grid and table,
multiple bars/cylinders if wanted, and rollout beyond this reference district.
No foreign municipality artwork changes were copied or modified.

## Cut-hero variant

`/solar-atlas/bayern/landkreis-wuerzburg/variante` is a separate, noindex local
comparison using the same Atlas data and district component. Its dark background
ends across the map; the introduction and shared municipal story carousel follow
on the light page. The carousel reads one existing story per municipality from
prepared packages, with four concurrent reads and the Atlas cache tag. It uses
`GemeindeInsights` and its existing reader. It generates no new stories.
The white location marker is a depth-tested Three.js sprite anchored to Würzburg's
map surface, with a keyboard-accessible companion button. Other geometry can
occlude it correctly. Both page variants share this marker.

### Dark story variant (24 September)

`/solar-atlas/bayern/landkreis-wuerzburg/variante-dunkel` keeps the dark surface through the map, introductory copy and municipal story strip. The existing `/variante` keeps its light transition through the map.

Both variants now select twelve existing stories from different municipalities, balancing visual families and topics instead of taking the first story from every package. This is display selection only; publication cadence and editorial relevance remain the responsibility of the editorial system. Preview labels sit above the charts, municipality names below; dates remain available in the reader but are omitted from the teasers. The shared preview and reader are reused.

### Shared fixes and hero continuation

Imported the already integrated municipality story/monitor fixes from origin/main: shared fading composition artwork, preview sizing, bar spacing, solar-only annual labels and annual controls. District story selection now excludes ranking stories, matching municipality insights. The idle map has no place selector; selecting a map surface still reveals its reading and link. The standard Auswahl control sits at the upper right. The WebGL canvas extends to the hero band's top behind navigation, with keyboard pin overflow clipped to that full canvas. Verified at 708 and 375 px, canvas and hero top both 0, no horizontal overflow or page errors.

### District content structure (24 September, afternoon)

The municipality grids remain as components for later use but are not rendered. All district variants now use the municipality's two-column introduction, followed by insights, the municipality ranking and funding cards. Funding is matched against the district and its municipalities; each program is deduplicated and names either district-wide coverage or the applicable municipalities.

`GemeindeAbschnittNav` is extracted from the municipality page and reused by both hosts. The district uses the existing subscription dialog and accepts its five-digit region key through the existing signup endpoint. No signup was submitted during verification. District navigation excludes the deferred energy monitor. `scripts/region-sections-css.cjs` extracts the exact relevant component rules from the municipality styles into `public/gemeinde/region-sections.css`, avoiding that page's global hero resets. Regenerate the extracted stylesheet when those sources change.

Fixed a shared navigation bug found during the real click test: pointer-down outside the section menu must only collapse it on narrow screens. On desktop it collapsed before the subscription click, shifting the target under the pointer. Browser verification: subscription opens and closes, 375px width has no page overflow, no page errors, and both deferred grids have zero rendered items.

## Layout contract (25 September 2026)

District content uses the municipality sizing source `public/atlas-design-preview/responsive-sizing.css`: `--sc-layout-content` (1000px), `--sc-page-inset` and the existing section roles. The generated regional stylesheet must include those tokens. Do not add independent desktop content widths. Hero background/canvas and the moving story track remain full bleed; copy, ranking, monitor and funding share the content column.

Category artwork is resolved in `lib/solar-category-visual.ts` for both donut tiles and composition backdrops. Do not duplicate category mappings in page adapters or substitute a house for open-field solar.

The browser guard in `e2e/landkreis-vorschau.spec.ts` checks centered content widths at 320/390/1440/1920, the full-bleed scene, page overflow and three loaded category images. `LK_LAYOUT_NEGATIVE=1` deliberately widens the monitor to demonstrate that the guard fails. Screenshots still require visual review: measured dimensions do not establish design acceptance.

### Race widget contract (25 September 2026)

The district race uses `DistrictRaceWidget` and the shared `WidgetFrame`, not the
municipality podium shell. Its section only supplies the anchor and content width;
there is exactly one light widget surface. Legacy ranking styles are excluded via
`data-widget-ranking` by the region stylesheet generator. Title, year, explanation
and help belong to the widget header. Animation geometry remains in the race engine.
`sc-dashboard-section` supplies the shared section rhythm and heading-to-widget gap.
Register dates belong to widget help, not a separate context line.
The browser guard checks these boundaries at 320, 451, 1226 and 1920 px, alongside
fixed rank circles, artwork loading and the established content-width guard.

### District basics and monthly history (25 September 2026)

(Superseded 25.09.2026: the page now reads one precomputed district package,
see "Precomputed district packages" below; the aggregation rules are unchanged.)
`loadDistrictMonitor` reads the existing municipality packages with bounded
concurrency, caches only the compact aggregate, and uses the Atlas invalidation
tag. No fixture, browser-side data fetch or local-only source is required.
`aggregateDistrictMonitor` requires every requested town exactly once, the same
register edition and all 25 month ends before it supplies numbers. Missing or
incompatible data produces an explicit unavailable state, never partial totals.
The package edition is independent of the annual Atlas data date and appears in
help along with the month-end cutoff and population date.
The municipality and district both use `monitorKpiGroups` and `KpiOverview`.
Validation: sum/comparison/missing-data tests, typecheck, and browser checks for
1/6/12-month controls, all six metrics and layout at 320/451/1440px. No release or
production build was performed against the active local preview server.

### District energy widgets

- The monitor reuses the municipality monthly/annual charts, current-power dial, monetary illustration and shared widget controls. One surface per widget; dark theme is explicit.
- `district-energy.ts` sums only periods with all district members, one register edition, complete calendars and matching hourly gaps. Monetary totals retain local self-consumption assumptions from the same valuation date. Missing members or periods never become zeros.
- The shared cached district projection reads municipality packages with four concurrent reads, then ships only summed histories/periods to the client.
- `/api/landkreis/solartag` derives membership server-side and weights each municipality's stored DWD curve by installed capacity. Snapshot shards are deduplicated. Missing coverage returns unavailable; no external weather requests per visitor and no stale curve across midnight.
- Validation: aggregation/coverage tests, actual period selection and 320/451/1440 px viewport checks. Local preview only; no release implied.

## Release performance boundaries

The hero and ranking stream independently of the 52-package monitor aggregate.
The map retains the pinned EZ Tree 1.1.0 generator, but webpack resolves its
published source through a lazy texture adapter. Only ash and pine masks are
loaded; unused bark textures and embedded image strings stay out of JavaScript.
The original texture license is retained in `public/landkreis/trees/LICENSE.txt`.
When upgrading EZ Tree, verify the adapter and the rendered `data-trees=ready`
state; source-layout compatibility is intentionally version-bound.

The decorative grain belongs to the stable hero wrapper, so measuring the
canvas headroom does not shift a painted full-screen pseudo-element.
Preset options are copied before generation, so the simplified tree is built
once rather than generating the full preset and immediately discarding it.

## District coverage

Boundaries are loaded by district identifier from the existing 400 checked-in geometry files; all 10,971 features were checked for finite coordinates and interior anchors. State labels come from the region ancestry. Independent cities retain the existing redirect to their municipality page. Missing monthly data is disclosed rather than replaced with partial totals.

## District performance follow-up (25 September 2026)

(Intermediate step; replaced the same day by precomputed packages, below.)

The monitor and story strip now receive one shared promise from `LandkreisSeite`.
`loadDistrictContent` reads each municipality package once, derives both existing
projections and caches only the compact result under the existing Atlas data tag.
Eight distinct reads can run concurrently, matching the previous combined limit
of two independent four-worker consumers. Storage failures still reject the render;
missing packages and mismatched editions never become complete totals. The daily
power endpoint uses the same projection through `loadDistrictMonitor`.

An isolated uncached data-path comparison with the 64 Mainz-Bingen packages made
128 reads / 7,866,476 bytes before and 64 reads / 3,933,238 bytes after. Elapsed time
was 6,318 ms versus 1,977 ms on the local host; these are not production latency
claims. A complete deep comparison confirmed identical monitor data and selected
stories (capacity sites compared by municipality, since read completion order is
not meaningful). The compact cached output was 297,853 characters, below the
2 MB cache limit for this measured district.

The map reuses `public/hero-system/source/frame-pacer.js` from the homepage. Only
automatic motion is paced at 30 fps; pointer manipulation remains immediate.
Camera orbit changes no longer recompute static boundary extents or read DOM
layout. Shadows update when bars, trees or seasons change, not when the camera
moves; size observation still reframes the map on actual viewport changes.

In the same 390 px software-rendered Chromium measurement window (three seconds),
the previous live map made 35,892 WebGL draw calls and 144 layout reads; the local
production build made 11,477 draw calls and zero layout reads. This measures work,
not physical-phone frame rate. Both browser runs had no script errors. All nine
existing district browser checks passed against the production build, including
map navigation, metric changes, narrow layouts, monitor controls and source footer.

## Precomputed district packages (25 September 2026)

**Why.** Even with one shared read per town, a cold district render fetched and
decoded every member package: live 3.5–3.6 s (Mainz-Bingen, Plön), 12 s
(Eifelkreis Bitburg-Prüm). The district result depends only on the published
town packages and the region register, so it is now computed when those change
and the page reads ONE object.

**What the page reads.** `loadDistrictContent(regionId, members, stand)` reads the
pointer `kreise/v<N>/aktuell.json` and the district object it names (bucket
`gemeinde-pakete`, Brotli), both fetch-cached with `ATLAS_DATEN_TAG` and
`KREIS_PAKET_TAG`. Three states, each named on the page: *current*; *older
edition* (the town packages predate the page's register month — shown with their
own register date, never called current); *unavailable* (no package, another
version, or the register membership changed — monitor and stories say the
evaluation is being recalculated). There is no request-time fallback to reading
all towns: that was the slow path, and a silent one would hide a broken refresh.
A failed read throws, like the town reader.

**Membership** is one rule for page and build (`isDistrictMember`): register rows
whose parent is the district, without unincorporated areas and without retired
keys. The register keeps 304 municipalities dissolved by mergers as rows without
designation, population or page; all 304 are in the Destatis change list
(`lib/ags-nachfolger.ts`). Counted as members they made the monitor unavailable —
Mainz-Bingen showed no monitor and "map outline missing" for Heidesheim and
Wackernheim (part of Ingelheim since 2019). Membership is never derived from the
map; absent geometry is still disclosed.

**Build and publication** (`lib/district-package.ts`, `lib/district-package-publish.ts`,
`scripts/kreis-paket.ts`). The aggregation is the former request-time loader
(`computeDistrictContent`), fed through the page's own town reader. Each run
writes a new generation folder, reads every new object back, and only then moves
the pointer; kept districts reference their previous objects. A run aborts —
pointer untouched, last complete generation live — on any failed town read, a
district with no town package at all, more than 2 % towns missing overall, a
package above 1.5 MB, or a pointer another run moved meanwhile. **Overlapping runs** (monthly run and CI) are excluded by a lease in the database (`lib/district-package-lock.ts`, table `kreis_paket_sperre`, taken and renewed atomically under an advisory transaction lock, 20 min, renewed before every district, the pointer switch and cleanup). A run that cannot take it writes nothing (`--alle` then fails, the daily check exits quietly); a run that loses it stops before its next write, so neither a pointer switch nor a cleanup can act on another run's generation. Checked against the real database: of two runs started three seconds apart, the second was refused. A single missing
town is published honestly (monitor unavailable, no partial site list). Only
generations referenced by the current and the previous pointer are kept.

**Refresh path.**
1. Monthly: `scripts/gemeinde-monatslauf.ts` step `kreise` right after `upload`
   (`--alle`), before `frisch` invalidates the whole Atlas.
2. Daily safety run `.github/workflows/kreis-pakete.yml` (06:40 UTC, also on push
   of the aggregation code, and by hand with "alle"). It rebuilds a district only
   when its fingerprint changed (member list, name, versions, ETag of each member's
   published town package) or its object is missing; nothing to do costs one
   register query and two storage listings. After publishing it calls
   `POST /api/atlas/revalidate?umfang=kreise`, which drops only what reads the
   district packages. Failure makes the run red; the health check watches it
   (`GEPLANTE_LAEUFE`).
3. Recovery by hand: `npm run kreise:pakete -- --trocken` (plan), then
   `npm run kreise:pakete` (or `-- --alle`). `npm run kreise:vergleich -- --kreise=…`
   compares published packages with the former request-time computation.

**Format change.** Bump `DISTRICT_PACKAGE_VERSION`: the pointer path carries it, so
the running deployment keeps reading its generation while the push-triggered run
builds the new one; the new deployment shows "being recalculated" until that run
invalidates the district pages.

### Page weight (25 September 2026)

After the package change, cold renders were still 1.5–3.3 s live because the page
itself was 3.5–5.9 MB of HTML. Three duplications removed, nothing visible changed:
- The full ranking table inside the CLOSED disclosure is rendered only once opened
  (`LazyDisclosure`, the mount-on-open pattern of the result sections). Closed, the
  server sends a plain list of the municipality links, so every town page stays
  linked for crawlers and readers without JavaScript. Opened before hydration is
  caught on mount.
- The drawn fallback map is rendered only when the 3D scene fails; before, it was
  server-rendered and hidden on every page (0.9 MB for the Eifelkreis). A browser
  test forces the WebGL failure.
- The monitor receives district totals per year and segment
  (`districtSolarCells`) instead of every municipality's cells.
Eifelkreis: markup 3.46 → 0.98 MB, total HTML 5.87 → 3.22 MB, 233 town links kept;
visible text identical except the corrected municipality count. Remaining payload
is the serialized map geometry for the 3D scene and the ranking table's data.

### Evidence and open limits (25 September 2026, after release)

- **Old vs prepared, real data:** 20 of 20 districts identical (monitor, energy,
  stories, site list by AGS), including Eifelkreis (233 towns), Dithmarschen (116),
  Altenkirchen (118). Eifelkreis visible page text identical except the corrected
  municipality count. Monitor totals from summed cells: unit test over 233 × 5 × 27
  rows. Fallback map with WebGL blocked: browser test, counter-checked red.
- **Generation:** 294 districts, 0 missing town packages, compressed 15–94 KB
  (largest uncompressed 323 KB); build 11–13 min; a no-op daily run 8 s.
  Size classes: 95 ≤20 towns, 149 21–50, 30 51–100, 19 101–200, 1 above 200.
- **Monitor honestly unavailable in 3 districts** (one member without any month
  history): Nordfriesland (Gröde), Bernkastel-Wittlich (Dierfeld), Eifelkreis
  Bitburg-Prüm (Sengerich). 291 districts show the full monitor.
- **Lease against the real database:** two runs started 3 s apart — the second was
  refused and wrote nothing.
- **Live cold renders (MISS, new release):** independent European measurement
  0.82–1.31 s for four districts; own measurement 0.75–2.95 s for seven untouched
  districts (Bad Kreuznach 2.95, Nordfriesland 2.20); health check from the US
  runner 3.4 / 2.5 s (Mayen-Koblenz, Oberspreewald-Lausitz) with platform server
  time 1.87 / 1.03 s — Mayen-Koblenz was the first render on a fresh instance.
  Server time of district renders in the logs: 0.5–2.1 s.
- **Stormarn 17.9 s (health check before this release):** platform logs show a
  2.1 s server render; the remaining ~16 s passed after the function ended, and a
  town page in the same run (0.54 s server) measured 21.9 s. The delay lies between
  function and client (delivery layer); the cause is not proven.
- **Remaining limit:** pages are still 2.4–3.2 MB of HTML, mostly the serialized
  geometry of the 3D map and the ranking table's data. Below 2 s is reached for
  most, not all, cold renders.
