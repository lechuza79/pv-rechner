# Widget layout reference — 2026-10-08

Local scope: cost race, municipality podium and electricity trade. No release or
complete chart-catalog migration is implied.

## Verified

- 15 focused tests pass: registry variants, gallery mapping, generated embed code,
  cross-origin resize source/origin checks, invalid heights, duplicate script load.
- Real second-origin host: cost race iframe automatically reports 627 px at a
  390 px slot and 690 px at a 1000 px slot; unrelated messages are ignored.
- Reference host at 390 px: both arrangements have one column, no page overflow.
- Reference host at 1600 px: three equal columns, or a feature column with an
  explicit side stack; natural card heights are retained.
- Loaded cost race and ranking, plus trade loading state: no internal horizontal
  overflow at the reference desktop widths after clipping decorative ranking art.
- Gallery wrapper respects the declared maximum width as well as the iframe
  presentation, avoiding mismatched empty bands around a capped chart.

## Boundaries

- Loaded electricity trade verified at 390 px: seven-day bars (522 px), yearly
  radial full (497 px) and compact (400 px), each without horizontal overflow.
  Other periods and all export formats were not retested in this layout pass.
- Full project typecheck is not green: existing errors include archived dependency
  sources, unrelated site routes and data scripts. Errors introduced in the
  modified gallery declarations were corrected; no errors remain reported for
  the changed widget files in the last typecheck.
- Remaining chart families and third-party CMS script restrictions need separate
  checks. Fixed-height iframe-only export is the explicit fallback.
- The local reference runs on port 4319. The older port 4320 production snapshot
  has not been rebuilt with this implementation.

## Reference composition correction

The first demo incorrectly reused gallery editing cards and required 1488 px
for three columns. It now uses the same bare embed component as the gallery,
without gallery headings/settings, inside the existing gallery page frame.
Explicit dense layouts use the declared usable minimum width rather than the
preferred standalone width. Browser measurements: three 368 px columns at a
1280 px viewport, three 416 px columns at 1440 px, one 351 px column at 390 px.
No outer settings controls or horizontal overflow at these sizes.

## Allocated rendering — supersedes natural-height-only reference above

Local browser checks on 8 October 2026 at 390 and 1440 px:
- Nested cost card: 828 px desktop, 700 px narrow; document and card heights match.
- Cost plot responds to remaining space: approximately 462 / 267 px respectively.
- Two compact trade cards: 402 + 24 gap + 402 = 828 px desktop.
- Radial SVG: 282 by 282 px desktop, 300 by 300 px narrow; no clipping.
- Trade bars use a measured SVG viewport (368 by 206 px desktop), not a square.
- Allocated iframe height is controlled by its slot. Content-height reports remain
  available for readiness but do not resize that iframe; standalone behavior is unchanged.

Six catalog/contract tests passed. Persistent browser regression coverage added in
`e2e/widget-allocated-layout.spec.ts`; that file itself has not been run in this pass.
The browser checks above were performed through the active local browser instead.
No complete catalog migration, framework installation or production release.
Image export metadata/visibility tests are separate from visual PNG verification;
no new PNG export has been visually accepted in this pass.

### Correction after visual rejection

The previous full-page screenshot was not acceptable: the mixed example used fixed
rows while unmigrated widgets retained natural heights, causing overlapping cards.
Those tracks now grow with content. Direct browser measurements at the current
1003 px container viewport and at 1440 px confirm non-overlapping sibling cards.
Added a persistent sibling-overlap regression case; it has not yet run in CI.
This corrects a concrete layout defect, not a visual acceptance of the whole system.

### Radial placement constraints

Radial examples now request a square card placement instead of spanning the full
neighbor height. The square plot remains independent of card geometry. The full
trade variant declares a 440 px allocated minimum height because a wrapped title
at 351 px width otherwise reduced the plot to 196 px and caused center-text
collisions. Compact declares 320 px. The nested upper track follows its square
card; the flexible lower bar chart takes the remaining allocated height.
The medium layout places radial and current-power cards in adjacent columns.

