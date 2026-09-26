# Central visual system and regional pages — plan

**SCOPE REDUCED (26.09.2026, user via root).** Priority is Landkreis → Bundesland →
Deutschland live and performant on the accepted district design. The broad widget
roadmap below (stages beyond the three migrated municipal visuals, editorial rebuild,
media library, billing) is **DEFERRED**. The municipality page changes only where a
concrete BL/DE dependency requires it.

**Current ownership and acceptance (26.09.2026):** Codex owns UI implementation
and rendered verification directly. Claude may prepare bounded data/backend work;
UI feedback is not relayed through a second implementer. The user accepted the
regional map's gestures, tutorial and swipe momentum on their phone. This is local
acceptance, not a deployment or acceptance of the entire regional page.

## Current shared building blocks (26.09.2026)

- `RegionKarte` and `region-scene.ts` are the single map implementation used by
  Landkreis, Bundesland and Deutschland through `LandkreisSeite`. Keep one-finger
  horizontal rotation, vertical page scrolling, two-finger tilt/zoom, tap-to-card,
  outside-tap dismissal and velocity-based decaying spin. The tutorial runs once
  per tab session and can be replayed with “Gesten zeigen”. Respect reduced motion.
- Composition, annual energy and monthly solar use `CompositionChart`,
  `EnergyYearRadial` and `MonthlySolarRadial`; monitor/story wrappers preserve
  their accepted layouts. The earlier inventory below describes the BEFORE state.
- `charts/CurrentPowerWidget` owns the existing weather adapter and current-power
  widget for municipality, compact header and district. `charts/AnnualGrowthWidget`
  owns the regional annual-growth widget. Regional monitors import these directly,
  without importing the full municipality monitor. Drawings and behaviour are moved
  unchanged; municipality-specific layouts retain their own wrappers.
- `ExportableWidgetFrame` owns the vertical-dot menu, copying a chart-modal link
  and download for the migrated widgets. Individual embeds remain unavailable.
- Bundesland/Deutschland reuse register-based widgets. Package-based live power,
  stories and energy remain absent until appropriate aggregate data is available.

Local verification of this extraction: unchanged component bodies, TypeScript,
rendered Landkreis charts and their existing period control. No production release.

## LK options-menu completion (26.09.2026, local)

All eleven standalone chart/value cards now use `ExportableWidgetFrame`: race,
current power, annual growth, month radial, year radial, electricity value,
feed-in value, category donut and the three composition cards. The shared menu
copies a chart-modal link and downloads a PNG. Embedding stays explicitly
unavailable until dedicated routes exist. KPI sparklines remain part of the
existing overview, not independent chart cards.

Six newly connected widgets have entries in the existing widget registry; no
new registry or dataset was introduced. The race reconnects its engine when the
plot is remounted in a modal. Exports retain source/licence/place and the selected
period. Growth exports also print the annual counts; current-power export rejects
loading/error states. Source-edge text is fitted again on the final capture clone
because export-only content changes dimensions.

Verification: eleven menu triggers in the rendered LK page, racing modal populated,
all six new PNG downloads received and visually inspected, growth range selection
and 375px menu checked. Current-power source-edge clipping found and fixed; second
PNG inspected with complete attribution. Existing registry/export tests pass.
This is local preview work, not integration or production release.

## Export palette and animation downloads (26.09.2026, local)

The shared capture uses the independent `--chart-export-contrast` token on a light
surface (defined in `components/charts/chart-export.css`). This replaces the old
blue in all migrated Atlas image/video captures without changing the live palette.
Background, surface and secondary text also have export-specific tokens.

Race and monthly solar offer current-frame PNG, final-state PNG and video. Both
implement the same pause/seek/restore command; capture uses the actual renderer,
source edge and footer. Video chooses the existing browser-supported WebM/MP4
format, records sixty samples on a canvas and shows progress. Keep the tab open.
Prior playback/selection is restored after capture, including failures. Annual
radial has no chronological playback; its selected state remains a normal PNG.

Verified locally: race final PNG at 2026, race video from 2000 to 2026 (~30s),
monthly video advancing days (~31s), light palette without the previous blue,
source/licence/brand retained. TypeScript and 15 focused existing tests passed.
Browser verification was Chromium; Safari's MP4 path is not device-tested.

## BL/DE dependencies (checked in code, 26.09.2026)

