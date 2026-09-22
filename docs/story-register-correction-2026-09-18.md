# Local story register correction — 18 September 2026

The production successor table from commit 2bca49b2 is now shared by all three
local archive readers. Names are never used for assignment. The local archive
is still the 10 September edition, not a new register import.

- Remapped 268 old keys in the local solar/storage catalogue to 112 successors.
- Preserved all 9,170,352 catalogue records, total power and storage capacity.
- Rebuilt municipal day/week series and extracted 83,493 valuation units for the affected places.
- Refreshed current municipality metadata and valuation stock read-only from production.
- Two further existing annual profiles had changed wind baselines; both were recalculated.
- Re-ran the local discovery catalogue for all 11,247 municipalities, including peer comparisons.
- Rebuilt 145 local ranking projections, including Main-Kinzig municipalities. Hanau has 34 applicable ranks.
- Do not infer rank movements from the broken previous baseline. New local corrections take precedence over older central ranking observations.
- Among the 114 affected prepared files, 22 monthly profiles, 21 annual profiles and 22 valuation results are available after recalculation. No previously available profile was lost. Missing weather remains missing.
- Hanau's local export contains 3,387 active positive-power solar units; individual-unit totals agree with daily-series totals (63,463.36 kWp). This is distinct from the reported production count of 3,385; do not silently equate the editions.

Original affected results and verification evidence are retained in
`scripts/.cache/story-key-repair-2026-09-18/`.
The old Open-Meteo resume process was deliberately stopped. Claude owns the
weather-source migration; no extra weather request was needed for this repair.

Validation: 11 chart-catalog/ranking tests; TypeScript check; independent prepared
profile/valuation consistency checks across all municipalities; catalogue total
conservation and Hanau daily-versus-unit reconciliation.

All changes are local to the story worktree. No production write or deployment.
