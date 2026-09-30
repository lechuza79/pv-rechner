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