### Reference chart adapters, 2026-10-08

Ranking now measures its podium, labels and rank footer to derive the available bar height in allocated mode. Standalone and explicit export-format rules remain separate. World capacity uses the existing allocated RaceChart renderer. Current power opts into an allocated square plot, with width bounded by available height. All three declare allocation support and minimum heights in the registry. Narrow reference placements reserve these heights instead of relying on iframe content sizing; unloaded placeholders also respect allocation.

Desktop DOM checks: ranking card/body 544px, world capacity card/body 560px; no vertical overflow in these two embeds. Nine targeted catalog/presentation/onsite tests passed before expanding the contract test to the two additional entries. Final current-power and mobile visual checks remain pending due to local browser/loading interruption; no claim of full visual or export acceptance.

Follow-up: current-power loaded after clearing the obsolete error document; its radial SVG measured 319.5 x 319.5px. Removed the regional adapter's 16px page-level bottom padding only in allocated presentation. Expanded presentation contract tests passed (3/3). Mobile and PNG rendering not reverified in this pass.

## Four-part consolidation — 8 October 2026, afternoon

Changes: reusable nested `WidgetComposition` plans, missed-ready handshake retry,
shared trade request/cache reuse, single-widget monitor adapters, regional map,
monthly radial, grouped KPIs and compact KPI in the reference. Weather reads now
have a 20-second timeout; missing data is still an error, never a fabricated zero.

Evidence from the local browser:
- Desktop 1440: cost iframe 416 x 828, compact radial 416 x 416, seven-day
  bars 416 x 388, ranking 416 x 490, map/month 636 x 600.
- Narrow 390: 351 px slots; cost height 696, radial 351, bars 320, ranking 490.
  Cost document height equals allocation; no horizontal overflow.
- Monthly radial SVG measured 468 x 468 in desktop allocation, no body overflow.
- Grouped KPI selector exists once and changing to the last month updates all
  comparisons (e.g. plants +15 and storage +11); compact remains a parent variant.
- Actual ranking downloads inspected: dark palette, branding, source/date/context,
  no controls. Narrow “as displayed” and 1920 x 1080 output both generated.
  Export initially overlapped labels; fixed inherited-token freezing and reused
  the plot fitter. Retested on a fresh embed after stale development HMR.
- 23 focused tests pass (composition, cache, fallback rendering, presentation,
  onsite sources, export metadata/visibility). Geometry E2E cases are authored
  but were not executed as the Playwright suite; browser checks above are manual.

Remaining verification boundaries:
- Local response time improved from 73.96 seconds before restarting the stalled
  development server to 7.07 seconds in the final warm HTTP sample. This is still
  slow and is not a production performance measurement or a speed guarantee.
- Full repository typecheck was stopped after over seven minutes without output
  under heavy local load. No claim of a green full typecheck/build.
- Only the documented families/formats have been visually checked, not every
  widget or export format. All changes remain local; no production release.

## Variant and theme correction — 8 October 2026, evening

- Reference compact slots now honor their registered maximum width. Desktop
  measurements: compact trade 380 x 380, seven-day compact 380 x 320,
  full trade 636 x 636. Nested group height derives from its children.
- Shared presentation supplies dashboard semantic colors and propagates its theme
  through nested export frames. Current-power and grouped KPIs verified dark;
  current-power verified light. Grouped-KPI light verification remains pending.
- Reference defaults to autoplay, with shared theme/playback controls. After a
  fresh page load, the cost race advanced to 2027 and exposed its pause button.
- Nine focused composition/example/onsite tests passed.
- Local browser also encountered timed-out JavaScript chunks; fresh reload
  recovered cost playback, but reliable loading of all frames is not established.
  Do not report the complete catalogue, all themes, or performance as accepted.


## 2026-10-09 — electricity trade grid formats / hero separation

- Detail page uses the common preview component, registry contracts and GridStack adapter.
- Browser: small compact 368 × 336, radial plot 152 × 152; medium full 564 × 480,
  radial plot 352 × 352; independent hero 380 × 400, radial plot 320 × 320.
