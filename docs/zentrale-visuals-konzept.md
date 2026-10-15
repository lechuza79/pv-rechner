# Central visual system and regional pages

## Current implementation status — 12 October 2026

The curated catalog contains 42 widget identities. Existing variants use the
same registry, presentation contracts, dashboard renderer and data bootstrap.
The inventory mounts at most eight views per page; all variants remain reachable.
The two full applications (`simulation`, `rechner`) and the funding questionnaire
remain applications/tools, not artificially reduced chart cards.

### Migration audit

| Existing family | Shared implementation / retained variants |
| --- | --- |
| PV and heating cost races | `RaceChart`, `KostenrennenWidget`, `HeizkostenrennenWidget`; existing full and PV mini presentations, same calculations and event controls. The already existing PV mini is now a registered hero presentation. |
| Heating comparison | `GruengasWidget`; complete composition, bars and lines remain explicit variants. |
| National generation and trade | `GenerationMixWidget`, `ErzeugungWidget`, `NuclearShareWidget`, `NuclearDailyWidget`, `ElectricityTradeWidget`; existing full, compact, teaser, radial, bars and totals retain their supported combinations. Totals do not acquire a fictitious compact/hero view. |
| Country/world comparisons | Country mix race, per-capita race, capacity race, electricity race and static renewable growth use their existing shared chart owners. Capacity and electricity export units are GW and TWh, not the cost-race default euro. |
| Historic tariffs and solar growth | `FeedInTimelineWidget`, `ZubauWidget`; article, dashboard and embed use the same components. Tariff year preparation lives in `lib/feedin-timeline.ts`. Old import paths re-export these owners. |
| Registry summaries and national map | Existing map, plant composition, metric tile and solar trend components retain their data and actions. `MastrMetricWidget` and `EeAmpelWidget` no longer live in embed routes. |
| Municipality/district/state | Existing regional map/race, top three, current power, annual growth, composition, KPI group, monthly solar, annual energy, solar value and tariff value use the shared monitor/chart families. State and older municipality addresses remain adapters. |
| Topographic landscape and small weather views | `LandscapeWidget`, shared landscape cards, `WeatherMicroTile`, solar and wind profiles retain their scene/data owners and declared geometry. No new scene or layout variant was introduced. |
| Ten active municipal story templates | `MunicipalWidgetVisual` dispatches monthly additions, electricity value, feed-in value, plant composition, columns, share donut, yield, annual energy, monthly solar and ranking. Reader, standalone widget, reduced preview and editorial ideas use this same dispatch. |
| Older editorial design examples | `EditorialStoryVisual` preserves facts, column sequences, shares, project, timeline, rank example, donut fallback and bars. The common body exposes these only with an explicit editorial-draft option; they do not become published stories or fabricated live data. |
| Existing social poster formats | `SocialKarte` remains the shared poster renderer for feed, placement modal, story card and template gallery; `ApprovedStoryVisual` reuses its parts. Poster framing is an output format, not another live widget identity. |
| Funding questionnaire | `FundingCheckWidget` uses the existing calculation engine and common source/action components; its embed address remains unchanged. |

`MunicipalChart` is a compatibility adapter. The ten active story templates are
covered by actual existing report data in full and reduced rendering tests.
Drafts retain their original markup and cannot silently enter the live story
selection. Historic source identities stay attached to their snapshots.

Presentation support belongs to the parent in `widget-registry.ts`. Gallery links,
dashboard configuration and source conversion use that same contract. The retired
`atomstrom-anteil-hero` catalog identity is gone; its accepted graphic remains the
registered preview of `strommix-anteil`. The static homepage story entry also builds from `GemeindeInsights` and therefore
`MunicipalWidgetVisual`, via `npm run homepage:stories`. Its 33 approved snapshots,
labels and six-card selection order are retained. The old script address is a
compatibility export; package takeovers cannot overwrite this shared build.
The route-implementation debt list is now
empty, with compatibility exports for existing consumers. No CSS, plot geometry,
button style or full-view control was redesigned in this migration.

### Local acceptance server

Use the existing managed preview in built mode for a complete-gallery acceptance
run: `WIDGET_PREVIEW_DATA=live npm run build`, then install the local supervisor
with `python3 scripts/local-preview/install.py --mode built`. It stays bound to
127.0.0.1:4319 and starts only on explicit request. Rebuild after code changes;
this mode does not hot-reload. Development mode remains available for small edits.
The explicit local live-data mode shares the same disk cache and read-only proxy
as development; Vercel deployments ignore it to prevent self-proxying.

### Acceptance evidence — 12 October 2026

- Production build passed with the explicit local live-data setting. The managed
  built preview serves the reference, inventory and story routes on port 4319.
- Browser: cost full → hero → full updates the mounted frame correctly and leaves
  the adjacent heating variant unchanged. All five energy inventory pages loaded.
- Browser: layout reference checked at 375 and 1440 px without document overflow;
  current solar power and the topographic scene rendered with actual data.
  This initial check missed an internal race-chart overflow: a host-level flex
  rule overrode the renderer's wide grid, collapsing the plot and moving playback
  below the card. Internal arrangement now belongs to `RaceChart`; allocation
  styles no longer compete with its container query. The dedicated
  `e2e/race-dashboard-layout.spec.ts` checks plot, explanation and player bounds,
  rather than treating a correctly sized outer card as sufficient evidence.
  Narrow races also report the measured header, wrapped explanation, timeline
  and player height plus a readable plot minimum to the composition. Nested
  groups propagate this content minimum and move following siblings accordingly;
  widening releases it again. The feedback excludes allocated plot/card height,
  so it does not recursively grow the grid or change another presentation.
  Follow-up browser checks passed for both races at 390 and 1440 px, including
  narrow-to-wide resizing, event navigation and the generated dashboard embed.
  The PNG download retains the data, unit and source; its annual caption is
  metric-neutral so capacity is not incorrectly labelled electricity generation.
