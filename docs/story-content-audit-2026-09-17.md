# Story content coverage — 17 September 2026

This measures the 11,247 cached municipal reports, not a claim about current national administrative coverage. Run `node --import tsx scripts/story-content-audit.ts` for per-city slots.

- Structure: 10,857 municipalities have a ready stock/share finding.
- Year-to-date additions: 1,873 have a ready finding; this does not establish monthly recap coverage.
- Monthly generation: 2 municipalities; annual generation: 2 municipalities.
- Historical yield: 2 municipalities (multiple findings per municipality).
- Funding stock: 373 municipal assignments, not 373 unique programmes or newly started programmes.
- Storage stock: 10,860 municipalities; a finding is not automatically a completed template.
- Dedicated monthly additions recap: not connected.
- Monthly electricity value: first frozen example for Trier, August 2026.

## Radial availability

The visualization is generic. Availability is restricted by the static city registry and manually prepared weather files. The build currently unnecessarily requires annual wind inputs even for a solar month. A central cached preparation step is needed; no city-specific chart implementation is required. Monthly local-time handling also currently rejects daylight-saving transitions. Do not claim full-year monthly coverage before energy-conserving 23/25-hour handling is tested.

## Electricity value prototype

The first example reuses Atlas valuation rates and regional self-consumption assumptions. It multiplies modeled monthly generation by a capacity-weighted reference value from the currently registered solar stock. It is not observed income, reconstructed historical tariffs, or a month-specific self-consumption simulation. The stock date and valuation date differ and are disclosed. All resulting values are frozen by municipality and month; the builder refuses to overwrite an existing snapshot.

Kiel is deliberately not valued yet: the supplied stock contains an unclassified solar segment. Silently excluding it or pricing it as a known category would misstate the scope. A modeled treatment must be explicit before extending coverage.

## Editorial and display contract

“Snippet” means the compact story preview only. See `story-widget-contract.md`: data snapshot, widget configuration, editorial story, and display surface are separate responsibilities. Detail and compact views use the same central renderer.

The next coverage priorities are monthly additions, generic cached radial preparation, and monthly electricity valuation. Existing stock stories alone do not form a balanced monthly municipal feed. Double rings must compare compatible shares with clearly stated denominators; arbitrary pairs of values do not qualify. Line charts require a real multi-period series.

## Individual-unit revision

Trier August is now recalculated from 4,398 active register units commissioning before the final day of the month. Daily weather yield is applied to actual unit capacity only after commissioning. The exact commissioning date selects the roof tariff month; the registered full/partial export mode selects its tariff variant and self-use treatment. Expiry is evaluated at the story month. Unit source: official export 10 September 2026; the old aggregate snapshots remain preserved, and the gallery overlays the individual-unit revision.

Results: electricity value EUR 1,714,038.32; modeled remuneration EUR 1,492,370.84. Generation: 12,397.727 MWh. Remaining limitations: 187 approximate tariff assignments (large roofs outside stored tariff tiers and ground-mounted models), 8 unknown export modes, 402 non-household roof units without declared full export and without a consumption profile. Private partial-export self-consumption still uses the stored regional annual assumption (24.0352%); it is not an individual load simulation. Currently inactive units are not reconstructed. These counts and assumptions appear in both stories.

Replay: `scripts/story-value-units.py` extracts only necessary valuation fields from the complete export; `scripts/story-unit-value-build.ts` values each unit and saves the audit rows locally while publishing only aggregated output. Historical snapshots cannot be silently overwritten. Tests cover actual size/date, full feed-in, partial-month commissioning, historical expiry, and 23/25-hour months.