- At 390 px viewport: small compact 351 × 336, no horizontal overflow; seven-day
  bar drawing area 303 × 216; shared metric tile stays inside its bounds.
- Wide full at desktop: 1152 × 480; seven-day bar plot 1104 × 211.625.
- Settings modal successfully changes the period. Hero/grid switching preserves configuration.
- 12 focused tests pass (presentation contract, preview controls, examples, nested composition).
- Download clicked in the live iframe; browser automation delivered no downloadable file and
  no console error. Export appearance is NOT verified and remains a migration gate.


## 2026-10-09 — shared catalog and renderer-family migration

- 24 focused tests pass across gallery source identity, variant/slot compatibility, nested geometry,
  preview controls and actual horizontal-race ResizeObserver behavior.
- Browser: trade offers small/medium only. All 33 curated chart families appear in reference inventory.
- Ranking: 368 × 624, no overflow; world electricity race: 564 × 624, no overflow.
- Regional map: 564 × 480, canvas 564 × 360, no overflow.
- Existing nuclear-share hero loads via `variant=teaser` with the real data and no grid allocation.
- At 390px viewport, country mix and regional race both measure 351 × 768 without overflow;
  their plots measure 539.21 and 467.21px high respectively. Rows retain their original text/bar
  heights and expand spacing to fit. Viewport restored after checks.
- Project-wide typecheck remains red in unrelated partner/recommendation/atlas/API/shell files;
  no diagnostics in the modified catalog, selector or layout files at time of check.
- Download rendering remains unverified from the prior run. Existing export pipeline retained;
  these checks do not claim release/export acceptance for every family.


## 2026-10-09 — remove unsolicited reference inventory

Removed the added catalog/format section and its native details elements. Reference example tests
pass (3). Local HTTP check returned 200 in 1.86 s. Browser tabs still displayed a connection error;
automated reload was blocked by browser URL policy, so rendered recovery awaits manual reload.


## 2026-10-10 — bounded responsive composition pilot

This supersedes the rejected universal-ratio placeholder demo and earlier claims
that this reference requires square outer cards. Historical measurements above
remain evidence of their dated versions, not acceptance of the current catalog.

Implemented through the existing catalog/presentation/embed/rendering layers:
real PV cost curves, compact yearly trade radial, compact seven-day trade bars,
and the complete six-metric Nidda group. The nested chart group derives its
constraints from its children; the KPI group retains content height. Existing
GridStack and explicit composition-plan consumers have not been migrated.

Current local browser evidence (port 4319, active development server):
- Checked viewport widths 320, 375, 768, 1003, 1280 and 1440px during the pass.
  Final 320px and 1280px checks include the corrected 336px compact-trade minimum.
  No page horizontal overflow; embed measurements allow at most 1px rounding.
- Final 1280 x 800 viewport: available host width 1152px. Chart group is 808 x
  696px: cost 427.33 x 696px, trade stack 356.66px wide with 336 + 24 + 336px.
  The separate KPI block is 320 x 974px; its height does not stretch that group.
- Final 320 x 812 viewport: full 320px host, cost 640px high, trade stack 696px,
  KPI block 974px. Both groups stack; total composition height 2358px.
  No internal chart scrolling or clipping was introduced.
- Narrow seven-day plot is 272 x 222.70px. The metric tile remains above the
  negative bars and clear of the final positive bar. Clicking the final day opens
  the shared tooltip within the iframe (x92..312, y8..130.5 at width320).
  Escape dismisses it. Compact radial center explanation also opens and dismisses.
- The compact radial keeps a square plot; its center number is centered after a
  scoped correction of the shared tooltip trigger's inherited left alignment.
- Theme controls changed real charts between dark and light. Playback stopped at
  the selected final year and restarted; fresh load advanced to 2027. The KPI
  period control changed all applicable comparisons together (last month:
  plants +28, storage +18). All six KPIs remain present.
- Independent trade hero checked at width320: 320 x 320px radial, intrinsic body
  height393.30px, no horizontal overflow and no allocated layout marker.