- Browser: Storyview opens the shared reader; PNG download includes data, unit,
  sources and date. The homepage's preserved cards open the same reader and export
  successfully at 375 px. A CSS-name collision in the static bundle was fixed by
  retaining scoped module names; the narrow view was then rechecked.
- Browser: tariff milestone navigation and PNG download work; the funding
  questionnaire advances through its existing questions.
- One hydration recovery was logged during the initial inventory pass. Direct
  reload and the same page transition were repeated without errors. This is not
  evidence of exhaustive browser coverage of every possible configuration.
- Automated coverage renders all ten active story templates and all 33 preserved
  homepage snapshots in full and reduced form, plus compatibility and source
  conversion checks. Local supervisor tests pass (12 tests).

Release gates remain separate: authenticated admin save/reopen,
hosted dashboard storage setup and production acceptance are not implied by this
local renderer migration. Historical sections below describe intermediate states
and do not override this audit.

## Verbindliche Systemregel — 8. Oktober 2026

Ein Chart hat eine gemeinsame fachliche und visuelle Grundlage. Onsite-Vollansicht,
Whitelabel-Embed, kompakter Hero-Teaser und Storyvisual sind deklarierte Ausprägungen
mit unterschiedlichen Aufgaben. Datenebene (z. B. Anteil oder je Einwohner),
Darstellungsumfang (kompakt oder vollständig), Einsatzort und Exportformat sind
unterschiedliche Einstellungen; eine Änderung der Darstellung darf die Kennzahl
oder den Zeitraum nicht stillschweigend ändern.

Vor jeder Umsetzung entscheiden und kurz begründen:
1. Gilt die Änderung für den gemeinsamen Baustein und damit seine Verbraucher?
2. Braucht es eine wiederverwendbare Ausprägung mit klar definierten Auslassungen?
3. Ist es eine begründete Einstellung nur dieser Instanz?

Gemeinsam bleiben Berechnung, Datenherkunft und Aktualitätssemantik, Einheiten,
Farb- und Schriftregeln sowie Quellen-/Exportkonventionen. Ausprägungen dürfen
Details reduzieren und das Layout ändern, aber keine zweite fachliche Wahrheit
erzeugen. Hostseiten ordnen an und verlinken zum Elternchart. Nicht jedes Chart
braucht einen Teaser oder jede andere Anwendung. Bestehende Kataloge erweitern;
keine parallele Registry und keine erzwungene Universal-Komponente.

Die Galerie sammelt alle aktuellen Charts und zeigt jeweils verfügbare Varianten.
Experimente dürfen separat entstehen; vor Abschluss werden sie integriert und
ersetzte Sonderlösungen entfernt. Nötige Altadressen bleiben als dokumentierte
Adapter auf denselben Baustein erhalten. „Aus der Galerie ausgeblendet“ reicht
nicht als Bereinigung. Prüfungen richten sich nach den betroffenen Familien und
Anwendungen; keine Vollständigkeitsbehauptung ohne entsprechenden Nachweis.

### Widget sizing contract

Standalone embeds retain content-driven height and their normal width limits.
Allocated layouts explicitly use `layout=allocated`: the host sets the iframe
rectangle and the shared presentation fills it. The registry's optional
`supportsAllocation` flag gates adoption; unsupported widgets retain natural
height. Do not infer allocation support from chart name or appearance.

Cards and plots have different dimensions. Measured headings, controls and
padding consume part of the card; the remaining plot area is flexible for cost
curves and trade bars, while trade radial plots fit a square into both available
dimensions. Two stacked cards plus their gap equal the adjacent full card.
Internal scrollbars and diagnostic overflow notices are not layout solutions.

The first allocated consumers were the shared cost-race renderer and electricity
trade (full/compact, radial/bars). Allocation now follows each registered presentation
contract; content-driven families retain their natural height.
The reference composition remains a CSS Grid prototype, not a GridStack install
or a general constraint solver. Its explicit responsive layouts must leave enough
space for readable controls; arbitrary user resizing is not yet supported.

Use `WidgetGrid` for equal columns or a feature column with explicit side stacks.
Container width determines collapse; DOM order stays the reading order. The
isolated `/widget-galerie/layout-referenz` page demonstrates both arrangements
inside the gallery content frame. It uses the shared bare embed preview; gallery
labels and configuration controls belong to exploration, not dashboard examples.
No dashboard framework is required for these static compositions. Reassess that
choice if users need to drag, resize and persist arbitrary dashboard layouts.

New widgets must declare only real supported variants, reuse shared controls,
themes, metadata, export and source handling, and supply their plot renderer.
Check narrow and wide containers, long values, empty/loading states, and both
onsite and external embeds before claiming the variant ready.

Generated external embed code includes `/widgets/resize.js` for automatic height.
It accepts height messages only from the embedded frame and its source origin.
CMS environments that prohibit scripts can choose iframe-only fixed height;
that fallback cannot automatically adapt its height and may need scrolling.
This is a bounded implementation, not a completed all-chart layout audit.

Gallery previews seed the selected appearance in the initial embed request.
Subsequent appearance changes use the shared message channel without navigating
the iframe. The initial URL must stay stable until data or variant changes.

