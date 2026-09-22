# First municipality story data run — 10 September 2026

## Scope and reproducibility
Read-only database extraction: 11,247 municipality directory entries; all 386,594 monthly solar aggregates, 10,724 municipalities, August 2024–September 2026; 29,144 annual solar aggregates for 2025. Count verified against server total. No unknown municipality identifiers, duplicate monthly keys or negative counts/capacity found. This does not prove completeness. The 523 directory entries without monthly rows must not be called missing imports or zero activity without further audit.

Local extraction and analysis scripts: /tmp/story-run.mjs, /tmp/story-annual.mjs, /tmp/story-analyze.py. Raw extracts: /tmp/story-run-mastr_monat_gem.json, /tmp/story-run-mastr_regions.json, /tmp/story-run-mastr_aggregates_gem.json. Read date is not export date. Pagination was ordered but not transactionally frozen.

## Findings to investigate, not approved publication copy
- Large project: Ketzin/Havel, November 2025, one registered ground-mounted unit with 86.919 MWp. A unit is not necessarily a whole project. Verify individual record and commissioning context.
- Project cluster: Bartow, November 2025, four ground-mounted units totaling 262.762 MWp. Do not infer four independent parks.
- Broad count growth: Jena balcony solar, January–May 2025: 111 units / 126.17 kWp; same months 2026: 202 / 212.23 kWp. Both count and capacity rise. Direction remains positive for January–March and January–April too.
- Count/capacity divergence: Dortmund balcony solar, January–May: 864 / 989.16 kWp in 2025 versus 756 / 1018.42 kWp in 2026. Fewer units but more module capacity. The divergence also holds January–April, but NOT January–March (both then fall). Must specify period; not a general growth statement. Module capacity is not inverter output.
- Isolated month: Fürfeld balcony solar, May 2025: 29 units, next highest month 6 in the available comparison. This is one candidate family among others.
- Counterexample: Berlin June 2025 balcony solar count 1,225 is a large absolute amount but only slightly above its next-highest month (1,165). Absolute size alone is not evidence of exceptional change.

## Quality gate
2025 monthly totals disagree with annual aggregates in 1,045 of 29,146 municipality/segment combinations. Difference criterion: unequal count OR capacity difference >0.15 kWp (above cumulative cent-rounding allowance). Causes not established: different export versions, corrections, stale rows and classifications need investigation. Do not combine the series or publish candidates before confirming a shared source vintage.

Both series currently select active units, grouped by commissioning date. They do not reconstruct the full historical installed/retired population. Residential/commercial roof categories partly rely on classification rules, not certified building uses. Missing monthly rows were not used to claim complete zero activity. January–May comparisons below require rows in both periods, so new-from-zero locations are omitted and those lists are not exhaustive.

## Method limits and next action
Monthly candidate search uses dates before June 2026 provisionally; the three-month lag is not empirically validated. No significance claims or causal funding claims. Exploratory rankings are descriptive, not a validated detector. Candidate shortlist filters (20 units, six positive months for isolated counts) are browsing aids, not publishing rules.

No weekly data needed to establish these first candidate families. Priorities: reconcile source versions; verify selected large-project raw records; then extend comparison groups and held-out validation. This run does not yet cover long-term annual trajectories, formal peer comparisons, seasonal modelling, funding linkage, or nationwide story yield. No production data, import settings or publishing workflow changed.

## Follow-up validation — 10 September 2026

### Provenance mismatch confirmed
The complete monthly table has write timestamps between 2026-09-02 06:36:40 and 06:37:35 UTC. Annual aggregates were written between 2026-09-09 17:40:00 and 17:43:18 UTC. Annual metadata identifies Gesamtdatenexport_20260909_26.1.zip, aggregated 9 September. The monthly export date is not recorded; its write date is NOT its source date. Therefore the 1,045 mismatches cannot be interpreted as 1,045 corrupt records. Differing refresh dates are confirmed, but do not establish each mismatch's cause.

The checked main-branch scheduled refresh runs the annual import, not mastr-monat-refresh. This explains why synchronized refreshing is not guaranteed by that workflow; external/manual runs were not inspected. No local raw ZIP was available in the searched project and /tmp directories. A full same-export reconciliation therefore remains open. No production refresh was triggered.

### Candidate-specific checks
- Ketzin/Havel 2025 ground-mounted totals agree exactly: 1 unit / 86,919 kWp. The municipal announcement confirms the inauguration on 11 November 2025 and 87 MWp: https://www.ketzin.de/news/index.php?news=1159927 . Developer confirms operation since November 2025: https://beteiligung.kronos-solar.com/projekte/solarpark_ketzin . Operator also confirms inauguration and size: https://edp.com/en/europe/germany/what-we-do/edp-inaugurates-its-first-project-germany . Strongest candidate for concept development. The individual register record identity was not independently retrieved.
- Bartow 2025 totals agree exactly: 4 units / 262,761.72 kWp. Constructor describes a single 260 MWp solar park: https://goldbecksolar.com/referenzen/solarpark-bartow/ . This supports treating several register units as potentially one project, not four parks. Exact November commissioning date remains unconfirmed externally. Do not substitute an inauguration date for commissioning.
- Jena balcony solar 2025: monthly sum 334 units / 389.42 kWp, annual 334 / 389.43. Within rounding allowance. This validates the full-year sum, NOT the current 2026 monthly data or completeness of registrations. Growth candidate remains provisional pending same-export refresh.
- Fürfeld balcony solar 2025: monthly 51 / 63.23 versus annual 51 / 63.22, within rounding allowance.
- Dortmund balcony solar 2025: monthly 1,944 / 2,351.87 versus annual 1,942 / 2,349.28. Keep the count/capacity divergence as a candidate, not approved copy, until same-export validation.

### Decision
Proceed with Ketzin as a well-supported large-project story concept. Keep Jena as a promising growth candidate. Hold Dortmund's exact comparative copy and Bartow's exact commissioning month. The analysis is not evidence that every municipality needs or has an event. Next data-engineering requirement is common export provenance and synchronized monthly/annual generation; additional weekly buckets do not solve this issue.

## Design handoff
Prepared in /admin/redaktion/konzepte: Ketzin large project; existing Fürfeld month concentration; Aulendorf funding-start coincidence; Jena growth comparison (explicitly provisional source vintage). Each has teaser, detail and social views plus widget decision. Long comparison tables removed in favour of concise period labels.

Additional Jena check, monthly snapshot: other Thüringen municipalities combined January–May balcony counts 5,153 (2025), 4,675 (2026). Jena rises 111 to 202. This is regional context, not a matched control group or proof of cause. Aulendorf's programme date was independently confirmed; see funding linkage report. No production synchronization, causal estimation or fabricated historical rankings were performed.
