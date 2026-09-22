# Municipal story discovery

Local development workflow. No publication or database writes.

## Input and replay

Use the complete official register extraction and the municipality directory. The extraction carries its export date and monthly counts/capacity by municipality and registry installation type. The directory supplies names and population.

```sh
node --import tsx scripts/story-discovery-run.ts --input=scripts/.cache/bnetza/story-history-2026-09-10/full.json --regions=/tmp/story-run-mastr_regions.json --cities=all --directory=scripts/.cache/story-discovery --output=scripts/.cache/story-discovery-all.json
```

`--cities=Trier,Nidda` or municipality keys runs the same rules on a subset. Keep the directory alongside the extraction for subsequent replays; pass its durable path explicitly. A new export requires a new extraction before replay. The admin view reads per-city results through an authenticated endpoint. Initial examples are bundled separately in `lib/story-discovery-reports.json`.

## Evidence and rules

The engine rejects missing provenance, incomplete coverage, duplicate buckets, invalid values, foreign municipality keys and future months. Active units grouped by commissioning date are not historical stock: decommissioned units are absent. Dates before 2000 are excluded from event comparisons and flagged for review.

The current month and three latest completed months are excluded from event comparisons to reduce reporting delay. Only fully mature years count as annual periods. This is an editorial lag policy, not proof that older data are complete.

Each segment is checked for:
- Annual changes: at least 25% and 10 units or 100 kWp, across all available mature years; decreases included.
- Annual record: unique maximum across at least five recorded mature years.
- Monthly peak: at least 10 units or 100 kWp, twice the runner-up, at least twelve recorded buckets.
- Large installation hint: at least 1 MW in a month with at most three units; individual installation verification required.
- Same-period change: January through the latest usable month against the same months last year; at least 25% and ten units.
- Sustained higher level: three mature years with at least ten units each, recent median at least twice the previous three-year median (floor ten), and recent years within a factor of 1.5.

Additional checks cover count/capacity share discrepancies, population-normalized peer comparisons and verified funding boundaries. Funding is currently supplied for Trier and Nidda only; Nidda's event is a programme continuation, not initial launch. Funding proximity is screening evidence, never causal attribution. Unknown population reference dates require review. Historical rank changes and stock milestones explicitly report missing historical snapshots.

## Selection and handoff

Candidates include exact values, comparison, source date, limitations, selection reason and visual suggestion. Independent observations remain separate, including count and capacity claims from the same segment/year. Only exact duplicate claims are removed. The old grouping hid independent ideas and propagated review flags to valid descriptive claims.

`ready` means the descriptive claim meets editorial screening rules, not publication approval or statistical significance. `review` requires verification/context. Missing inputs differ from no matching finding. There is no target quota per city.

Review the pool, select distinct reader-relevant findings, then develop reusable visuals/text in the existing design gallery. The discovery run does not silently replace or publish designs. Formal statistical calibration, additional external contexts and historical rank snapshots remain separate extensions; the current rule set is versioned and tested with counterexamples.

## Verified local run, 2026-09-10

11,247 directory entries screened; 11,012 with register rows; 235 explicitly blocked for absent rows. 61,789 grouped candidates across 10,775 places, not a publication quota. Trier: 12 candidates (6 ready, 6 review); Nidda: 8 (7 ready, 1 review). Ten counterexample tests and TypeScript validation passed. Browser verified city search (Cologne), review filtering, expanded evidence and retained design gallery.

## V2 correction, 2026-09-11

The earlier national counts above belong to V1 and are not exhaustive story counts. V2 was replayed for Trier, Nidda, Fürfeld, Höchberg and Berlin. Trier has 125 descriptive candidates and six internal context checks; all 131 IDs are unique. The former twelve groups had absorbed twelve additional observations.

Trier descriptive candidates: 77 same-calendar-month comparisons, 36 annual changes, five annual maxima, four opposite count/capacity movements, two stock-share comparisons and one same-period year-over-year comparison. Same-calendar-month comparisons are against all prior available calendar years (at least three); they describe a difference, not a trend-adjusted anomaly. General growth can explain them. They are related angles, not 77 independent exceptional events.

The default V2 view shows unworked claims, values and comparison periods with city/topic filters. Existing designs remain separately accessible. No text or visual is generated by this step. Review candidates are retained internally and excluded from this list.

Coverage is still limited to the implemented rules and monthly solar register extraction. Daily/weekly events, storage, historical rank movements and broader external data links are not covered by this replay. No claim of exhaustive discovery is made. Twelve counterexample tests and TypeScript validation pass.

## V3 — 14 September 2026

Content strategy: evergreen local structure, dated snapshots, and ongoing event news. No quota. Backfills are explicitly retrospective; an initial discovery run cannot establish that something is newly discovered. Design/color variants belong to a story, not the whole editorial workspace.

The all-history calendar median detector has been removed: it was mostly restating secular growth in many months. Its replacement requires 24 preceding months, a ten-unit absolute excess and a twofold excess over BOTH the median of the preceding twelve months and the same month last year adjusted upwards by growth between the preceding two twelve-month totals. This is conservative descriptive screening, not a significance test or causal model. A steady exponential-growth counterexample produces no local-month events; two injected peaks remain separate.

The pool groups observations only by category, installation segment and exact period. Annual changes, annual records and opposite count/power movement can share one topic with expandable individual claims. Distinct event months never share a topic merely because they fall in the same year. Every ready observation must occur exactly once; the entire national replay is checked for loss and duplication. Internal unverified claims remain outside the pool.

Replayed every directory entry using the same official extraction. Trier: 58 observations in 42 topics (2 evergreen, 30 snapshots, 10 events/backfills). Nidda: 39 observations in 26 topics (2 evergreen, 21 snapshots, 3 events/backfills). These counts describe implemented rules, not exhaustive potential or a publication target. Historical annual observations remain available. Sixteen tests pass; type checking passes. The authenticated local report endpoint makes every processed city accessible.

Dated reports are preserved under history/version/source-date and later compatible exports carry previous candidate identities. Same-date reruns and rule-version changes do not create news. First-run backfills are not marked new.

Still outstanding: connect storage and historical rankings; establish dated population data for peer comparisons. Those are explicit coverage gaps, not negative findings. Publication and production scheduling remain deferred until the municipal page is ready.