| Need | State in code | Action |
|---|---|---|
| Route | `solar-atlas/[[...pfad]]` renders the OLD page for Bundesland and Deutschland; only Landkreis uses `LandkreisSeite` | route both levels to the shared regional page |
| Children + values | `getChildren` / `getRankingData` already deliver Kreise incl. kreisfreie Städte (Bundesland) and the 16 Länder (DE) from the register rollup, per year | reuse (map metrics, race, table) — no summing of Landkreis totals |
| Geometry | `public/geo/de-landkreise.geo.json` (400, incl. kreisfreie, `bl` field) and `de-bundeslaender.geo.json` (16), same format as the municipality files | loader per level; drop the `Kreisfreie Stadt` kind there (the district map treats it as a non-member pin) |
| Hero map, race, table, intro, crumbs, metadata, JSON-LD | generic on children/ranking; lede text says "Gemeinden" | level-aware wording |
| Register widgets (growth, category donut, composition) | computed from ranking cells, no package needed | reuse the district widgets |
| Monthly KPI history, energy widgets, live power, stories | exist only via municipality/district packages; no state/country package | DEFERRED; needs a state/country package pipeline (decision at milestone) |
| Funding | `matchFundingForAgs` works on 2-digit keys | show state (and federal) programmes only |
| Subscription | abo accepts 5/8-digit keys only | not offered on BL/DE |
| Berlin/Hamburg | one child only | no race/table (as on the old page) |
| Performance | old BL page ISR on demand, DE prerendered; district page 2.4–3.2 MB HTML mostly geometry | measure HTML size and cold render per level before release |


## Earlier (municipal visuals, done)
brief in `/tmp/atlas-central-visuals-scope.md`. Small fixes already on this branch:
district hero title on the hero role (48 px desktop cap), shared composition arc.

Goal in one line: one registered definition per visual; the SAME renderer draws the
live monitor, the editorial preview, the story reader, the exported image and later
embeds/media library. Live chrome (frame, selectors, footer actions) wraps it.

---

## 1. Inventory (measured by imports, 25.09.2026)

### A. Two systems exist, both partly "central"

| System | Where | Identity / metadata | Renderer | Export / share |
|---|---|---|---|---|
| **Old widget system** (Germany, calculators, old atlas embeds) | `lib/widget-registry.ts` (23 entries), `components/WidgetExport.tsx`, `lib/chart-export.ts`, `lib/chart-katalog.ts`, `/admin/charts` | Registry: title, kind tool/chart, place templates, shareUrl, sources, cta, exportable, embeddable | per widget | **Canonical export rules**: `ExportIgnore/ExportOnly/ExportBox`, InfoTooltip self-registration, `WidgetExportFooter` (notes+legend+brand), `WidgetSourceEdge` (vertical source), `applyBrightestStage`, `captureNodeToBlob`/`buildExportSvg`; guarded by `e2e/widget-export.spec.ts` |
| **New atlas system** (municipality, district, homepage stories, editorial V2) | `components/gemeinde/*`, `components/landkreis/*`, `components/social/*`, `components/dashboard/*` | `StoryConcept` (`lib/story-konzepte.ts`) + `STORY_VISUAL_TEMPLATES`/`storyVisualTemplate` (`lib/story-approved-visual.ts`), monitor `widgetRole()` (title+kind, inside `GemeindeMonitor.tsx`), `lib/dashboard/model.ts` (WidgetKind→columns) | `MunicipalChart` dispatcher (story), `MonitorWidget` switch (monitor) | Story reader only (`GemeindeInsights` download: `captureNodeToBlob` + **own credit line** `story-export-credit`). **Monitor widgets have no share/download at all.** |

### B. Municipal / regional visuals and their current source