- A real PNG downloaded from the standalone cost chart and was visually inspected:
  2560 x 1440, dark theme, final year2051, values35127/23447EUR, October2026 data
  date, sources and branding visible, controls absent, no cropped footer.
  This accepts that specific image only; it is not proof for every export family.
- All four real pilot embeds reached rendered content. No upstream cold-cache
  reset was performed; this is not cold-load or production-performance acceptance.

Automated verification: 36 focused tests passed across responsive/legacy
composition, presentation contracts, slot compatibility, embed resize/readiness,
export metadata and annotation placement. A scoped TypeScript check covering the
pilot and its imported shared modules passed. Full repository typecheck, production
build and the existing browser E2E suite were not run in this pass. Browser evidence
above came from live browser interactions and DOM measurements, not that E2E suite.

The narrow read-only architecture review found a real minimum-width violation in
the first mobile host (288px after gutters). The host now supplies320px and the
resolver rejects undersized allocations; a regression test covers the boundary.
Do not equate the review or unit tests with approval of every chart or data state.

Status: local and uncommitted in the pre-existing recovery worktree; no push,
deployment or publication. Existing unrelated changes and running server retained.


## Catalog migration and common-family validation — 2026-10-10

Local retained catalog: **33 active entries**, all using registry presentation
contracts and the shared embed wrapper. **15** full presentations support an allocated
rectangle; **18** retain explicit content sizing. Ten deliberately hidden legacy
entries and the generic calculator application are accounted for separately. This does
not revive retired widgets or claim that every historical route is a dashboard widget.

| Registry identity | Family | Full presentation height |
| --- | --- | --- |
| regional-map | map | Allocated |
| gemeinde-ranking | ranked-bars | Allocated |
| regional-annual-growth | cartesian | Allocated |
| gemeinde-solar-monat | radial | Allocated |
| regional-race | ranked-bars | Allocated |
| regional-composition | composition | Content |
| gemeinde-anlagenraster | composition | Content |
| gemeinde-energie-jahr | radial | Content |
| regional-electricity-value | composition | Content |
| regional-feed-in-value | composition | Content |
| regional-current-power | radial | Allocated |
| pv-kostenrennen | race | Allocated |
| heizkostenrennen | race | Allocated |
| gruengas-heizkosten | composition | Content |
| strommix | cartesian | Allocated |
| strommix-anteil | radial | Content |
| atomstrom-tage | cartesian | Content |
| stromhandel | radial | Allocated |
| laender-strommixrennen | ranked-bars | Allocated |
| laender-strommix-pro-kopf | ranked-bars | Allocated |
| welt-zubaurennen | race | Allocated |
| welt-stromrennen | race | Allocated |
| zubau-erneuerbare-atom | cartesian | Allocated |
| einspeiseverguetung-verlauf | cartesian | Content |
| pv-zubau-deutschland | cartesian | Content |
| solar-trend-monat | composition | Content |
| erzeugung | radial | Content |
| ee-ampel | indicator | Content |
| karte | map | Content |
| anlagenbestand-deutschland | composition | Content |
| micro-solar | microchart | Content |
| micro-wind | microchart | Content |
| regional-basic-stats | metric | Content |

Implementation: shared Cartesian viewport for line, area and stacked-bar renderers;
vertical category bars use the common plot marker. Regional annual growth, generation
mix and renewable/nuclear additions are newly allocated consumers. Other content-sized
presentations preserve complete controls and compound content. Existing generation-mini
and nuclear hero variants have explicit contracts. Preview and layout-reference hosts
use the same registry-to-composition helper as the pilot. Retained legacy settings
receive sharing updates through the validated parent appearance channel.

Live browser evidence in the agent-owned test tab:

- All 33 embed routes opened at 375px and exposed their expected family wrapper.
  This was a route/layout smoke pass; some measurements occurred during hydration or
  upstream loading and are not full data-state acceptance. A transient nuclear-share
  overflow was not reproducible after loading; the settled card had no overflow at
  375px and 320px. No masking fix was added for that transient observation.