### Dashboard loading and partner compositions — agreed direction, 11 October 2026

Implemented: onsite dashboards render registered widget components directly with
shared initial data and background refresh. Widget options, sharing, downloads,
source attribution, data configuration and appearance remain on the shared frame.
The layout reference uses direct renderers; variant exploration and external
embedding retain their iframe boundary.

Partner embedding must support both a single widget and a configured composition
of registered widgets. A composition uses the same nested layout definition and
widget renderers as onsite dashboards; its external embed wraps the composition
once. The implemented `/embed/dashboard` host uses this same composition. Saved
versions are immutable; their hosted storage rollout remains a separate release gate.

The compact trade radial now draws the daily net balance as a connected line;
full views retain daily spokes. Missing observations break the line. Both plots
and balance annotations use one direction rule: export minus import, negative
in the theme accent inward/downward, positive neutral outward/upward.

### Widget gallery entry and exploration

The widget landing view introduces embedding using the revised copy from the
previous energy-widget page. It demonstrates the existing three-chart regional
combination, followed by editorial application examples that reference existing
catalog entries. Topic views retain the full exploration controls and optional
compact variants. Navigation persists the selected place and topic in the URL;
browser back restores the previous view. Examples never define separate chart
renderers or data. Contact and source attribution remain shared page components.

### Begrenzte Bestandsprüfung vom 8. Oktober 2026

Geprüft: lokale Widget- und Galeriekataloge, Atom-Teaser/Elterncharts, gemeinsamer
Exportzugang sowie der bisherige Konzeptvertrag. Kein vollständiger visueller
Durchlauf aller Charts; keine Aussage zur vollständigen Veröffentlichung.

- Atom-Hero verwendet inzwischen die Elternkomponenten NuclearShareWidget,
  NuclearDailyWidget und ElectricityTradeWidget statt eigener KPI-/Plot-Kombination.
  Galerie unterstützt optionale kompakte Varianten am Elternchart.
- Restschuld: `nuclearShareHero` / `atomstrom-anteil-hero` steht weiterhin als
  eigene Identität im Widget-/Abschnittskatalog, obwohl in der Galerie verborgen.
  Verbraucher/Altadressen vor Entfernung prüfen und auf den Elternchart abbilden.
- Restschuld: Variantenfähigkeit steht teilweise im Galeriekatalog
  (`compactParams`), die Reduktionsbeschreibung separat in AtomHeroPreviews.
  Fähigkeit und Vertrag sollten am bestehenden Chartkatalog zusammengeführt
  werden, damit weitere Hosts dieselbe Definition verwenden können.
- Export hat zwei begründete Wege: komponierte SVGs für eingebettete Einzelplots
  und DOM-Erfassung vollständiger Karten. Nicht blind vereinheitlichen, sondern
  denselben Metadaten-/Theme-/Quellenvertrag über beide Wege absichern.
- Der ältere Konzeptabschnitt empfahl eine weitere Registry und eine helle
  Exportpalette. Diese Vorschläge sind durch die Betreiberentscheidungen zur
  Wiederverwendung bestehender Kataloge und zum sichtbaren Export-Theme überholt.

Kleinster nächster Integrationsschritt: Atom-Variantenvertrag am bestehenden
Katalog bündeln, alte Hero-Identität nur noch kompatibel darauf abbilden und
Galerie/Hero/Embed gemeinsam prüfen. Keine pauschalen Änderungen an Datenabruf,
Aktualisierungstakt oder bereits akzeptierten Chartgestaltungen.


## Region map trackpad zoom — 28 September 2026 (local, not released)

The shared `region-scene.ts` binds `public/shared-3d/trackpad-gestures.js` in
`pinch-only` mode. The helper and declaration were copied unchanged from the
uncommitted Hero worktree handoff; no Hero scene changes were imported. Ctrl-wheel
and Safari incremental gesture events zoom only on the map canvas. Ordinary wheel
scrolling remains uncancelled; existing touchscreen pointer gestures stay with
OrbitControls. The old capture-wheel gate now allows pinch through. The adapter
uses the installed public `dollyIn`, retains zoom limits 0.7–3, stops spin, delays
auto-rotation, invalidates rendering and disposes the shared listeners.

Local verification: four supplied gesture tests and four map-adapter tests pass,
including actual Three.js orthographic zoom direction/limits, invalidation, disabled
controls, ordinary scrolling, the capture gate and teardown. Physical MacBook pinch
was not exercised; no rendered browser acceptance or production release is claimed.
The existing Hero preview was left untouched.
## Lauenburg map follow-up — 28 September 2026 (local, unreviewed)

The map heading previously reserved a fixed 250px for an independently positioned
metric control. The local correction uses a shared grid row with the control's actual
width, a 32px gap and a wrapping title using the central hero-size token. The map canvas
retains its shared row and existing framing. The developer replay button “Gesten zeigen”
is now development-only; the normal metric selector and automatic touch tutorial remain.

Bounded geometry comparison using the actual `projectRegions` function and checked-in
boundaries: Lauenburg 133 shapes / 136 polygons / 2,833 points / 47 trees; Wittenberg
9 shapes / 9 polygons / 1,012 points / no trees. This is scene complexity evidence,
not an FPS measurement or proven stutter cause. The map renderer and frame pacer have
no 28 September changes in the inspected main history. The local trackpad commit
`69ab9f7e` is not an ancestor of that main and was not included in this correction.