| Visual (template id) | Live monitor renderer | Story/editorial renderer | Duplicate? |
|---|---|---|---|
| Composition grid + power share (`anlagenraster`) | `gemeinde/MonitorComposition` | `social/InstallationCountChart` (via `ApprovedStoryVisual`) | **Yes — forked** (same geometry, own CSS; monitor adds responsive columns 10/12/16). Arc now shared (`charts/CompositionArc`). |
| Solar + wind year radial (`energy-year`) | `gemeinde/MonitorAnnualEnergyChart` (+year selector) | `social/AnnualEnergyChart` (+solar/wind mode) | **Yes — forked** |
| Solar month recap radial (`radial`) | `gemeinde/MonitorMonthlySolarChart` | `social/MonthlySolarChart` | **Yes — forked** |
| Share donut by category (`anteilsdonut`) | `charts/ShareDonut` | `SocialKarte.DonutTeil` via `ApprovedStoryVisual` | Two drawings |
| Value KPIs (`electricity-value`, `feed-in-value`), columns, outline | `MunicipalChart`→`ApprovedStoryVisual`→`SocialKarte` parts | same | shared ✓ |
| Rank month (`rank-month`), yield (`yield`) | via `MunicipalChart` | `RankStoryChart`, `YieldChart` | shared ✓ |
| Monthly growth (`verlauf`) | `atlas/ZubauChart` / `AnnualGrowth` | `SocialKarte.VerlaufsTeil` | two drawings |
| Current power dial | `GemeindeMonitor.CurrentPower` (+`MastrLiveRadial`) | – | single |
| KPI overview | `dashboard/KpiOverview` + `lib/dashboard/monitor-kpis` | – | shared municipality/district ✓ |
| District race | `landkreis/DistrictRaceWidget` + `public/gemeinde/landkreis-rennen.js` engine | – (municipality podium separate) | engine global script; not the `charts/RaceChart` (different visual, keep) |
| District hero map | `landkreis/RegionKarte` + `RegionScene`/`region-scene.ts` (Three.js) | – | single; municipality hero `GemeindeSzene`, homepage `public/hero-system` are separate scenes |
| Story reader / carousel | `gemeinde/GemeindeInsights` (shared municipality, district, homepage) | same | shared ✓ |

### C. Editorial

- `/admin/redaktion/*` (old): `PostBild` + `SocialKarte`, `lib/social-bildformen.ts` (form rules), approval `lib/social-pruefung-kern.ts` (fingerprint over text+image). **Approval workflow to preserve.**
- `/admin/redaktion/entwicklung-v2`: `StoryConceptLab` renders `MunicipalChart` — i.e. editorial preview already uses the story renderer, but not the monitor renderer, and has no export through the shared pipeline.
- `/embed/story-preview` (admin only) renders `MunicipalStoryPreview`.

### D. Data interfaces

- Municipality: `GemeindePaket` (prepared package) → `charts`, `monitorHistory`, `monitorPeriods`.
- District: precomputed district package (`lib/district-package.ts`, `computeDistrictContent`) → same monitor projection (`districtSolarCells`, periods, stories). Refresh: monthly run step `kreise` + `kreis-pakete.yml`.
- State/country: only old `MastrHeroSection`/`RegionSolarLive`/registry widgets; no package yet.

---

## 2. Contract: one definition per visual

Extend what exists instead of a third registry: `STORY_VISUAL_TEMPLATES` becomes the id
list, and each id gets a definition next to it (new file `lib/visuals/registry.ts`,
importing `DATA_SOURCES` and reusing `WidgetDef` fields/`brandLabel`/`widgetForPlace`).

```ts
type VisualDef<Input> = {
  id: StoryTemplateId;                 // 'anlagenraster', 'energy-year', …
  title: string | PlaceTemplates;      // {ort} via widgetForPlace
  kind: 'chart' | 'tool';              // brand line wording, from widget-registry
  role: dashboard WidgetKind;          // columns in monitor
  levels: ('gemeinde'|'kreis'|'land'|'bund')[];   // allowed regions
  periods: 'current'|'month'|'year'|…;            // allowed periods
  input(pkg, period): Input | Unavailable;        // shared data transform, honest missing state
  sources: DataSource[]; dataDate(input): string;  // source/licence/date — never typed in the visual
  Render: (p:{input:Input; surface:'monitor'|'story'|'export'|'embed'; compact?:boolean}) => JSX;
  controls?: ('period'|'mode')[];                 // live wrapper only
  exports: {aspects:('widget'|'1:1'|'4:5')[]; embeddable:boolean};
};
```

