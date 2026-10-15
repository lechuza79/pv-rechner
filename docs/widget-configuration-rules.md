# Widget configuration rules

The public gallery is the overview of retained widgets. The three-card combination is one reusable example within it. New widgets use `WidgetPreviewCard`, `WidgetSettingsFlyout`, `ControlPanel`, `SelectField`, and `WidgetPresentation`. Widget identity and supported presentation/data rules belong in `lib/widget-registry.ts`; the gallery does not define a second registry.

## First supported configuration

- Themes: light, dark, hero (dominant highlight color).
- Artwork: on/off only when an actual background illustration exists. This hides the complete illustration, preserving the accepted compositing and fade.
- Sharing: on/off toggle; when enabled, options menu, secondary footer, or primary footer. Existing export permissions and server jobs remain authoritative.
- Reset beside an overridden field restores the host setting. In the combination, individual settings override shared defaults.
- Map, monthly radial, and podium use equal 520 px cards in the example combination. Other charts retain their own responsive geometry. There is no universal forced height.
- Microcharts retain their compact tiles and modelled absolute power. They share the same model timestamp and use the accepted wind particles. Missing model data stays missing.
- Sources are collected once below the displayed gallery selection; export source information remains in the shared export frame.

## Data families and next supported extensions

| Chart | Current data contract | Suitable extensions, requiring a shared data adapter first |
| --- | --- | --- |
| Regional map | Municipalities in a district; existing metric selector | Districts in a state; installed power, count, power per resident |
| Regional racing | Comparison level, region, plant category, count/power/per resident; saved applied settings | Recognized groups such as top placements; additional registered energy technologies |
| Top-three podium | Three leading municipalities in the district, ranked by plant count | Shared racing cohort and metric selection |
| Monthly radial | Modelled solar power over 24 hours for each day of a month | Wind and yearly selection using the same hourly model contract |
| Annual growth | Solar plant additions by year | Installed capacity additions; consistent comparable units |
| Composition and plant grid | Counts/capacity shares by installation category | Additional technologies with matching count and capacity datasets |
| Current power | Weather-modelled power from the installed local fleet | Explicit solar/wind fleet selection |
| Annual energy | Daily solar/wind model over the chosen year | Additional complete archived years |
| Value and feed-in | Modelled solar value/payment for a selected month | Annual sums with explicit valuation assumptions |
| Micro solar and wind | Today's absolute modelled power; 100 m wind flow | Individual plant models once consumers provide installed capacity and model identity |

Possible extensions are not advertised as working settings. A new selector must bind an actual shared data contract before appearing in the gallery or partner configuration. Comparable charts use one common unit per frame across every member and switch units together; browser, image and backend video use the same rule.

## Reference-set review

Finish the regional map, monthly radial and top-three podium together before expanding the gallery settings. Use the central components for typography, spacing, controls, footer, artwork and icons. Keep accepted icon motifs from `components/Icons.tsx`; normalize optical size and line weight instead of changing their meaning. Verify narrow single cards, the three-column group and wide cards across themes, initial loading, place changes and retry. Report local, visually verified and released states separately.

## Shared reference controls

`WidgetControls` owns segmented previous/value-or-native-select/next geometry and standalone playback/reset icon buttons. `WidgetSetting` consumes that shell for widget steppers and preserves its existing Hero-stage variant. The monthly solar widget uses actual shared instances for month, day, play/pause and reset; consumers own date order, bounds and playback state. An arbitrary selected day shows its date, while the idle peak shortcut says “Bester Tag”. The shared action footer retains its full background and inner button row, with 8 px vertical padding and 44 px button height.

## Autoplay

The optional appearance `autoplay` flag accepts `on`/`off` in the URL and booleans over the existing same-origin presentation channel. Changes and field reset apply immediately without navigating the iframe. Like existing appearance settings, overrides live in the mounted preview's React state; there is no durable save across reloads. Omission preserves each consumer's original default outside the gallery.