- Regional annual-growth bars rendered at 320px; switching to the last five years
  changed the labels/data. No horizontal or vertical overflow at 320 x 640.
- Generation mix rendered at 320 x 640. Switching 7 days to 30 days changed the
  area to stacked bars. The plot measured272 x 348px. Dates now thin according to
  real plot width, and fractional quantity ticks no longer round to duplicate integers.
- Renewable/nuclear line plot rendered at320px, with country controls, totals,
  comparison switch and explanation retained; no horizontal overflow.
- Layout reference at1280px: first nested group widths366 /326 /412px, total1152px,
  common height696px; compact trade children336px each with24px gap. Real cost,
  trade and ranking content loaded. New energy group displayed actual area/line/share
  charts together at368px per column. Allocated cards640px, natural share card grew.
- The same reference at320px stacked all groups without horizontal overflow.
  The light theme reached the generation and nuclear-share frames through the common
  channel. Natural nuclear-share body width/scrollWidth both320px, height642px.
- Downloaded generation-mix PNG after choosing30 days, dark theme, at320 x640.
  First image exposed a shared detached-export crop and a wrongGW caption. Both were
  corrected: SVG geometry now fits the remaining export box, and aggregated periods
  describe a quantity, withTWh on the actual axis. Second downloaded image was visually
  inspected: all axes, selected period, fractional ticks, data timestamp, sources,
  branding and category summaries visible; controls absent. This accepts this concrete
  image, not every export or arbitrary fixed-format request.

Automated checks:118 tests across25 files passed, covering the widget catalog,
legacy/new compositions, controls, variants, shared plot viewport/export fitting,
readiness, appearance-channel origin checks, resize and export metadata. Expanded
scoped TypeScript check includes all top-level embed pages, changed chart renderers,
both gallery hosts, preview card and their dependencies. It passed. The scope explicitly
includes the existing regional-race browser declaration. Full production build and full
repository E2E suite remain unrun; no production or cold-cache performance assertion.

A Web Locks promise type issue found in the existing shared trade loader was corrected
by normalizing the result through `Promise.resolve`; its cache tests passed. Stale tests
were updated to inspect the shared renderers instead of route re-export files and to
include all already-wired animations. Existing file changes outside this stage remain
preserved. Status: local, uncommitted, no push/deployment/publication; server4319 retained.

Additional retained-consumer check: the EE indicator loaded an actual90% reading at
320px with no horizontal overflow. Its call-to-action exposed an unmapped legacy
palette token; the common explicit-theme bridge now supplies the action/background
pair. The dark-theme button was visually checked. With only external `bg`/`fg` URL
parameters, the wrapper preserves custom colours (`#123456`/`#ffffff`) instead of
replacing them with a default shared palette. These are shared adapter changes.

## Shared dashboard foundation — 2026-10-11

Local port 4319; this is not a production-release claim.

- All 33 curated gallery widgets render directly on `/widget-galerie/dashboard-bestand`.
  Browser inspection after loading: 33 widget hosts, no per-widget iframes, no remaining
  loading flags or unavailable-data errors. At 320 and 375 CSS px, page and individual
  widget widths do not overflow. Intrinsic groups retain their complete content.
- `/widget-galerie/layout-referenz` renders 13 instances, including nested cost/trade
  groups, map/month/KPI content and national energy charts. The direct HTTP response
  contains 13 widget slots, seven prepared resource snapshots, actual trade/current
  power data, zero iframes and zero initial widget loading flags. Warm local development
  response measured 2.46 seconds; not a production performance benchmark.
- Browser switching between the recommended composition and flexible grid retains
  all 13 instances. Theme and animation controls use the common host channel.
- The actual generated dashboard embed URL was opened locally. It rendered the same
  13 widgets without a nested iframe or unavailable-data error; the 375 px partner
  view fits its width. Browser console on this embed: no errors.
- Compact trade's options menu was exercised and a real PNG downloaded and inspected:
  dark palette, signed line, non-overlapping metric, selected year, date, attribution
  and branding present. The compact plot remains small in a narrow card export;
  alternative image formats and video delivery were not accepted in this pass.