Rules:
- **Render is pure** (no fetch, no selector). Selectors live in the wrapper (`WidgetFrame` + `WidgetSetting`). Surface only switches density/compact, never identity.
- **Export uses the existing pipeline**, not a copy: markers (`ExportIgnore`/`ExportOnly`), `WidgetExportFooter` + `WidgetSourceEdge` fed from the definition, `applyBrightestStage` (unless dark scheme is the defined identity — decision needed, see 5), `captureNodeToBlob`. The story reader's own `story-export-credit` is replaced by the same footer. No UI controls in the image; required notes, source/licence, brand always.
- **Branding** is decided where the image/embed is generated (server or signed config), never only a client toggle; white-label can drop brand, never source/licence.
- Stable config = `{visualId, regionId, period, aspect, variant}` → one URL shape for share/embed/media library (future; no billing now).
- Missing data: `input()` returns an explicit unavailable state with reason; renderer shows it; never zeros.
- Accessibility (role=img + label from data), reduced motion, responsive and loading stay in Render/wrapper as today.

---

## 3. First representative slice: `anlagenraster` (composition)

Why this one: it is forked today (monitor vs story), appears on municipality, district,
story reader and editorial preview, is exportable, and small (≈60 lines each).

Steps:
1. **Baseline before mutation**: screenshots with frozen data (one municipality package +
   Landkreis Würzburg package saved to `/tmp/atlas-regions-evidence/baseline/`) — monitor
   desktop 1440 / mobile 375, story reader card, story PNG export, editorial V2 preview.
2. One `CompositionVisual` renderer (monitor geometry incl. responsive columns; `compact`
   from story CSS), both CSS modules merged into one; `MonitorComposition` and
   `InstallationCountChart` become thin re-exports, then removed.
3. Definition `anlagenraster` in `lib/visuals/registry.ts` with `input()` taken from the
   existing `MonitorWidget` period logic (moved, not rewritten).
4. Monitor wrapper gains the standard footer actions (share/download) through
   `WidgetFooter`; story reader and editorial preview render the same definition.
5. Export through the existing pipeline; `e2e/widget-export.spec.ts` style check that the
   PNG has source + brand + no controls; pixel/visual comparison against the baseline.
6. Review checkpoint with images (monitor, story, editorial, PNG) — then extend.

## 4. Migration checklist (after the slice is accepted)

| Stage | Visuals | Owner |
|---|---|---|
| 2 | `energy-year`, `radial` (merge the two forks each) | Claude impl., Codex visual fidelity check |
| 3 | `anteilsdonut` (ShareDonut vs DonutTeil — pick ShareDonut for monitor, verify story identity), value KPIs, `verlauf` | Claude / Codex review |
| 4 | Current power dial, KPI overview (definitions only, already shared) | Claude |
| 5 | District race: wrap engine in a definition (export = still frame + footer; video later), hero map: definition with `exports: none` first | Claude; Codex for scene fidelity |
| 6 | Editorial: V2 lab selects registered visual + validated region/period; preview = same Render; approval via existing `social-pruefung` fingerprint over config | Claude |
| 7 | State/country adapters on the district package pattern (members incl. kreisfreie Städte, sum of towns, not of districts), Bavaria reference, review before live | Claude |
| 8 | Old registry widgets (energy mix, calculators): keep; map `WidgetDef` into `VisualDef` fields so both lists come from one source | later |

Ownership: Claude implements and verifies (tests, rendered comparisons); Codex/root
reviews visual fidelity against the approved design; operator decides design questions only.

## 4b. Slice result: `anlagenraster` (25.09.2026, second round)

- One renderer `components/charts/CompositionChart.tsx`, layouts `monitor` and `story`
  (+`compact`), each with its own accepted stylesheet; same cells and arc for the same data.
- One identity: widget-registry entry `gemeindeAnlagenraster`; the template catalog
  (`STORY_VISUAL_TEMPLATES`) names it (`widget`) and carries the monitor title/kind.
  A template with `widget` is migrated; others keep the story reader's legacy credit.
- Monitor share/download: `components/dashboard/ExportableWidgetFrame.tsx` wraps the
  existing `WidgetFrame` with the existing `WidgetFooter` (on-site, no CTA),
  `ExportNotesProvider`, `WidgetSourceEdge`, `WidgetExportFooter` and `useChartExport`
  (mode node). Selector ExportIgnore'd, chosen state printed as text. Municipality and
  district monitors.
- Export palette: default = brightest (rule unchanged). Atlas tokens have their own
  light scheme; `EXPORT_BRIGHTEST_ATTR` on the exported widget + `EXPORT_CAPTURE_ATTR`
  on the capture wrapper make the dark Atlas rule yield inside captures only
  (`:where(:not(...))`, specificity unchanged — a bare `:not` changed the live story
  teaser). Story card export background uses the stage token `--color-bg-page`.