Only genuinely wired widgets advertise the toggle: monthly solar's day sequence, regional-map automatic rotation, regional and national racing timelines, cost races, micro-wind particles and the ranking podium's entrance. Disabling racing shows its final ranks; enabling restarts the sequence. Manual monthly playback and the existing export seek/restart channel remain available. Reduced-motion handling remains authoritative. Static solar microcharts and the other unsupported widgets do not advertise autoplay.

## Single implementation across hosts

Every host imports the same `WidgetConfigurationGroup` / `WidgetPreviewCard` and registry capabilities. `GemeindeWidgetGroup` only selects the central `combinationGalleryEntries` definition; it must not duplicate settings or widget markup. Gallery, partner pages and Atlas embeds consume the same renderers. A separate development preview must import the canonical source and proxy embed routes to the same browser origin; copied components and redirects to another origin are not supported integration strategies.

Regional ranking embeds use `getRankingDataForPage`, exactly like the Atlas: validated prepared ranking cells, with its existing database fallback. A district compares its member municipalities; a state compares its child regions. `widgetRankingRows` is the shared podium adapter for municipal and regional readers, preserves equal ranks for ties and highlights only an explicit municipality. Hosts never select a representative municipality for a district.

## National energy widgets

`components/energy` owns the generation mix, nuclear share and renewable/nuclear additions renderers. Their embed routes are adapters; hosts must reuse these components, the shared presentation context and registry capabilities. `EnergyWidgetFrame` adapts legacy flags to `ExportableWidgetFrame`, so actions and export remain centralized. Period and country steppers use `WidgetSetting`; ascending country order is explicit.

On-site instances suppress the visible source edge in favor of the host's source attribution. Standalone embeds show the edge; image export retains attribution independently. The nuclear-share denominator remains German generation plus calculated imported nuclear generation, excluding other imports. Missing imported-nuclear series must not produce a zero share.

### Migration completeness

A working, approved visualization is the migration baseline, not a design proposal. Record its concrete source route, renderer and relevant states before adapting it. Reuse the same implementation; migrate only the host integration (registry, frame, embed, export and source attribution). Do not invent or rewrite titles, status lines, labels, controls, spacing, legends or animations unless explicitly requested. Necessary provenance and methodology stay in the existing information/source surfaces rather than becoming new visible copy.

Move required styles and tokens into the shared component contract: a widget must not accidentally depend on the host navigation or page stylesheet. Do not repair missing dependencies with a parallel embed-specific renderer or a sequence of local visual overrides. Both the original page and embed must consume the same corrected implementation.

Before declaring migration complete, compare the original and migrated renderer with identical data and selection at desktop and narrow widths. Cover overview, region selection, every distinct drilldown level, hover/focus, close/back navigation and export, including long labels. Check text and control parity as well as appearance. A screenshot of the initial state alone is not migration acceptance; the operator must not have to rediscover previously solved behavior. Document any intentional host-only differences explicitly.

A migration inventories and retains all quick presets, period steppers, switches, tool actions and export state before changing appearance. `WidgetPresetButtons` supplies reusable quick ranges alongside the independent year stepper. `WidgetPreviewCard` marks every preview as `onsite=1`; the gallery owns the aggregate source section, while exports keep their source edge. The energy-frame token adapter bridges legacy chart text, grid and tooltip tokens to the shared theme. Semantic series colors require a separate consistent palette review; do not replace categories with one accent color.


## Adding a widget or a meaningful variant (2026-10-10)

The product goal is a reusable widget system with predictable dashboard behavior.
Migrating the retained catalog is an integration stage, not the final goal.

1. Add identity, data selectors, sources and capabilities to `lib/widget-registry.ts`.
   Choose the existing chart family with `widgetVariant`; do not create another catalog.
   Full/compact/hero are different content contracts, not alternative card aspect ratios.
   A compact variant explicitly lists what it omits. A hero remains independent.
2. Reuse the existing data adapter and renderer. Wrap the embed in `WidgetPresentation`
   with its registry identity. Static routes can read presentation queries on the client;
   do not make their data loading dynamic solely for a theme or size control.
3. Decide between allocated plot space and content-driven height. A plot may opt in only
   when it consumes both actual dimensions; declare the minimum card height including
   controls, labels and explanations. Collections, KPI groups and explanatory legends
   grow naturally. They must not be cropped or divided into invented widgets.
