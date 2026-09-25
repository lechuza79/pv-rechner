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

## 4b. Slice result: `anlagenraster` (25.09.2026)

- One renderer `components/charts/CompositionChart.tsx`, layouts `monitor` and `story`
  (+`compact`), each with its own accepted stylesheet. Monitor and story now draw the
  same cells and the same arc for the same data (test).
- Monitor title/kind come from `STORY_VISUAL_TEMPLATES` (`monitorWidgetRole`); the
  separate map in the monitor is gone. `sources` on a template = migrated to the shared
  export footer.
- Story reader PNG for migrated templates: `WidgetExportFooter` (brand line, CC BY 4.0,
  note "Ort: <municipality>") + `WidgetSourceEdge` (full attribution incl.
  Bundesnetzagentur, licence, data date) via registry entry `gemeindeMeldung`. Legacy
  credit stays for not yet migrated templates. The old credit named the HOST page
  (e.g. "Landkreis Würzburg" on a Bütthard story); the footer names the story's town.
- Rendered comparison (frozen live packages, before = b156cfbe): municipality monitor
  1440/375, district monitor 1440/375, story reader and teasers pixel-identical
  (≤4 px / carousel motion); only the exported PNG changes (footer + edge added,
  story width unchanged).
- Not covered: editorial V2 page could not be rendered (admin session needs the
  service key; reading `.env*` is blocked in this session). Code path is the same
  (`StoryConceptLab → MunicipalChart → ApprovedStoryVisual → CompositionChart`).
- Found, not changed: the homepage story strip loads a prebuilt bundle
  (`public/homepage-study/story-dist`) with its own compiled copy of these charts —
  a further duplicate for stage 6; district composition widget titles use the bare
  category label, municipality adds ": Anteil an Anzahl und Leistung".
- Story PNG remains dark, as before this slice (hard-coded card background): the
  brightest-stage default is not applied to atlas story images today. Unchanged here;
  needs a user decision if it should change.

## 5. Open decisions for root / operator

1. **Export colour scheme**: existing rule renders images on the brightest day stage; the
   atlas visuals are designed dark. Keep dark as the defined identity for atlas visuals
   (recommended — the approved design is dark) or force light?
2. Story-reader credit line → replace by the shared footer (recommended; slight visual change in the PNG only).