- Evidence: `/tmp/atlas-regions-evidence/` (capture-script.mjs, slice-before = b156cfbe,
  slice-after = this state, same packages, same dev server). Live: reader and teasers
  pixel-identical; monitors identical above the new action row. Exports: four light PNGs.
- Tests: composition-arc (layouts, identical data), export-brightest-scheme (specificity +
  capture marker; two sabotages red), e2e widget-export "Gemeinde-Monitor: Anlagenraster"
  (sabotage without the brightest marker red), landkreis-vorschau arc assertion updated
  (it asserted the pre-arc round-cap circle).
- Editorial V2: checked visually by the Codex coordinator in its logged-in in-app
  browser (Höchberg, composition, year profile, month recap incl. day change,
  play, pause, reset); nothing saved or published. No frozen before-state exists
  for the editorial, so no pixel-equality claim there.
- Found for later stages: homepage story strip uses a prebuilt bundle with its own chart
  copies; legacy (not yet migrated) story PNGs stay dark until migrated.

## 4c. Stage 2: `energy-year` (26.09.2026)

- One drawing `components/charts/EnergyYearRadial.tsx`; the monitor (year + energy
  selectors) and the story (header, day selector, footer) keep their wrappers and
  their accepted geometry as explicit layouts (viewBox, 20 MWh scale floor, figure
  formats, tooltips). Identical day bars for identical data (test).
- Registry entry `gemeindeEnergieJahr` (ERA5 archive + MaStR), referenced by the
  template; story export uses it only for data from our ERA5 archive
  (`exportProvenance`), older Open-Meteo packages keep the legacy credit.
- Monitor (municipality + district) through `ExportableWidgetFrame`; selectors
  ExportIgnore'd, year/energy type printed, hover-only legend forced into the image.
- Shared pipeline fixes found on the way: the source edge was hidden on the page and
  could not fit its type (two sources were cut at both ends) → laid out invisibly on
  the page, two columns for two sources; export CSS on the CAPTURED node itself was
  never applied (`applyExportMarkers` only saw descendants) → root included. No
  other widget carries export CSS on its root (checked all `chartRef` hosts).
- Corrected finding: an earlier note said district wind days pass the outer ring and
  reach the source column. Wrong — the scale is ceil(peak/20)*20, the drawing stays
  within radius 247 of the 284 half-viewBox; the reserved source lane is never
  reached (checked in the district 2025 PNG).
- Pre-existing, noted: story layout writes MWh/GWh by hand (not the unit formatter);
  share text of the registry entry says "Solar und Wind" also for towns without wind.

## 4d. Stage 3: `radial` solar month recap (26.09.2026)

- One drawing `components/charts/MonthlySolarRadial.tsx`; monitor and story keep
  state, playback, controls and wrappers. Explicit layouts: monitor midnight at
  the bottom, unit formatters, centre follows the shown day (fading), accent total
  in the compact tile; story midnight at the top, MW/GWh as printed before, centre
  = month total, larger backdrop modules in the compact card.
- Equivalence against the old code (9276c7c3) with identical data: monitor
  full/compact, story full/compact/reader render the same markup; only change:
  the story's day tooltip was empty before (multi-child <title>), now filled.
- Registry entry `gemeindeSolarMonat` (ERA5 archive + MaStR) referenced by the
  template; story export only for ERA5-archive data. Monitor (municipality +
  district) via `ExportableWidgetFrame`; month selector and day/playback controls
  ExportIgnore'd, month (and chosen day) printed.

## 4e. Header tile (compact month recap) and remaining visible deviations (26.09.2026)