4. Cartesian renderers use `ChartViewport`; headers, controls and legends retain their
   size while the plot uses the remaining space. Circular plots fit both dimensions.
   Hosts call `widgetCompositionItem` and `ResponsiveWidgetComposition`. Nest semantic
   rows/columns and let the children's minimum widths determine stacking. The gallery,
   detail preview, grid demo and layout reference must not copy these measurements.
   Legacy grid sizes remain compatibility presets; visible labels do not promise exact
   row counts once the responsive resolver adjusts a card to its minimum requirements.
5. Retain all existing controls and use the validated appearance channel for live
   presentation updates. Loading data must expose `data-widget-loading`; use the shared
   loading primitive where applicable. A missing source is a visible error, never zero.
6. Keep the shared actions, attribution and export pipeline. Detached Cartesian exports
   refit the existing SVG to their actual remaining plot box after metadata and footer
   are added; no second chart renderer is used. Verify a downloaded image, including
   date, selected period, actual unit, axes, source and brand. A passing registry test
   alone is not visual acceptance.

For a new family, extend the shared plot or frame layer and verify its existing consumers
before migrating more widgets. Do not accumulate per-widget height patches in hosts.
The retired standalone nuclear-share hero is no longer advertised as an embeddable route;
its actual implementation remains a variant of the nuclear-share widget.

## Direct dashboards and shared loading (2026-10-11, local implementation)

This section supersedes iframe-per-widget guidance for dashboard hosts. Single-widget
embeds and the embed editor remain supported consumers of the same renderers.

- `WidgetDashboard.server` prepares registered instances and public data snapshots.
  `WidgetRenderer.server` adapts existing embed pages; it does not implement charts.
  `WidgetDashboard` renders those views directly through `WidgetHostProvider` and
  `WidgetPresentation`. The curated 41-widget catalog and 13-instance layout reference
  now use this path, with no iframe per chart.
- `WidgetDataProvider` hydrates a shared resource store from the server response.
  Requests with the same normalized endpoint share observations and in-flight work.
  Refreshes preserve the last successful value. A failed request cannot replace it
  with an empty chart. Initial failures remain retryable; visibility and connection
  changes trigger freshness checks. Historical selections retain their longer TTL.
  Public live preview data continues through the existing validated server cache.
- `DashboardNode` is a portable row/column/grid tree. `dashboardConstraint` derives
  minima, responsive height requirements and intrinsic/allocated behavior from the
  registry. Grid columns reduce when their children no longer fit. Nested groups obey
  the same solver. There are no host-specific widget dimensions. A content-sized KPI
  group grows naturally; its neighbors do not receive invented heights.
- Full, compact and registered hero instances keep separate IDs but share data when selections match.
  Their sizing contract must match the registered presentation in the source URL.
  The parser rejects duplicate IDs, unknown or mismatched sources/variants, excessive
  nesting and oversized configurations before preparing data.
- `/embed/dashboard` consumes exactly the same configuration and renderer. The shared
  embed dialog supplies an iframe and existing automatic-height script. This host uses
  a stable 800 px planning budget: iframe-reported content height must never become
  its next layout input. Supported minimum host width is derived from the children
  (320 px for the complete current catalog).
- Existing individual actions remain owned by the export frame. Instance IDs prevent
  the annual and seven-day trade widgets opening the same detail. Compact trade now
  has that shared action menu too. Source attribution remains in downloaded images;
  dashboard hosts collect sources once below their content. The EE traffic light's
  existing share-only capability is preserved, not advertised as an image export.
- A client error boundary isolates each chart. Server preparation failures yield a
  visible per-widget error; other prepared widgets remain available.

To add a widget: register its identity and presentation contract, reuse a data family
(or extend the common dependency preparation), and connect its existing route adapter.
Then verify standalone embed, dashboard, narrow container and the real export. Do not
add a fetch/cache/layout implementation inside a dashboard page.