- 60 focused assertions cover shared resource identity/deduplication/failure retention,
  presentation contracts, all-catalog configuration round-trip, malformed configs,
  grid widths, nested layout allocation, architecture reuse, the component dependency
  registry and regional/trade data.
  The targeted TypeScript project includes both dashboard pages and embed adapters.
- Earlier browser tabs accumulated development hot-reload warnings while hook code was
  being changed. Fresh views were used for acceptance; this was not treated as a live
  service outage. A global header hydration warning also occurred on the site catalog;
  it is outside the chart tree and was not reproduced in the standalone dashboard embed.

Existing single-widget embedding and the gallery's iframe-based embed editor remain
available. Deliberately hidden legacy entries and full applications are not part of the
33-widget curated catalog. No production deploy or full-repository build was performed.

Final check: the targeted TypeScript project completed with exit code 0 and no diagnostics. The 60 focused tests and `git diff --check` pass. The preview worktree and running local server are retained for visual acceptance; no commit, merge or deployment was made.

### Follow-up: configuration and container alignment, 12 October 2026

- 1440px browser: race plot and explanation share identical top/bottom coordinates
  (278.7px height); event buttons and playback sit below. Event navigation works.
- Landscape: recommended group spans 1296px; alternate grid spans 429.3px. Both
  retain flight controls. At 375px viewport the card settles fully inside the
  337.5px stage, without horizontal page overflow.
- Public landscape and location cards contain zero settings triggers. Registry
  configuration in the variant modal changes the location to Nidda; its iframe
  displays Nidda and modeled power. Widget subtitle uses shared 14px/400 style.
- Shared solar/wind radial paths expose stroke-width=1 and non-scaling-stroke.
- Solar card action menu retains help, download and sharing. Copying its link
  produces the configured town destination, not the wind example.
- 21 focused tests pass; targeted TypeScript check passes. Full repository
  typecheck still has unrelated baseline failures recorded above.
- Local preview only; no commit, merge, deployment or publication in this pass.

### Shared controls and large grid allocation — 12 October 2026

- Race event arrows now explicitly opt into the shared icon button: 28px with
  12px icons in narrow containers, 36px with 16px icons from 640px container width.
  Other control consumers keep their existing size. The wide explanation retains
  its full-height right column, top-aligned text and internal bottom navigation.
- The landscape declared a 760px minimum but only registered the 624px stage slot;
  this removed all its valid grid choices. Added the reusable `full` format
  (12 columns, 11 rows, 768px) and opted this presentation into it. Existing stage
  slots and other presentation contracts are unchanged. Minimum content height
  and chosen grid height remain distinct constraints.
- Destination menus can explicitly anchor to their center; existing selection
  menus retain start alignment. The landscape disables selection during flight
  instead of silently ignoring it. Duplicate destination names receive local
  navigation ordinals; map labels and the municipal landing-page tour stay intact.
- Browser: 375px page has no horizontal overflow, destination menu occupies
  x=87.5..287.5, narrow race arrows measure 28px. At 1440px wide race arrows measure
  36px and navigating to the previous event changes the chart. Selecting the second
  Hatten wind destination starts the flight and reaches the selected destination.
  Landscape variants modal offers the large grid format and allocates 968x768px.
- 17 focused tests pass (controls, presentation contracts, nested composition).
  Scoped TypeScript check passed. Full build/repository E2E are not claimed.
- The local supervisor restarted an unresponsive development server during this
  pass. The reference recovered, but reliable development-server availability is
  still an open issue; do not infer a production/embed outage from this local event.

Remaining system-level work: applying and persisting edited dashboard configuration
beyond the variant preview, completing representative partner/embed and export
acceptance for each renderer family, and a production build/release check. The
existing curated-catalog migration is local and is not a complete release claim.

### Story catalog integration — 12 October 2026

