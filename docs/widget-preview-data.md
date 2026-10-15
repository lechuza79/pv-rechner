# Widget preview data

Local development defaults to live observations (`WIDGET_PREVIEW_DATA=local` explicitly opts out).
The widget code and presentation remain local. No production HTML, cookies, session headers or credentials are forwarded to solar-check.io.

## One read boundary

`lib/widget-data-services.ts` defines the public service families and their accepted query parameters. `livePreviewResponse` in `lib/preview-data.ts` connects existing GET handlers to those same paths on `https://solar-check.io`. It preserves the requested place, period and metric, validates the response and shares successful snapshots. Writes, jobs, administration and production handlers retain their existing behavior.

The shared boundary covers generation, nuclear imports, electricity trade, municipal/district/regional solar curves, weather, solar yield, prices, feed-in data, register summaries/maps and place search. Widgets and their variants keep using these existing routes; they do not each implement their own proxy.

Historical observations have one additional public endpoint: `/api/widgets/reference-data`. It serves the canonical country mix, per-capita mix, world generation capacity series and historical feed-in tariffs with their original source metadata. The shared `WidgetReferenceDataBoundary` supplies those observations to the existing renderers for the six historical comparison widgets. Failed retrieval produces a visible retry state, not a silent switch to bundled observations. The production endpoint reads canonical repository datasets directly, so a data update needs no separate copied export.

Municipal/district packages, maps and regional series already use live central storage. National register totals and monthly generation use the existing live database readers. Their shared loaders retain their source and reuse the successful-read cache where configured. An explicit local municipal package directory remains available for package development. Calculator formulas and user-entered assumptions remain local computation; they are not measurement datasets.

## Cache and failure behavior

- Concurrent identical reads are deduplicated. Keys contain the full endpoint/query or region/settings.
- Successful snapshots are fresh for five minutes and can serve for at most 24 hours while one background refresh runs. Source measurement dates remain unchanged; retrieval time is separate.
- Failed or malformed responses never replace successful snapshots. Without a usable snapshot, the read fails visibly. A loader returning an authoritative `null` removes its snapshot; an HTTP failure retains it until expiry.
- The gallery's shared status notice reports when an older snapshot was served. It does not imply that an already rendered chart has rerendered after background refresh.
- Disk storage is bounded to 128 entries of at most 8 MB and survives dev-server restarts. Production retains its normal caching and invalidation.
- Nuclear daily-energy comparisons fetch overlapping short live windows, preserving quarter-hour resolution, then deduplicate timestamps before aggregation.

This addresses data availability; it does not replace checking compilation, iframe readiness or the development server itself. The gallery can compile many chart families in one session. Development uses the framework's memory optimizations; the dedicated launcher supplies an explicit 8 GiB heap limit and disables Node's additional server-side source-map bookkeeping. Client-side development remains available. The final check loaded all 33 widget routes and all 13 reference iframes without a restart; this is a measured check, not a guarantee against future development-time memory growth.

## Verification

Focused tests cover source routing, allowed parameters, no credential forwarding, cache reuse/failure behavior, overlapping nuclear intervals, canonical historical payloads and propagation into the existing historical renderers. Check actual HTTP responses and visible values in the gallery in addition to these tests. A successful mock response alone is not live acceptance.
