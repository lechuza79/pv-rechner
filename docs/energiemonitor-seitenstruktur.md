# Energy monitor: agreed page structure

Decision record, 3 October 2026. Scope: navigation, topic pages, regional discovery.

## Product and navigation

- Energiemonitor is the shared family across Germany, federal states, districts and municipalities; additional countries can follow where data supports them.
- Place and topic are separate dimensions. Do not promise data or controls on levels where they are unavailable.
- Topic pages combine usable charts, a concise HTML answer and explanations. There should not be competing article/chart destinations for the same question.
- Strommix includes its long-term history. The historical view is a section/view of Strommix, not a separate peer menu item.
- Solar additions (Zubau) and installed stock (Bestand) answer different questions and remain distinct.
- Preserve established URLs while improving their contents. Decide redirects only after an actual replacement exists and query intent has been checked.
- Build on the latest municipal menu: Checks & Rechner, Förderung, Energiemonitor, Vor Ort, Wissen and Für Organisationen. The copied municipal destination depends on that session's release; do not publish a dead target.

## Parks: additional entry, not a replacement

Solar and wind parks are visible at each geographic level: Germany, federal state, district and municipality. The park directory is an ADDITIONAL entry into the same data, not a replacement for regional park views and not a new monitor/parks mode switch.

The directory should allow exploring parks across Germany and narrowing by region and technology. Regional pages and their maps/3D views link to the same park details as the directory. Each park has one canonical detail page and one data record. The forthcoming park dataset is a dependency, not assumed to exist already.

## Sources and search intent

- One central sources section on each site page. Do not repeat sources beneath every on-site chart. Standalone embeds and downloads retain their own attribution.
- Essential answers, periods, units and calculation limitations remain readable in normal HTML, derived from the same data as charts. Important facts must not be available only on hover or drawn in canvas.
- Preserve useful answers rather than word counts. Long explanations can move below the dashboard; unrelated questions must not delay the main answer.
- Atomstrom must distinguish physical border flows from the calculated nuclear share. Seven-day power averages and year-to-date energy shares must keep their different periods and denominators explicit.

## Search evidence inspected

Search Console page/query reads: 2 July–30 September 2026. Export supplied by the owner: 30 June–29 September 2026. These are different windows, despite the same page totals below.

| Existing page | Clicks | Impressions | Mean position | Observed intent |
| --- | ---: | ---: | ---: | --- |
| /atomstrom-import | 7 | 1,165 | 7.97 | Amount imported, countries, France, specific years |
| /strommix-deutschland | 9 | 770 | 15.1 | Live/current German electricity mix |
| /photovoltaik-zubau-deutschland | 0 | 78 | 14.17 | Sparse, partly broad solar queries |
| /solaratlas | 0 | 97 | 16.09 | Solar atlas and installation discovery |

Stock and long-term prototype pages were absent from the inspected page results; that does not establish their indexing status. The long-term prototype currently declares noindex. No backlink audit or complete technical SEO audit is claimed.

## Delivery sequence

1. Atomstrom: put the main answer and existing interactive charts first, preserve calculation and SEO identity, then migrate chart families through the shared widget system.
2. Strommix: current and historical views together.
3. Zubau and Bestand: consistent monitor pages, keeping their distinct intent.
4. Update menu destinations as the corresponding pages become ready; parks follow availability of the shared dataset.

Implementation must reuse EnergyMonitor, registered chart renderers and shared widget controls/export. No copied widget settings, chart forks or local export implementations. The widget-system session owns its uncommitted work; do not copy its checkout. Atomstrom's first local layout pass uses the existing embeds; complete shared-frame/settings migration remains a separate, explicit follow-up before describing all widgets as migrated.

## Local first pass and verification

Atomstrom now uses the shared EnergyMonitor topic sections in the light scheme, with a seven-day metric alongside the existing yearly chart on wide screens and stacked on phones. The other two existing charts precede the explanatory FAQ. Sources use DataSourcesSection between the shared trust section and footer. Existing URL, metadata and calculation functions are preserved.

Verified locally at 1280 px and 390 px: three charts load, no page overflow, FAQ disclosure works. TypeScript and 67 targeted tests pass, including shared layout, component registry, architecture, navigation and nuclear calculation. This is not a production-build or deployment check. The existing embedded charts have NOT yet been migrated to the newer widget configuration system.

## Navigation and widget handoff, 3 October 2026

The monitor menu now groups Germany's four topic pages, regional monitor discovery and the additional park directory. The directory is explicitly upcoming and has no invented destination. Long-term Strommix no longer has a competing menu entry; its existing route is unchanged until actual content integration. Vor Ort retains the municipal session's geographic search.

The owner explicitly delegated migration of strommix-anteil, strommix and zubau-erneuerbare-atom to the central widget session (Zentrales System für Charts, Widgets…). That session owns shared controls, presentation and export; this session owns the topic page and monitor menu. No cross-checkout edits or independent releases were requested.

## Updated geographic navigation decision

The approved local sketch merges Vor Ort into Energiemonitor: Deutschland contains all four national topics including the illustrated Atomstrom entry. Energiemonitor regional reuses one town/postcode/district search plus a separate selection of all 16 states. Regional overview and rankings remain reachable there. Data sources are removed from this menu. Solar- & Windparks is an independent menu group with the existing illustrated upcoming card, not a monitor subsection. Name searches include municipalities and districts; postcode searches resolve to municipalities.

### Local central-widget integration — 2026-10-03