The retired alias, full simulation and funding questionnaire remain outside the
chart catalog. The municipality energy-monitor groups now use the same composition
solver; the production release has not been switched by this local implementation. A visual drag-and-drop page builder,
persisted dashboard library and CMS-specific installation are separate product work;
portable compositions and their renderer are implemented here.


## Landscape and existing editorial variants (2026-10-11, local integration)

- `LandscapeHero` is the actual municipal product landscape renderer, including
  topography, buildings, wind parks and flights. `LandscapeWidget` only adds the
  existing export/share frame; the scene and product hero are registered presentations.
  Prepared geometry uses the shared resource store and a validated server route,
  preferring versioned release assets. Weather uses the shared live preview boundary.
  Missing weather is unavailable, never fabricated generation.
- Legacy municipal/state charts use adapters to their existing components.
  `StoryWidget` opens the existing municipal story reader; its archived story data,
  layouts and downloads remain owned by that reader. Stories do not become live charts.
- `/widget-galerie/dashboard-bestand?varianten=alle` enumerates registered sources
  and presentations from the same catalog. Every instance has its own identity.
  Settings expose only the themes supported by the widget contract.
- Product-page deployment, a complete browser matrix of all places and all story
  templates, and production release remain separate acceptance gates. Passing catalog
  coverage does not assert those visual checks.

### Browser acceptance recorded on 2026-10-11

- All 41 catalog chart types and 58 existing source/presentation combinations
  loaded directly, with no nested per-widget iframes. At 375 and 1200 px, no
  dashboard slot or document overflow remained and no loading/error message remained.
- The real generated partner embed reconstructed all 58 instances. URL transport
  now uses bounded deflate encoding (2,867 characters for this fixture instead of
  18,347); the old uncompressed request returned HTTP 431. Legacy JSON links remain
  accepted. The server limits decompressed output before validating the structure.
- Hatten's product landscape and wind-park flight rendered with actual canvas pixels
  and live weather readouts. The landscape and existing municipal story exported
  actual image files. The variant modal opened the legacy municipal capacity chart.
- The existing municipal monitor rendered all nine chart headings and KPI changes
  at 375 and 1200 px. Story strips now explicitly choose page or contained sizing;
  contained strips cannot expand a dashboard to the page viewport.
- This is local acceptance, not a production release or an exhaustive test of every
  municipality, every historical date, or every story template.

### Landscape widget correction and acceptance — 2026-10-11

- The landscape embed now owns a normal widget shell: explanatory copy, the shared
  searchable place selector, destination navigation, source help and export actions.
  Both width variants reuse the canonical municipal landscape renderer. They do not
  embed the surrounding product landing page.
- `landschaft-karte` registers the existing scene sign as a standalone widget.
  Scene and card share weather scope, plant capacity and rendering. Compact stop
  metadata avoids downloading terrain/buildings for a standalone card (Nidda: 472 bytes).
- Shared links preserve the selected place and stop. Variant dialogs initially select
  the matching catalog source. Cards expose the normal source, sharing and download menus.
- Server preview responses carry observation age and refresh status. The shared client
  collects a pending background refresh instead of treating a stale response as newly
  fetched data for another full interval. Regression tests cover retained data, failure,
  request deduplication and stale-to-fresh replacement.
- Site, embed and partner layouts use the existing versioned local font files.
  Development no longer waits for Google font downloads during compilation.
- Local browser acceptance: Hatten wind-park flight, place search to Nidda, Nidda solar
  destination, shared source modal, matching variant modal and an actual PNG download.
  The reference renders directly without nested widget iframes and fits 375/1280 px.
  Standalone and dashboard wind cards both displayed 6.78 m/s and 4.5 MW at 19:18 local time.
- The local development cold build was unusually slow under machine load; subsequent
  reference responses were successful. This is not a production performance measurement.
  No deployment or exhaustive acceptance of all prepared places is implied.

The canonical Strommix page and `/embed/regional-hourly-mix` both render `RegionalHourlyMap` with the same hourly reader, map, drilldown, controls and export. The page owns the section heading and source list; the embed displays its frame heading and source footer. Neither host creates a separate chart or adds host-only selection controls. The annual map remains a separate, explicitly annual widget.
