# Central visual system — inventory, contract, migration plan

Status: **checkpoint for review (25.09.2026), no broad migration done.** Scope: user
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
- Not covered: editorial V2 page not rendered (admin session needed; see status file).
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
- Known, not changed: the district year profile draws some wind days beyond the outer
  ring (also live); in the image they reach the source column.
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

## 5. Open decisions for root / operator

1. **Export colour scheme**: existing rule renders images on the brightest day stage; the
   atlas visuals are designed dark. Keep dark as the defined identity for atlas visuals
   (recommended — the approved design is dark) or force light?
2. Story-reader credit line → replace by the shared footer (recommended; slight visual change in the PNG only).
