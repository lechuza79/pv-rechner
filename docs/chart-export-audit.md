# Shared chart export context — 7 October 2026

## Current PNG download contract

The 7 October visual-review decision supersedes the light print layout for downloads.
Every `useChartExport` download (all nine entries below, including the two legacy
composed charts) and the direct GemeindeInsights download now use
`prepareDownloadSnapshot` through `exportNode`. The snapshot keeps computed
styles, inherited theme, current animation frame, live canvas pixels, selected
values, width, height and crop. PNG resolution is 2× the visible card dimensions.
Controls retain their layout slots; action buttons disappear and native selectors
become static selected labels. No help paragraphs, duplicate place label or
print-only footer are appended. Visible explanatory text stays visible.
Attribution and actual data vintage remain in a neutral edge with a 14px inset;
the full source text wraps/fits instead of being truncated.

Social publishing/share layouts retain their explicit composed/print path.
The older metadata contract below documents those layouts; it no longer controls
local PNG downloads. Explicit format choices remain available: the default “Wie angezeigt” preserves
the visible crop; ranking additionally offers 16:9, 1:1 and 4:5 with responsive
layout in the selected dimensions. Every choice retains the visible color scheme.

## Print/share metadata contract

All export paths use `chartMetadataLabel` from `lib/chart-labels.ts`:
comparison scope · actual data vintage · descriptive quantity · selected period.
One text style per metadata line. Count headings say “Anzahl Anlagen”; units
attached to numbers remain “Anlagen” or “MW”. Multiple quantities retain their
own numeric unit labels instead of claiming a single unit for the whole chart.

The data date is never inferred from the download date or selected year.
Unknown publication dates explicitly read “Stand nicht verfügbar”. A real
observation timestamp is allowed for live measurement charts. Date precision
(year, month, day, timestamp) is preserved. Controls are replaced with static
selected labels. Data-gap and model explanations must survive export.

`ExportableWidgetFrame` applies this by default, including scope and stand for
all consumers. `exportUnit` describes a single quantity; `exportDescription`
replaces interactive subtitle controls. Existing non-control subtitles remain.
`ChartExportMetadata` provides the same typography for older node exports.
`buildExportSvg` formats and wraps the same metadata for composed exports.
`WidgetSourceEdge` restores the full source/date on the capture clone, starts at
the caption token and fits if necessary. The export palette controls opacity.

## Complete export-entry inventory

| Entry point | Treatment |
| --- | --- |
| ExportableWidgetFrame | Default metadata for all monitor, ranking, regional, energy and racing consumers; selection context and units supplied by instances |
| GemeindeWidgetShell | Shared metadata for municipality/region embeds, including body-only variants; renewable-stock date forwarded from server data |
| ErzeugungWidget | Actual latest displayed observation forwarded by the radial renderer; Germany, GW and selected technology |
| AnlagenbestandWidget | Germany, source snapshot, descriptive count/installed-power context; numeric units retained per row |
| ZubauWidget | Germany, register snapshot and GWp |
| GruengasWidget | Selected model building, assumption vintage and euros; all three chart variants |
| SimulationPanel | Shared composed metadata; postcode and kW; no invented forecast-publication timestamp |
| strommix-deutschland/client | Shared composed metadata; Germany, latest selected observation and GW; selected range deduplicated |
| VerlaufMitMeilensteinen | Germany, central verified rate vintage and ct/kWh |
| GemeindeInsights direct capture | Shared metadata for both migrated story templates and legacy story credits |
| SocialKarte / SendenKnopf | Story data vintage and measured context share the metadata line; capture uses the common pipeline |
| Video / server capture | Uses the same export markers and capture preparation; no separate label convention |

Render-only plots inherit export metadata from these owners; they do not add
another title/date line. Independently scaled values (donut segments, radial
energy summaries, mixed count/power plots) keep their units at each value.

## Verification

- Focused label, metadata, export visibility, export palette, widget convention,
  shared architecture, municipal catalog and approved-story tests.
- Type check excludes the unrelated archived dependency directory.
- Four browser checks passed, including real PNG downloads for plant stock,
  green-gas costs and ranking, and a country-race measure switch.
- All three downloaded images were visually inspected; 74 focused tests passed.
- This is local implementation verification, not a deployment claim or a claim
  that every combination of data, theme and viewport was screenshotted.

## Earlier snapshot verification (superseded)

- Dark 3D map: real pointer drag followed by PNG download, pixel comparison of
  the plot against the visible canvas. The repaired export additionally restores
  its metadata and branded footer, so total card height may change.
- Full attribution fits, source date retained, all selectable map metrics fit
  the enlarged shared MetricShareCard donut.
- Real downloads also checked for ranking, plant stock and green-gas costs.
