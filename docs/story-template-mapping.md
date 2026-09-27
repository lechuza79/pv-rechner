# Municipal story template mapping

Local implementation, 17 September 2026. Story data is adapted by
`conceptFromFinding`; `storyVisualTemplate` and `approvedStoryVisual` select the
shared renderer. Detail and compact views consume the same mapped concept.
No municipality-specific copies of templates are created.

## Current rules

- Complete stock composition, two to four parts, one unit: single share donut.
  A single part is not a useful composition chart.
- Installation share versus capacity share: installation grid plus capacity
  donut. Applies to building, balcony, ground-mounted and other solar groups.
  Absolute group counts must be present, integral, within the total, and match
  the displayed rounded count share. Missing counts never fall back to two rings.
- Two comparable values: columns for the latest complete annual change,
  current year-to-date comparison, or explicit size comparison. Older annual
  pairs and historical records are not labeled as completed pair charts.
- Reference-yield record with a supplied series: yield comparison chart.
- Supplied local hourly monthly model: solar monthly radial chart.
- Supplied annual solar/wind model: annual radial chart.
- Monthly ranking summary with comparison groups: ranking chart.
- Other findings remain in the pool without a completed template. No deletion
  of findings, invented series, or reuse of another municipality's model.

The double donut and geographic outlines remain available in the older visual
library. The automatic municipal mapping does not force these into incompatible
stories.

## Initial editorial set and remaining gaps

The intended set includes monthly additions (count, capacity and composition),
monthly modeled generation with a benchmark, one monthly ranking update,
stock composition, count/capacity contrasts and meaningful historical yield
records. The annual solar/wind view is an additional prototype.

Monthly additions still need a dedicated full-series template. The existing
columns are period comparisons, not that monthly recap. Monthly solar data is
currently supplied for Trier; annual solar/wind data for Nidda. Those examples
are not nationwide generation coverage. Ranking uses centrally observed data
when a municipality is requested; the offline reports only contain the locally
retained examples. Missing prior-month snapshots do not imply held ranks.

## Repeatable full audit

Run `node --import tsx scripts/story-template-audit.ts` against the local report
cache. This executes the actual pool, adapter and selection functions for every
observation and writes per-city assignments and unassigned-family counts to
`scripts/.cache/story-templates/audit.json`. It fails on missing/broken report
files or accidental automatic double donuts. The gallery uses those same
functions dynamically, so subsequent central template changes apply everywhere.

17 September run: 11,247 reports, 10,711 municipalities with at least one mapped
observation, zero processing errors. Mapped observations (not unique editorial
stories): 10,689 share donuts, 13,576 installation grids, 13,431 column pairs,
5 cached ranking summaries, 6 yield comparisons, 1 monthly radial and 1 annual
radial. Counts do not assert that every finding is editorially worth publishing
or that every municipality has the full initial set.

## Zero-addition correction and Kiel radial data (17 September)

An annual zero addition is retained as a pause only if all three immediately
preceding calendar years had positive additions in that segment and metric.
The minimum three-year history is an explicit editorial rule, not statistical
significance. The active register cannot prove that subsequently decommissioned
installations never existed. Zero/current or zero/baseline values never use the
pair-column template; retained pauses need a separate longer-series treatment.
`story-zero-growth-refresh.ts` replays that rule against the same dated national
source for the saved reports without recomputing unrelated story families.

Radial datasets are now looked up by municipality, not by story-family name.
Kiel has its own August 2026 solar month and 2025 solar/wind reference year.
Source weather: Open-Meteo ERA5, Kiel geocoding 54.32133 / 10.13489. Monthly
integration uses 31 complete local days; annual integration uses 8,760 UTC hours.
Monthly modeled solar yield: 6,174.146445 MWh. Annual reference PV baseline:
49,167.444 kWp; wind baseline: 75 kW. Wind remains the explicitly labeled generic
reference model, not measured local generation. The other cities are not marked
as having radial data until their own weather and capacity input is supplied.
