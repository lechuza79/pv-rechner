# Original editorial-system repair audit

Verified locally on 2026-09-14. No production release, merge or publication was performed.

## Original failures and repairs

- National and per-family limits previously removed findings before city selection. Database reads now paginate and filter geography first; the pool has no implicit national/pattern/city cap. Display grouping preserves every observation.
- The old anomaly detector stopped at the first chronological hit and discarded funding-context hits. Distinct non-overlapping episodes now survive; funding context cannot erase the underlying descriptive observation.
- Truncated identifiers and incomplete anomaly keys could collide. Identifiers retain their complete distinguishing fields. Different findings sharing an identity now fail before database writing rather than silently overwriting one another.
- The design gallery previously used a separate fixed selection. It now opens the actual pool finding, with all grouped statements available, and skips through the selected pool.
- Generated text and visuals now consume the same evidence and number formatter. Mixed units and whole/part comparisons do not automatically become comparable bars. Sources retain their own dates and labels.
- Housing structure does not establish roof potential or ownership. Register building-mounted installations are not automatically private/commercial roofs. Modelled earnings remain labelled calculations. Temporal proximity to funding does not become demonstrated impact.
- Content categories and temporal facets are separate. Reusability is an additional property. A first historical import does not become a batch of new events.
- Local saved designs are immutable content-addressed snapshots, including source reference, date, rendered concept, colour scheme and text pattern. Reopening and re-saving preserves that reference and pattern. Shared text patterns update future drafts across municipalities; they do not rewrite saved drafts.
- Invalid saved links now produce a visible error outside the closed modal. Municipality selection uses unique municipal keys, avoiding same-name ambiguity.

## Evidence

The final national run is `municipal-discovery-v7`, using the 2026-09-10 register export and refreshed auxiliary input snapshots. The report directory includes 11,247 places, including places without usable solar findings. This is not a claim that all places have equivalent source coverage.

`scripts/story-pool-verify.ts` checks unique observation identities, lossless grouping, category/time classification, all thirteen original-family coverage entries and the preview adapter for every eligible observation. The national audit passed for 460,490 observations grouped into 377,017 topics; 314 places had no eligible observations. These are findings, not finished articles or a measurement of discovery recall.

Trier: 146 observations / 120 grouped topics. Nidda: 86 observations / 69 topics. Repeating the same input for both produced byte-identical reports. Those counts are diagnostic, not the acceptance criterion.

Final focused test run: 128 tests passed across 13 suites, plus a clean TypeScript check. Independent review found and prompted repairs to snapshot provenance on re-save, hidden mixed-source captions, city-name ambiguity, inconsistent rounding and invisible failed-load feedback.

Browser checks on port 4190 covered the real Trier stock-profile finding in social, teaser, feed and detail views, light/dark/highlight, next/previous navigation, saving a shared default text pattern, reopening/re-saving an immutable snapshot, and a visible invalid-link error. The saved snapshot remained the same single file after re-save. Automated adapter checks cover every grouped statement; browser inspection is not claimed for every national finding.

## Remaining boundaries

- Municipal counterparts of original national/group patterns are explicitly described in `story-pattern-coverage.md`; they are not silently presented as exact equivalents.
- Complete compatible funding-gap comparisons, verified local heating-funding eligibility and municipal weather/production time series remain unavailable inputs in this run. Missing catalogue entries cannot establish that a municipality has no funding.
- Historical commissioning dates of currently active units do not reconstruct historical total stock. Earlier historical ranking snapshots cannot be invented; newly recorded snapshots can support future change stories.
- Screening thresholds are declared editorial rules, not significance tests. Source reporting errors and late registrations remain possible. Three months of maturation is not proof of completeness.
- This completes the repaired local path from eligible finding to reusable design draft. Editorial quality and final chart templates still require the intended joint design work. Publishing, subscriber dispatch and production persistence are outside this local release stage.

## Verified funding context

On 2026-09-14 the official Trier page confirmed the municipal balcony-solar programme period July 2024 to 31 March 2026. This dates the programme context only; it does not demonstrate its effect on installations.

Source: https://www.trier.de/leben-in-trier/klima-umwelt/klimaschutz/erneuerbare-energien/solarenergie/13861.Foerderung-von-Balkonsolaranlagen.html