- `/widget-galerie/storyview` uses the existing story strip/reader and renders
  available templates as direct dashboard children. The layout reference links
  to it. All ten active templates are selectable in the gallery; the inactive
  outline entry is excluded. Nidda's live package supplies nine examples; yield
  comparison is explicitly reported as missing rather than invented.
- Browser at 1280px: all nine individually rendered visuals expose shared action
  menus and their original values. At 375px all nine cards measure 338px and the
  document is exactly 375px wide, without horizontal overflow.
- Existing reader: opened the electricity-value story, paused, navigated forward
  to feed-in value and closed. Existing story artwork and controls were preserved.
- Downloaded and visually inspected `story-06440016-electricity-value-2026-09.png`:
  236.8 thousand euros, municipality, month, data dates, historical provider line
  and Solar Check attribution are present. This is one representative PNG check,
  not acceptance of every story export format. The copy-link action reports success;
  the browser connector clipboard returned a stale value, so URL content is covered
  by a focused reconstruction test rather than claimed as a clipboard observation.
- Opened the actual generated partner dashboard URL locally: nine direct widget
  instances, zero nested iframes, no configuration controls, zero console errors;
  at 375px document width equals viewport width.
- Focused tests cover original-story selection, missing/mismatched snapshots,
  whole-catalog embed round-trips, narrow grid constraints and original story
  renderer semantics. Scoped TypeScript check passed.
- Local only. Reader export-fallback consolidation, applying/persisting dashboard
  edits, wider renderer/export acceptance and the production build/release remain
  open. The preview server recovered after a slow development compilation; this
  pass does not establish a permanent fix for local availability.


### Shared story basis and dashboard persistence — 12 October 2026

- Municipal story readers and standalone story widgets now delegate their visual
  body to `MunicipalWidgetVisual`. Detail, controls and playback are independent
  options. Existing drawing implementations are reused.
- Reader and widget exports use `storyWidgetDefinition` for source metadata.
  A real reader PNG download exposed a pre-existing absolute-position offset;
  the export override now resets `left` and `top`. The corrected PNG still needs
  another browser download and visual acceptance.
- Per-instance dashboard selection and appearance are validated and applied
  independently. Appearance/grid-only changes skip server preparation. New data
  snapshots seed the shared resource store without replacing fresher observations.
- Admin-only persistence creates immutable dashboard versions. Development uses
  local files; hosted deployments require `scripts/sql/widget-dashboards.sql`.
  The production migration has not been applied.
- Automated tests cover saved configuration round-trips, instance isolation,
  admin protection, invalid settings, source attribution and resource seeding.
  The latest focused rerun passed 15 tests, including the corrected chart catalog.
- Browser acceptance remains incomplete: configuration preparation failed during
  repeated local preview restarts; the preview iframe reported connection refused.
  No admin session was available for the actual save/reopen UI path. Neither the
  complete browser flow nor production persistence is claimed as verified.

### Browser follow-up and preview startup correction — 12 October 2026

- Actual browser: changed only the annual trade instance from dark to light.
  It applied immediately; the cost, seven-day trade and ranking instances stayed
  dark. Changed the same instance to the seven-day period: the new renderer and
  values appeared, with no console errors. No reload was required.
- Downloaded and inspected the corrected reader PNG for monthly additions. The
  complete chart, title, Nidda, period, data date, provider/license edge and brand
  footer are visible. Export metadata now shares the footer gutter and no longer
  repeats a separate place note. Proof: handoff `work/proof/story-shared-export.png`.
- 21 focused widget tests and 10 supervisor tests passed. The startup regression
  failed before the fix and passed afterward; repeated startup/compile messages
  cannot extend grace indefinitely.
- Preview logs showed delayed Next startup being killed by the initial health
  deadline. An observed Starting phase now receives the same bounded grace as
  compilation. The installed supervisor was updated and only its owned service
  restarted. The layout reference loaded after cold compilation, with no rendered
  load alerts or console errors. This fixes the demonstrated restart condition;
  it does not prove that all causes of machine-wide slowdown are resolved.
- Admin save/reopen browser acceptance and the hosted database migration remain
  outstanding. All changes remain local; no deployment or merge was performed.
