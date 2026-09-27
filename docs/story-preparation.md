# Municipal story preparation

One shared renderer per template; municipal stories carry evidence and a prepared chart configuration. The preparation runs locally, not when a visitor opens a page. No generator publishes automatically.

## Refresh

`npm run stories:refresh` uses the official archive already downloaded by the MaStR pipeline. It reads source tables, builds municipal history/detail summaries, extracts individual valuation units with bounded memory, creates discovery findings, prepares weather and monetary snapshots, updates bundled examples, and audits coverage. A completed extraction is marked by source date. No per-unit identifiers are sent to the browser.

`stories:prepare` accepts `--cities=all`, `--stock=...`, `--stock-date=YYYY-MM-DD`, and optional `--fetch`. Without `--fetch` it only uses cached weather. An explicit stock date prevents an anonymous input from silently claiming a current source date.

The separate `Municipal story preparation` workflow follows successful MaStR refreshes and resumes cached batches daily. It produces reviewable artifacts; it does not merge, deploy, publish, or change the production database. The workflow becomes active only after merge. Existing municipal pages need the prepared-data consumer when connected to a deployed storage backend; local design previews read local preparation files.

## Evidence and availability

- Every municipality gets a source-edition-specific prepared result with three availability records: monthly solar, annual solar/wind, monetary values.
- Missing coordinates, incomplete weather, absent wind stock, absent storage stock, unknown tariffs, and missing unit input remain missing, never zero.
- Zero wind capacity is valid only when a real stock record explicitly supplies zero.
- Weather responses are cached by their full request. Minutely provider limits cause a bounded wait/retry; persistent or daily/hourly limits leave resumable missing records.
- A municipal boundary bounding-box midpoint is available when a stored centroid is absent; postcode coordinates are the final fallback. This is a sample point, not an area average. ERA5 is a spatial weather model, not a measurement at each installation.
- Source-edition mismatch is rejected. Previously calculated valuation snapshots are retained; changing valuation assumptions requires a new model revision.

## Model boundaries

Monthly energy integrates real UTC hourly intervals into local calendar days. The radial clock retains 24 display positions at daylight-saving transitions, but energy totals preserve 23/25 actual hours. Annual profiles use UTC days and a fixed registered prior-year reference stock, not reconstructed historical hourly capacity. Wind uses the existing simplified reference turbine curve.

Monetary calculations use individual commissioning dates, capacities, household usage and registered full/partial export. Private self-consumption is a regional annual model based on private roof size and registered home-storage stock. Commercial partial-export self-consumption remains unknown and zero is explicitly an upper-export assumption. The two figures remain distinct: economic electricity value includes avoided purchases and post-subsidy market proceeds; remuneration excludes both. Approximate tariffs and missing modes are counted in every story.

Weather API documentation: https://open-meteo.com/en/docs/historical-weather-api (checked 2026-09-17: ERA5 0.25 degree grid, preceding-hour radiation, explicit m/s wind units).