CSS and TSX parsing and whitespace checks passed. Browser control timed out twice;
direct public reads for both pages returned Vercel Security Checkpoint instead of
page content. Desktop/mobile visual acceptance and Safari frame-time comparison
remain open. No performance change or production deployment was made.
## Download follow-up — 28 September 2026 (local, not released)

The shared options menu now places its keyboard focus ring inside each item instead
of inheriting the Atlas outline with a positive offset. Flyout height is bounded by
available viewport space. The download group offers “In Ihrem Design — Anfragen”
with widget, place, selected state and deep link prefilled in the existing contact
form under “Widget im eigenen Design”; nothing is submitted automatically. The
shared analytics action `design_contact` identifies these clicks by widget and scope.

Video encoding waits for a hidden document to become visible instead of discarding
the export. The overlay distinguishes paused/working states; capture interrupted by
a tab switch is repeated at the same timeline position. Removing the chart still
ends the export with a specific error. Closing/reloading the page is not resumable.

Seven focused tests pass, including a tab switch during capture with identical
encoded frame times after resumption; TSX/CSS syntax and whitespace checks pass.
Browser control timed out and the local Next preview did not respond within bounded
requests, so no rendered acceptance or real-browser MP4 run is claimed. The temporary
preview server and fixture were removed. Visual desktop/mobile and browser background
export acceptance remain open before release.

## Release closeout — 28 September 2026

**Published, not merely a local preview.** The shared widget release reached `main`
as `60029ab7` on 27 September 2026; Vercel deployment succeeded. Public Wittenberg
and its action flyout were browser-verified. The release passed 5,310 unit tests.
The shared monitor composition is used by municipality, district, state and country
adapters, with availability determined by each level's data.

Follow-up `c801f8ad` was published on 27 September: readable primary text for the
standalone/light current-power number while preserving the Atlas accent; final race
ranks now settle immediately with reduced motion. Related menu/export expectations
were updated. 5,328 tests passed (3 skipped), deployment succeeded, and the public
Bayern funding page was confirmed to render the primary-text token. These checks do
not mean every project-wide browser check was green.

