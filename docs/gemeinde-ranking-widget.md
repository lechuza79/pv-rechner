# Municipality Top-3 widget

Local review, 29 September 2026. Not published.

`RankingPodiumWidget` is a data-driven visual using the shared
`ExportableWidgetFrame`, options menu, analytics and PNG capture. Its input
includes the already computed top rows, formatted values, unit, comparison
scope and source date. The existing municipality ranking script retains
filtering, data loading and the category list; `GemeindeRankingWidget` bridges
its selection events into the component. Loading/error events never overwrite
the React-owned subtree and prevent exporting unavailable data.

Only the left visual is exported, with sources and the shared brand footer.
Backgrounds follow storage, balcony, rooftop, open-field and wind categories.
The selected municipality uses an opaque yellow bar and its existing rank badge.
Standalone embedding is deferred. No video or mail workflow is added to this still-image widget.

Verified locally: TypeScript, script syntax, actual PNG download for counts and
balcony-per-capita rankings, loading a saved ranking, desktop and 390px mobile
layout. No production release or full project regression run in this change.

The shared frame now optionally offers PNG aspect ratios. The ranking enables
16:9 (1920×1080), 1:1 (1440×1440) and 4:5 (1440×1800). Only the detached
export clone receives those dimensions; the live card remains responsive.
Background composition reuses the race widget panel-and-splash treatment.

## Illustration provenance (30 September 2026)

The handcoded wind-turbine placeholder has been removed. Wind now uses
`public/brand/wind-ranking-mono.svg`, copied from the illustration session's
`wind-ranking-v1/wind-motif-mono.svg` handoff. The existing separate splash
layer is retained; the new asset contains turbines only. The reusable source,
prompt and compositions are preserved in the illustration library.
PV and splash embedded images match `energy-tools-v4` library assets.
Battery and balcony assets were visually matched by the illustration session;
their exact composite export provenance was not established.

## Complete ranking composition (13 October 2026)

`RankingWidgetCombination` accepts `categories: RankingCategory[]`, a panel
`label`, and an optional `initialCategory`. It combines the existing podium
with the municipality category panel: placement badges, discovery state,
category selection and previous/next navigation. The approved category styles
are shared with the municipal page; the old script remains its compatibility
controller. No independent podium or ranking calculation is introduced.

Each category carries `data: RankingPodiumData` and optionally `rank`,
`distinction`, `rowsUrl`, `format` and `selectedPlaceId`. Supply complete,
pre-ranked rows when available. Saved municipal comparisons use the existing
public ranking endpoint through `useWidgetResource`; repeated selections reuse
its cache. A failed comparison displays an explicit unavailable state, never a
made-up podium. The municipal adapter preserves the package's saved categories
and the existing opening-selection rule.

`RankingPodiumWidget` remains the standalone podium, unchanged.
`RankingPodiumWithList` adds the optional complete-table action. Both retain
sources, sharing and PNG export. The combination uses that same frame; the
selected category is retained in share parameters. PNG exports contain the
selected podium, scope, date and sources; navigation and the table dialog are
excluded.

Gallery/embed example:
`/embed/galerie/gemeinde-ranking?ags=12063080&list=on&theme=light`.
Without `list=on`, the podium-only behavior is unchanged. On narrow containers,
the category panel moves below the podium.

For district-page integration, provide the district's own category comparisons
from the existing district-ranking data adapter. A ranking of municipalities
inside a district is a different comparison and cannot replace the district's
own placements. The target page places the complete composition after its race.

Local review only; district page integration is a separate change.

### Combination acceptance corrections (13 October 2026)

The reusable composition now scopes the approved light surfaces and yellow own
bar to its host, retains the separate podium, and places the list action in the
shared footer below both columns. The panel stretches to the podium; CSS
specificity no longer collapses its scroll area. Loading a saved comparison
triggers discovery only after its rows arrive. The municipality's remote
per-resident comparison is included when there are too few local peers.

At narrow container widths the category list is a horizontal snap strip with
active-card advancement and keyboard navigation. Resizing realigns the active
selection rather than resetting it. Full-list values keep their base units and
rank changes; the podium may use scaled units. State/national lists explicitly
label their top-100 limit rather than claiming they contain every municipality.

Browser checks: light and dark compositions, 390px mobile without page overflow,
category changes, full-list modal with the own row, selection across responsive
breakpoints, and the independent Meinersen podium. Local preview only; no release.
