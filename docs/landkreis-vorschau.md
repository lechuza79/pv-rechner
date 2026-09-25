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
scrolling remains page scrolling. Touch uses two fingers for rotation.

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