- Header tile `/embed/gemeinde/<ags>/kopf?widget=radial`: rendered before (9276c7c3
  wrappers, verified the shared renderer was NOT in the served code) and after
  (verified it WAS), desktop 1440 and mobile 375, four identical phases (reduced
  motion; page clock frozen and advanced 100 / 2300 / 4900 ms; CSS animations
  settled): 0 px difference in all 8; repeat capture also 0 px.
  Captured as the tile page itself (white, without the host page's dark hero).
- Remaining visible deviation (intended, not pixel-identical): on the district page
  at desktop width the month recap card is stretched to its row; the new export
  action row now uses its former empty space, so the day controls sit higher.
- Decided (not open anymore): exports use the brightest stage by default (Atlas
  visuals via the light Atlas scheme); the story credit is replaced by the shared
  export footer for migrated templates.

## 5. Open decisions for root / operator

- None technical. Visible user acceptance of the local result is pending before merge.
  (Export palette and story credit were decided by root on 25.09.2026; see 4e.)

## Regional completion audit — 26 September 2026

- Regression traced: release fccc34e9 removed the municipal annual-growth data
  grouping and mount. Restored from register.series using the shared AnnualGrowth
  widget; confirmed rendered for Guentersleben and Ochsenfurt. No new data source.
- Municipality monitor now also wires category donut, electricity value,
  feed-in value and current power into the existing shared export frame. Monthly
  playback exposes the same current/final image and video actions as the district.
- Municipality class explanation uses a viewport-positioned top-layer popover:
  the old fixed tooltip inherited an offset from its transformed page ancestor.
  Verified visible in Ochsenfurt and Escape dismissal. Hover, focus, click/tap,
  outside dismissal and viewport repositioning use one implementation.
- Bayern and Deutschland render the shared regional map, race and five register
  widgets. Removed the duplicate legacy annual-growth block only; per-capita
  comparisons, ranking links and international comparison remain. State/country
  subscription button is omitted because only municipality/district dialogs exist.
- Local checks: TypeScript, 26 district/registry tests, Bayern widget menu,
  Deutschland menu at 375px without horizontal overflow. No production release.
- Still deliberately outside this register-based transfer: aggregate live weather,
  energy/monthly story packages for state/country; standalone chart embed routes
  and a general user-facing widget configurator. Safari video path remains untested.

Shared-widget follow-up: municipal monitor links now point to their host page,
pass the chart parameter into the monitor and use the existing full-screen iframe
modal handoff. Opening the Ochsenfurt electricity-value link and closing it were
verified: modal fills the viewport; closing removes the parameter, restores normal
iframe layout and page scrolling. Seven available Ochsenfurt monitor menus verified.
Its downloaded PNG was inspected: light background, contrast ink, selected August
2026, place and sources intact. TypeScript passes after the final change.
Regional preview checks also found/fixed a duplicated site header and municipality-
only race accessibility wording on higher levels. Bremen renders with two cities.
These higher-level checks remain local; finish shared-widget acceptance first.

### Shared explanatory tooltips (26 September 2026)

`components/InfoTooltip.tsx` owns positioning, theme inheritance, hover, tap, keyboard and dismissal. React widgets use `<InfoTooltip title="…" label="…">…</InfoTooltip>` (omit `label` for the help icon; use `trigger` for custom visuals). Export notes remain enabled by default. GlossaryTerm retains its first-mention registry and delegates rendering/interaction to InfoTooltip.

Legacy ranking markup declares a `[data-info-tooltip]` wrapper with hidden `[data-tooltip-label]` and `[data-tooltip-content]` children. `InfoTooltipBindings`, mounted once by GemeindeSkripte, renders the same React component into that wrapper and handles replaced ranking content. It reads text and line breaks only. No separate positioning, click handler or tooltip CSS belongs in ranking scripts. Chart value hover readouts are separate from explanatory help.

### Release scope confirmed by operator — 26 September 2026

Ship the shared widget foundation and municipality/district/state/country integration first. General widget settings, configurable standalone embeds and optional primary hero footer sharing are explicitly deferred; they are additive follow-up work, not release blockers. Existing unavailable embed actions must stay honest.

Accepted-component reuse is required by the frontend instructions. Architecture guards cover the shared frame/menu/modal/source-footer/export pipeline, tooltip, settings and current chart consumers (composition, month, year, current power, growth, regional map). New accepted components must add their consumer contract; existing data-value hover exceptions are not permission for custom explanatory tooltips.

Safari verification (native macOS Safari, 26 September 2026): actual options-menu downloads completed for racing and monthly radial. This installed Safari selects supported VP9/WebM. Both files decode without errors and contain all 60 sampled frames; inspected first/last frames show 2000→2026 and 1 August→month total respectively, with light palette, place, date and source attribution. Recording is slower than Chromium; iPhone Safari was not separately exercised. Files: `solar-check-race-Landkreis Würzburg-2.webm` (1200×1195), `solar-check-radial-09679-2.webm` (480×903).

Release checks: 59 focused architecture, tooltip, widget convention, export palette, composition, district content/monitor/energy and registry tests pass. TypeScript passes. These checks do not themselves prove deployment.