The Atom page preview on port 4298 consumes NuclearShareWidget,
GenerationMixWidget and RenewablesGrowthWidget directly from the central widget
checkout via the development-only SOLAR_WIDGET_SOURCE setting. No second widget
implementation is maintained here. This setting must not be treated as a release:
production still needs the central widget changes integrated through their owner.
The existing embed routes retain their data loaders and onsite attribution flag.
The required four mix illustration assets are available in this preview.

The Atom navigation action now reads "Atomstrom-Import ansehen". Above the page
headline, "Datenstand (7-Tage-Wert)" uses the existing import result timestamp;
failed retrieval shows an unavailable notice rather than an invented update date.

Validation: local page and all three embeds render; period and country selection
work; mobile document width is 390/390 px; typecheck and 51 focused navigation,
monitor layout and widget architecture tests pass. No deployment performed.

### Hero comparison — 2026-10-04

The local `/atomstrom-import` preview now places the existing monochrome nuclear
illustration behind the introduction and two overview tiles. Detailed charts and
text remain below. `/atomstrom-import/entwurf-bisher` preserves the previous layout
for comparison; it is noindex and returns not-found outside development. Both
variants use AtomstromPage and the same live data/widgets, so this preserves the
layout rather than freezing data. The preview is retained for user review; no
merge or deployment. Typecheck, 31 relevant tests, desktop and 390px mobile checks
passed. Other sessions' worktrees were left untouched.

### Corrected municipality-style composition — 2026-10-04

Operator correction: use a dark hero, text on the left, compact teaser widgets on
the right, with the existing monochrome nuclear artwork behind them. The first
light variant did not meet this direction. The preserved original draft remains
available. Central widget owner is implementing a stripped-down annual nuclear
share donut and a seven-day daily-mean import bar widget; a rolling seven-day mean
must never be relabelled as the latest daily bar.

Below the hero, explain both the share and the energy magnitude. Annual-average
PV/wind/household equivalents use explicit example sizes and assumptions, not a
claim of simultaneous replacement or guaranteed availability. A small relative
share can still be a large absolute amount. Source attribution remains central.
The racing-chart metric is undecided: do not replace the existing comparison or
imply that installed GW are equivalent to delivered electricity.

The central NuclearDailyWidget and NuclearShareWidget teaser variants are now
consumed directly through the existing development-only source bridge. Local
NuclearDailyPreview/NuclearSharePreview files define the prop contract and an
explicit unavailable fallback; they are not chart implementations. Before any
release, integrate the canonical widget owner changes and replace this temporary
preview bridge with normal repository imports.

Browser evidence: dark two-column hero at 1440px, two 280px teaser tiles, latest
partial daily value visibly hatched; 390px view has no horizontal overflow.
Comparison figures are rounded only for display and tests verify the same energy
window across household, wind and PV equivalents. Typecheck and 33 scoped checks
pass. Existing upstream throttling can produce incomplete neighbour-country data;
this is a release blocker for authoritative live claims. A shared-header hydration
warning was also observed, outside the new hero/chart markup. No publication.

### Hero correction, 4 October 2026

The Atomstrom page now places SharedSiteHeader and the compact shared Breadcrumb inside the full-width dark hero, outside EditorialPage. Its two teaser widgets alternate in the existing StorySlider's explicit hero variant: seven-second dwell, fade, manual dots and pause; reduced motion, hidden tabs and hover/focus suspend automatic advance. Municipality files remain untouched.

Below the stage, the detailed annual donut sits beside its annual-share explanation. The full daily chart precedes the daily-equivalence cards. Every card labels whether the equivalent describes generation or household consumption; all three refer to the same rolling seven-day import average converted to GWh per day, not the annual percentage. The old draft route remains available.

Validation of this correction: TypeScript passed; 34 focused tests passed; the local HTML response contains one site header, the carousel, retrieval date, full donut and daily reference labels. The municipality reference was inspected visually at 1440 px before editing. Final screenshot/mobile review of the correction is still pending: the browser-control connection repeatedly timed out after reload. No release or visual-acceptance claim.

### Shared annual template, 9 October 2026 (local preview)

The current SEO preview and `/atomstrom-import/2025` now use the same
`AtomstromPage` renderer. The annual route supplies a reviewed year snapshot,
monthly and origin chart adapters, annual trade totals, and year-specific metadata.
Both routes link to each other; the existing baseline remains available. Historical
routes are development-only and noindex until accepted. Unsupported years return 404.

The 2025 snapshot is reproducible with `scripts/atomstrom-year-snapshot.ts` from
cached original Energy-Charts responses. Source URLs and hashes are stored with the
derived snapshot. Hourly country mixes are matched to quarter-hour flow intervals;
missing intervals are not replaced with zero or carried across gaps. Of 8,760 hours,
8,755 are evaluable. October and December remain marked partial. The resulting
18.8 TWh is an observed partial sum, not a complete annual balance. The previous
weekly store uses different interval matching and must not serve as a comparable
historical series without reconciliation. Current live calculations are unchanged.

Annual commercial trade totals were checked against the central widget's
`/api/energy/trade?period=year&year=2025` response (SMARD): 365 days, no partial
flag, 76.7 TWh imports and 54.8 TWh exports. Only quantities and provenance are
persisted in `data/atomstrom/trade-2025.json`, no price valuations. Archive rendering
does not depend on a fresh trade request. Dataset modification times include the
stored trade and nuclear datasets and remain distinct from retrieval times.

Validation: 18 focused tests and TypeScript passed. Desktop 1280px and mobile
390px inspected in browser; mobile document width equals viewport width and one
H1 is present. Shared chart padding, partial-month labels, canonical URL, annual
trade copy and return link checked. This is a local preview, not a release.