**Data activation is separate from deployment.** The 27 September package run
published 17 state/country packages; the weather run wrote the regional daily file,
but only 14/17 regional curves were available. Schleswig-Holstein, Rheinland-Pfalz
and Germany still had missing inputs in those runs. See the dated evidence and
verification limits in [the data handoff](land-bund-energiemonitor-daten.md#release-and-activation-closeout--28-september-2026).

Two CI findings were handed to the coordinating task and were not fixed by this
widget patch: the roof-shape flow losing its question/state (`e2e/empfehlung.spec.ts`)
and the missing floating ranking-header copy (`e2e/ranking-fixspalten.spec.ts`).
Their subsequent resolution has not been verified in this closeout.

General widget settings, configurable standalone embeds and an optional hero sharing
footer remain deferred. The accepted racing-chart action footer is already included;
it is not the deferred general hero setting. The current video export uses MP4 with
the shared animation clock; the Safari/WebM evidence below describes the older
26 September implementation and does not certify the final MP4 path on iPhone Safari.

**Historical record below:** dated local checks, missing-data statements and pending
release notes describe their original checkpoints. They are retained for traceability;
this closeout takes precedence for release status.

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

Historical proposal, superseded by the binding system rule above: extend the
existing widget/chart catalogs. Do not create `lib/visuals/registry.ts` as a parallel
registry. The type below illustrates responsibilities, not a new registry mandate.

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
- **Export uses the existing pipeline**, not a copy: markers (`ExportIgnore`/`ExportOnly`), `WidgetExportFooter` + `WidgetSourceEdge` fed from the definition, the current visible theme (supersedes the earlier brightest-stage proposal), `captureNodeToBlob`. The story reader's own `story-export-credit` is replaced by the same footer. No UI controls in the image; required notes, source/licence, brand always.
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


### Shared chart units — operator rule, 2 October 2026

- Comparable values within one chart use one shared unit. Never select units independently per bar, municipality, row, or data series of the same quantity.
- Select the unit once from the common comparison range for the current frame, then apply it atomically to every value and unit label. For solar-capacity racing: kWp below a frame maximum of 1,000 kWp; MWp from that threshold onward. A rank crossing alone must not change the unit.
- Use the appropriate unit family for each quantity (for example kWh/MWh/GWh for energy). Different physical quantities or explicitly separate axes retain their own unit families; never conflate power and energy.
- Switching dataset, region, metric or period recalculates the common unit. Animation, static view, tooltip, image and backend video export must consume the same decision and numeric formatter.
- Keep small positive values distinguishable from zero after switching: 21 kWp becomes 0.021 MWp (displayed as 0,021 in German). Use sufficient precision or an explicit lower-than label for values below display precision. Ranking always uses unrounded source values.
- Tests must cover values on both sides of the switching threshold, identical units for all peers, positive values remaining visibly positive, and export parity.

Implementation status: the regional racing chart implements this rule locally in `lib/race-value-format.ts` and its shared animation engine. This rule applies to all comparable charts and data layers; the existing chart inventory has not yet been fully audited or migrated. Do not describe the rule as a completed site-wide migration.

### Round infographic controls — operator rule, 3 October 2026

- Period selection stays above the graphic: it establishes the data context.
- Day navigation, play/pause and reset form one adjacent playback group. Do not spread them across the card.
- When both groups fit, they share the top row. When card width is insufficient (including narrow desktop grid cards), only playback moves below the graphic.
- The graphic occupies the remaining space, capped in size and with explicit gutters. Page wrappers must not override its geometry.
- `RadialChartLayout` implements this layout; the monthly solar chart consumes it. Apply this shared layout when migrating other round infographic controls. This does not claim all charts have been migrated.


### Quantity headings and exports (7 October 2026)

Use `chartQuantityLabel` from `lib/chart-labels.ts` for standalone quantity
headings: “Anzahl Anlagen”, “Anzahl Anlagen je 1.000 Einwohner”, “in MW”.
Do not apply it to value suffixes: “1.494 Anlagen” and “12 MW” stay unchanged.
Already descriptive labels are preserved. The shared widget frame, legacy SVG
export, municipality shell and story quantity headings consume this rule.
Export metadata uses the supplied data vintage, comparison scope and quantity;
interactive selectors must be replaced with their selected descriptive label.
Keep source credits readable in both DOM and composed exports.

The complete export-entry inventory and date/quantity contract are documented in
`docs/chart-export-audit.md`. `chartMetadataLabel` is the common formatter; missing
data vintages must never fall back to today. Numeric unit suffixes remain unchanged.

### PNG downloads: designed export, current appearance (7 October 2026)

Downloads use the shared export markers and metadata/footer, not a raw screen
snapshot. Preserve the current palette and live canvas perspective. Replace
controls with selected context in plain text; include the actual data vintage
and descriptive units. Mention the comparison area once. Include Solar Check
branding and license, with restrained source attribution inset from the edge.
General interactive help is not appended automatically; necessary assumptions
and data-gap notes must be supplied explicitly. The plot keeps its camera and
crop; the export shell accommodates metadata and branding. Ranking can select
an explicit aspect ratio, reflowing the layout without switching its palette.

### Optional compact chart presentations (8 October 2026)

A compact preview belongs to its parent chart, not a separate widget identity.
The parent owns both renderings and the same data, period, units and gap semantics.
Gallery entries opt in per data variant with compactParams and expose Kompakt /
Vollständig. No compact mode is implied for unsupported charts. Host hero/story
layouts only arrange equal-sized tiles and link them to the host's full chart;
they do not recalculate values or compose a second independent KPI/plot.
The nuclear share preview omits category cards and legend; the daily preview
uses its existing SparklineMetric; trade omits day labels, hover and breakdown
while retaining its central net quantity. Controls are omitted in teasers.

Allocated variants may declare `minAllocatedHeight` where measured title/control
space requires a lower bound. A square card placement is a host preference, not
permission to violate that bound. Keep the plot square within the resulting card.
The reference's `frame` setting controls placement independently of data variants.

### Reusable compositions and delivery (8 October 2026, afternoon)

`WidgetComposition` renders declarative area/row plans with native CSS Grid.
Plans use their container width, not the browser width. The same component can
be nested: a full chart and two compact variants form one outer grid area.
Use explicit empty areas for genuine spare space, never internal scrolling to
make a plot fit. The shared grid units are 48 px with 24 px gaps; content tracks
may grow, and allocated charts consume the rectangle their host provides.
This is a placement layer, not an automatic packing solver or an editor framework.

An embed must acknowledge measurement even when the host listener attached late.
Trade requests reuse successful periods and coalesce across same-origin frames;
failed requests remain retryable. Single regional widgets use the existing chart
renderers through a small adapter rather than mounting a complete monitor.
A grouped KPI view owns one period control; its single-KPI presentation is a
compact variant of that same registered widget.

Image clones inherit layout tokens rather than freezing inherited values on
every descendant. Refit DOM plots after swapping controls for metadata. Podium
screen and export share `fitPodiumPlot`; formats remain explicit user choices.

### GridStack slot pilot — 8 October 2026, evening

The local layout reference now uses `WidgetSlotGrid` with GridStack 14; the
earlier CSS Grid prototype remains for its existing consumers. This supersedes
the earlier statement that the reference does not install a grid engine.
React owns card content, GridStack owns only slot geometry. Explicit responsive
plans allocate whole rows and columns; nested groups obey the same allocation.
The visible height is span * (48 + 24) - 24 px. Examples and real chart sizing
are developed together; an unsupported size requires another approved variant
or a different slot, never clipping or internal chart scrolling.
Grouped KPI widgets still use content height below the allocated examples until
they support allocation. This is an explicit incomplete integration.
The fixed reference place is metadata; actual chart data still loads in embeds.
Removing its unnecessary database lookup lets the host render independently.
Twelve focused tests passed; visual acceptance remains outstanding because
the browser tool rejected the reload under its URL policy. No deployment.


### Grid formats and independent teasers (electricity trade pilot, 2026-10-09)

- `WIDGET_GRID_SIZES` in `lib/widget-composition.ts` defines the first shared formats:
  small 4 columns / 5 rows (336 px high), medium 6 / 7 (480 px), wide 12 / 7 (480 px).
  Columns refer to the immediate 12-column host, not pixels or the complete page.
- Each presentation opts into supported formats through `gridSizes` in the existing registry.
  Electricity trade maps small to compact and medium to full; wide was removed after review. These are pilot formats,
  not a claim that every existing widget supports them.
- The existing preview/detail component uses the same GridStack adapter as compositions.
  Below the variant's minimum width, the slot spans all columns. The plot still obeys its
  own geometry: circular plots stay square; bars use the remaining allocated height.
- Hero/story is an independent `hero` presentation, without grid allocation. It keeps the
  centered balance and omits axes, trade share and controls. It uses the same data and renderer.
  The Atom hero continues to consume this presentation. No independent story renderer is added.
- Grid and hero share period, chart configuration and theme while switching. Existing full-view
  exports retain the central export frame; teaser presentations do not gain an export menu.
- Nested composition coordinates remain host-owned. A group's internal column spans need not
  match the outer host's column count; shared format heights and chart minima still apply.


### System-wide adoption (2026-10-09, supersedes pilot-only coverage)

The shared catalog now exposes the slot formats independently of chart variants. The eight
starting geometries are strip (12/3), small (4/5), medium (6/7), portrait (4/9), tall (6/9),
list (6/11), wide (12/7), stage (12/9). These are reusable starting points, not an exhaustive
list of mathematically possible grid rectangles. Strip and wide currently have no opted-in
chart in this migration; do not create variants just to occupy every format.

The existing registry is the source of compatibility. `widgetGridOptions` rejects slots below
renderer minimum height and `selectWidgetGridOption` falls back to a supported choice.
A full renderer can fill several sizes without being duplicated. Hero/story availability is
independent of both grid and compact support. Gallery source metadata excludes trade totals
from the radial/bar slot contract; no chart-specific URL parsing lives in the selector.

Current allocation families (12): cost races PV/heating; worldwide capacity/electricity races;
ranking podium; trade; current solar power; regional map; monthly solar profile; country mix,
country per-capita and regional horizontal races. The latter three share measured row pitch
with a 44px minimum and a 768px list card. Normal embeds keep their existing row rhythm.

Three hero/story families reuse existing renderers: trade, nuclear share and nuclear daily.
The latter two continue using their existing `variant=teaser` URLs. No new teaser was built.

All 33 curated families remain in the shared gallery catalog. The extra inventory section on the
layout reference was removed after user review: that page demonstrates compositions, not a second
catalog. Use the existing shared collapsible components wherever expandable UI is needed.
The KPI group remains whole with content-driven height. Twenty other families still lack a
fixed-height renderer contract and retain their previous rendering; they are not marked migrated.
Migrate those by shared renderer family, preserving exports and data semantics. Do not add
fictitious grid support through metadata alone.


## Chart acceptance before further migration — 9 October 2026

A passing catalog/unit test is not visual acceptance. The layout reference is the
integration fixture for registered variants, not a place for separate renderers.

For every chart family, record supported slots and presentations in the existing
registry. Reuse the appropriate layout: flexible Cartesian plot, square radial
plot with independent annotation area, or a composed group with shared controls.
Do not offer a size until its smallest usable container has been checked.

Acceptance covers actual iframe containers at narrow, intermediate and desktop
widths, both themes, long labels and large values, missing data, and selected or
animated states. Check outer width AND height, plot geometry, text collisions,
controls and loading completion. Review the rendered result visually as well.
Affected image/video exports additionally retain theme, units, date, sources and
branding; on-screen geometry alone does not certify downloads.

Current corrective example: full centered trade charts keep the metric inside the
circle and the explanatory caption outside it. Compact centered charts instead
expose that explanation through the shared InfoTooltip on the metric (hover,
keyboard focus and tap), reserving no caption row. Landscape compact cards retain
the side-by-side layout. Small bar annotations overlay the plot without reducing
its height. Allocated cards override natural maximum widths in the shared frame.
The allocated browser suite now checks caption separation, annotation size and
full plot height, in addition to the outer rectangle. New browser assertions must
be run in the normal browser test pipeline; manually inspected examples do not
constitute approval of the entire catalog.

Next migration order: finish and approve one example of each layout family,
retain it as a regression reference, then migrate additional registered charts
in small batches. New chart code supplies data and chart-specific drawing;
frame, controls, caption regions, embeds and export behavior stay shared.

### Responsive composition — implemented local pilot, 10 October 2026

The earlier nine-format placeholder experiment was rejected. Its universal card
ratios and `WidgetFormatGrid` have been removed; they are not the sizing contract.
Legacy `WIDGET_GRID_SIZES` and existing GridStack consumers remain unchanged.

`CompositionItem` and `resolveComposition` in `lib/widget-composition.ts` extend
the existing composition model with chart leaves and nested row/column groups.
A leaf takes its supported minimum width, allocation support and minimum height
from the central presentation contract. Narrow height rules cover extra wrapped
heading/control space. Preferred height can use a bounded share of a stable host
height budget; iframe content reports must never feed back into that budget.

A row needs the sum of its children's intended widths plus the shared 24px gaps.
It stacks when that width is unavailable. Columns derive their width from the
widest child. Group heights follow their children: maximum in a row, sum plus gaps
in a column. Allocated siblings share the resulting height and distribute surplus
by their declared growth weight. A natural-height descendant keeps its enclosing
group intrinsic, so a long KPI group never stretches adjacent charts. Widths below
the recursively derived supported minimum are rejected by the resolver; hosts
must provide that minimum or choose another supported presentation.

`ResponsiveWidgetComposition` renders this allocation in the existing composition
layer using CSS Grid. This bounded example needs responsive flow, not drag/drop or
user resizing, so it adds no dependency and does not replace the installed
GridStack adapter. Existing explicit `CompositionPlan` consumers remain supported.
The same registry, `WidgetEmbedPreview`, renderer, appearance messages, settings
and export pipeline serve the pilot; no chart is reimplemented for this host.

The reference at `/widget-galerie/grid-demo` now contains real PV cost curves,
a compact yearly trade radial, a compact seven-day trade bar chart, and the full
regional KPI group for Nidda. The two trade cards form a nested stack beside the
cost chart. The KPI block retains its own shared period control and natural height.
The host exposes shared theme/playback controls and the established source footer.
At a 320px viewport the host supplies the full 320px required by the cost/KPI
contracts. The cost card reserves 640px below 400px width; compact trade reserves
336px to keep wrapped chrome, plot and metric annotation usable.

The plot remains independent of the card: Cartesian plots use the remaining body,
radial plots fit a square inside it. Hero/story and standalone content-height
embeds retain their separate contracts. No whole-catalog migration or publication
is implied. Current evidence and remaining gates are recorded in
`docs/widget-layout-verification.md`.

### Landscape widgets and wide race explanations — 12 October 2026

The shared WidgetFrame supports an overlay heading for immersive stages. The
landscape widget uses it for its title and actions; instructions and credits stay
in help. Destination navigation lives at the stage bottom and uses shared
WidgetIconButton (canonical 16px icons) and Auswahl (transparent trigger, upward menu). Product-page
hero navigation is unchanged.

Standalone landscape cards reuse LocationMicroCard and WeatherMicroTile with a
widget layout: no fixed scene-sign width, no nested surface, no repeated place
caption. The place label uses WidgetFrame subtitle typography. Place is read
from widget/dashboard configuration, with no settings icon in the public widget.
Registry data settings supply the place selector in the existing configurator;
embeds receive the same configured place. Scene destination navigation remains
public. Unavailable wind sites do not silently switch to solar data.

RaceChart moves the event explanation beside the plot when its container reaches
640px. The explanation surface spans the entire right column, with top-aligned 16px
body text, 32px inner padding and event arrows inside its bottom edge. The plot
has a 40px gap to the panel; its timeline and playback remain below it. Narrower cards
stack and image exports retain their full plot width. Browser checks covered
375px and 1440px, scene flights, help, place settings and a solar-card PNG download.

The default landscape composition spans the full grid, with standalone cards in
the following row. The same scene also fits an explicitly narrower grid slot.
Micro radial curves use one non-scaling pixel in the shared solar/wind renderer.
Compact trade summaries beside the radial plot now constrain its diameter by
both allocated width and height, preventing overflow into adjacent widgets.

### Story hosts and individual story widgets — 12 October 2026

`GemeindeInsights` already supplies the shared story strip and modal reader, used
by `StoryWidget` and `/embed/gemeinde-meldung`. `/widget-galerie/storyview` now
exposes this existing view beside individually placeable story visuals in the
same `WidgetDashboard` used by the layout reference and partner embeds.

The active story catalog has ten templates. Installation composition, annual
energy and monthly solar already had explicit monitor identities. Monthly
additions, electricity value, feed-in value, columns, category share, yield
comparison and monthly ranking now also have selectable single-story sources
under the existing municipality-story identity. They reuse `MunicipalChart`;
there is no new drawing implementation or change to existing story variants.

`view=single&template=…` selects a published story of that template. Sharing adds
the exact story ID; missing snapshots produce an explicit unavailable state,
never a replacement story. Sources come from that story's own metadata, not
from a modern provider guessed from the template. The shared exportable frame
provides the existing help, sharing, image download and embedding actions.

`umriss` remains an old catalog entry without an active renderer-selection branch;
it is intentionally not offered as a migrated story widget. A template without
a published example for the selected municipality is reported as unavailable.
Content-driven story heights remain intrinsic under the existing story contract;
no forced allocation or new compact geometry was added. The initial adapter pass left the reader export fallback separate. The follow-up below replaces that boundary.


### Shared municipal content and saved dashboard versions (12 October 2026)

`MunicipalWidgetVisual` owns the content selection for municipal dashboard cards,
story readers and reduced previews. `MunicipalChart` remains a compatibility adapter.
Detail (`full` or `reduced`), controls and autoplay are independent choices; a host
never owns another drawing implementation. The existing compact drawing is reused
for previews. A distinct hero composition is not introduced without an approved need.
The single-story route supports `detail=reduced` and `switchable=0`; the same choices
are exposed in its existing gallery configurator. Existing callers keep their defaults.

`storyWidgetDefinition` resolves source metadata for both the common frame and the
reader download. Proven registry providers are reused; historical snapshots retain
their own providers. Every reader export now uses shared metadata, source edge and
brand footer. Reader-only centering offsets are removed on the capture clone.

Dashboard configuration includes global appearance, per-instance appearance,
registered grid size, representation, data source and nested arrangement. Applying
an edit validates the complete plan and prepares only the changed instance. New
observations seed the existing shared store; siblings keep their observations.

Saving creates an immutable version through an admin-session-protected endpoint.
The saved viewer and dashboard embed use the same configuration parser and renderer.
Public saved viewers have no editing controls. Local development writes versions to
`scripts/.cache/widget-dashboards`; hosted deployments use the `widget_dashboards`
Supabase table. Apply `scripts/sql/widget-dashboards.sql` before hosted rollout.
There is no production fallback to ephemeral local files. A database failure is a
visible failed save, never a success notification. Versions are not a dashboard
management UI: naming, listing, deleting and updating a stable published dashboard
are future management features.


### Registered story previews and snapshot-preserving switching (12 October 2026)

Individual municipality stories now register the existing reduced body as their
`hero` presentation. The presentation is available only for `view=single`, not
for the complete story reader. Its contract fixes reduced detail and hidden
controls; the configurator does not expose settings that contradict those
omissions. Full story settings and all drawing implementations remain unchanged.

`widgetPresentationSource` switches registered representation parameters while
preserving the selected story snapshot, municipality and period. The story
reference pins each published snapshot and uses the regular variant dialog and
per-instance dashboard update. Shared links retain the presentation. Gallery
contract tests cover every registered hero source, including existing widgets.

Browser acceptance: reduced monthly-solar selection and application succeeded;
its actual PNG contains the title, municipality, period, data date, sources and
shared export footer. The first reverse-switch attempt was interrupted by a
local preview-server restart; it is not counted as passing. Admin save/reopen
and hosted database migration remain separate rollout gates.


## Verbindlicher Abschlussnachweis — 12. Oktober 2026

Der tatsächliche Bestand und die getrennten Nachweise für Umsetzung, Browserprüfung und Veröffentlichung stehen in [widget-system-completion.md](widget-system-completion.md). Frühere Teilprüfungen in diesem Dokument sind kein vollständiger Abnahmenachweis. Der Bestand wird aus dem bestehenden Katalog abgeleitet; es gibt keine zusätzliche Widget-Registry.
## Strommix radar composition (13 October 2026)

`charts/RadarChart` is a shared numeric renderer with fixed category order, an
explicit common maximum and the existing donut accent/neutral palette.
`strommix-radar` adapts the latest generation snapshot into seven stable axes;
wind and coal subtypes are combined, while every generation value except pumped-storage discharge enters the
denominator exactly once. Pumped-storage charging/discharging and physical border
flows are separate plain widgets in the shared EnergyMonitor hero composition.
Each shows its own measurement timestamp; missing battery data stays unavailable.
Border totals require all eleven connections at one common timestamp. The `spiderhero` review variant consumes the renderer
inside the existing WidgetFrame and presentation provider. The map remains below
the live hero. The canonical page uses the split radar hero. The shared playback interpolates
values on a fixed scale and autoplays when visible; standalone radar embeds use
the same renderer and export menu.

The preview now uses shared `SegmentedPowerBars` for charge/discharge, with a
labelled common GW scale (not capacity), a gently pulsing last lit segment and
reduced-motion support. `import-attribution` supplies the generation denominator
to both the existing nuclear calculation and the complete import-mix adapter.
The latter uses the latest complete border timestamp and exact simultaneous
supplier observations; missing supplier mixes remain unassigned, never zero.
Imported storage discharge stays explicit. Import attribution is modelled,
not flow tracing through third countries. The import chart uses the central
CategoryBarChart compact layout and preserves nonzero values below display precision.

Import/export review now uses shared `DivergingBarChart`: category rows, import
left and export right of zero, with one symmetric GW scale. Categories are
renewables, fossil, nuclear, other and storage discharge. Export attribution uses
the simultaneous pool of domestic generation plus gross imports; domestic MW are
converted to GW before weighting. Unknown imports remain in the denominator and
produce an explicit unassigned export share. Missing domestic observations leave
export composition unassigned. This is a proportional estimate, not flow tracing.

### District racing comparison — 14 October 2026 (local preview)

County pages now compose the existing race renderer with two data selections:
counties within their state (excluding independent cities), and municipalities
within the county. `district-race-config.ts` owns the initial preset, optional
public toggle and shared metric/plant category with explicit per-view overrides.
Kaiserslautern retains its private-roof per-capita county comparison; other county
pages retain their municipality/count default. State, national, association and
municipal page races retain their existing single-view integration.

The same `RaceDataControls` editor is used by the gallery and dashboard settings.
The existing dashboard source URL persists the configuration; no second storage
or public settings action is introduced. `comparison=district` enables the
composition on `/embed/regional-race/[county]`; `toggle=off` fixes its configured
view. Only county context offers this composition. The county determines its
state, the selected metric determines title/unit, and the active selection is
used by share links and the existing video request. Only one chart animation is
mounted at a time; switching between the preloaded views needs no new request.

## Strommix radar registration (14 October 2026)

`strommix-radar` is the registered identity of the existing seven-axis chart,
separate from the stacked `strommix` history. `/embed/strommix-radar` supplies
full and `presentation=hero` views to the gallery and common server/dashboard
renderer. The hero/story view omits only the duplicate heading; playback,
illustrations, sources and export stay shared with the editorial page.
`/embed/strommix?darstellung=radar` is a compatibility adapter to that same route.

Both presentations are content-sized. They do not advertise fixed grid slots:
heading, seven labels, playback and attribution must fit without clipping.
`autoplay=on|off` uses the common appearance contract; hero defaults to playback
on visibility, respecting reduced motion. Explicit `at=<ISO timestamp>` selects
the trailing 24 hours ending at an available observation and defaults to paused.
Missing observations show unavailable data rather than another day. This pins
the requested observation time, not an immutable archive of provider revisions.
The common data boundary loads the same generation endpoint as the client.
Live sharing still uses `stand` as a refresh key and selects the latest available
data; it never freezes the currently scrubbed frame. A dated embed shares `at`.

The contribution guide needs no new rule: registry, common renderer, scoped data,
content sizing and compatibility adapters follow its existing delivery contract.
Pumped storage, physical trade and the state map are outside this package.

### Storage, physical trade and state generation widgets (15 October 2026)

`pumpspeicher` and `physischer-stromhandel` reuse the existing power bars and diverging bars through `ElectricityFlowWidgets`; the editorial flow section composes these same exportable widgets. Physical border power in GW remains separate from the existing monetary trade widget. Missing power stays missing and categories and totals share one scale.

`state-electricity-map` now has a standalone route, gallery entry and dashboard renderer. It retains the established dark map, state/sea-area selection, donut, table and export. `jahr` and `selected` belong to each widget instance; the embed does not read the surrounding page URL. The supported three-year window matches its existing picker. These are content-height widgets, without allocated grid support or invented compact variants.
