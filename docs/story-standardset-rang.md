# One municipal ranking story per month

The standard set contains one monthly ranking update per municipality. Rising, falling, retained and leading positions are rows in that story, not separate stories or separate templates. The compact preview shows three salient rows; detail retains all available placements and their comparison groups.

## Source and update path

The existing register-refresh workflow calls `/api/social/story-feed/observations`. It writes category groups first and the complete `all` manifest last. These manifests retain the full observed Atlas inputs; incomplete observations are never consumed.

`loadRankingMonth` reads the latest complete manifest and the latest complete manifest from the immediately preceding calendar month. `atlasRankMonth` reuses the public Atlas category, scope, field and tie-ranking functions. It never uses the public ranking's reconstructed year-end delta as a monthly movement.

The editorial API adds one monthly candidate to every requested city report. Bundled design examples have the same projection, refreshed locally with `npm run stories:rangsnapshot`. Source dates remain the dates of the centrally retained observations, not the local refresh time. This implementation is local until accepted and merged.

## Monthly semantics

- First retained month: Ausgangsstand, even when the rank is 1.
- Comparable prior month: up, down or held, including a held first place.
- Missing immediately previous month: no claim that an older observation was last month's rank.
- Changed membership, population basis or method: Vergleichsgruppe geändert, without a numeric movement claim.
- Same-month rerun: replaces that month's projection, never adds another story.
- Historic months remain individually identified. They form the input for a later annual overview; annual story generation is not implemented here.

The September 2026 baseline comes from the complete central observation dated 9 September. At implementation time no complete August observation existed. Trier has 34 category/scope placements; Nidda has 33. One first-place position is visible in each case, with explicit metric and comparison group. Those counts are not independent story counts.

## Relative relevance (16 September 2026)

The complete rank snapshot is retained. The story selects ranks with the same
rule for every metric, region and comparison class:

- At least three participants; first place always qualifies.
- Other ranks must be in the best ten percent.
- Use the smallest matching Top 3/10/25/50/100 threshold that itself covers at
  most ten percent of participants; otherwise label “Beste 10 %”.
- Compare to the immediately preceding comparable month: entering, leaving,
  retaining, rising or falling within a distinction. An initial snapshot never
  claims entry or retention. Lost distinctions remain reportable.
- No arbitrary maximum for the detail story. The gallery previews three rows.
- Every row retains its exact category, comparison field and geographic scope
  in a link to the existing complete ranking with filters, including pagination.
  The full set is collapsed below the selected ranks. No distinction means no
  automatically generated ranking story; the snapshot is still retained.

Local validation: Trier 7/34 qualifying rows, Nidda 1/33, Fürfeld 3/30,
Höchberg 1/27, Berlin 3/25. Additional national-input samples: Wiedenborstel,
Horhausen, Königsmoor, Darscheid, Friedelsheim, Prisdorf, Massenbachhausen,
Glandorf, Roding, Flensburg, Kiel, Lübeck (Berlin also tested in this sample).
Königsmoor and Massenbachhausen correctly produce no highlights.
The national-input audit runs only when the local source cache is present;
bundled municipality and rule tests run without that cache.

Wind: registered municipal installed capacity is available in the Atlas input;
Nidda 3.6 MW, Trier zero registered capacity in the examined snapshot. Hourly
municipal wind generation is not included in the solar model or this change.
