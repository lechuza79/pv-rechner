# Story and widget contract — review, 17 September 2026

Status: inspected proposal, not a completed migration. Existing templates remain
central; the current StoryConcept still combines editorial content and chart data.

## Coverage measured from the existing local reports

11,247 reports; 10,710 have at least one finished mapped template, 537 have none.
Distinct template types per place: 1,797 have one; 4,661 two; 4,246 three;
four have four; two have six. This is rendering coverage, not an editorial
completeness or publication claim. Counts come from the full copy-audit output.
Monthly radial inputs exist for Trier and Kiel, annual radial inputs for Nidda
and Kiel. Six reference-yield findings and five cached ranking summaries are
not nationwide coverage; rankings can additionally be loaded on city request.

## Durable separation

1. Dataset snapshot: immutable version, locality, actual time window, units,
   denominator, completeness, source and model identity. Missing is not zero.
2. Widget configuration: central renderer id and compatible data binding,
   highlighted point(s), comparison and initial interaction state. No copy.
3. Story: claim, headline, explanatory text, date/type, source snapshot reference
   and widget configuration. A story retains its dated data even as live data advances.
4. Surface: compact, detail, interactive or export. Each central renderer defines
   its projection and labels. The compact view is deliberately reduced, never a
   scaled screenshot of the detail. Interactions do not rewrite the story claim.

A municipal live widget resolves the latest dataset explicitly. A dated story
resolves its stored snapshot. Both use the same renderer and unit formatter.
Central renderer refinements propagate to both; data versions do not silently change.
New inputs create/update a current recap; historical stories are not relabeled as news.
Existing adapter remains a compatibility bridge during incremental migration.

## Initial set by editorial role

- Monthly additions: one recap covering count, capacity and supported composition.
  Monthly bars; line chart for a longer trajectory or comparable cumulative series.
  No private/commercial ownership inferred from building installations.
- Monthly generation: modeled solar, optional supported wind, everyday benchmark.
  Radial view or a comparable historical reference-yield view; label the model.
- Current structure: stock donut, installation grid and capacity contrast.
- Monthly ranking: one combined relevant update with cohort and prior snapshot.
- Service: applicable funding availability/status, with source verification date.
- Event/retrospective: exceptional additions, meaningful record, real programme change.

These are coverage slots, not a fixed quota. Mark each as data missing, no relevant
finding, renderer missing or available. Do not manufacture stories to fill slots.

## Existing visual library to reconnect

- SocialKarte.VerlaufsTeil / PostBild.verlauf: real time axis and one value per
  timestamp per series. Existing design supports endpoint labels. Do not interpolate
  a curve from the two evidence values retained in an annual finding.
- DonutTeil / Ringpaar: same share metric for two places or two dated observations,
  each with an explicit denominator and a complete 100 percent scale. Existing
  national example compares ground-mounted capacity shares between states.
  Do not reuse for installation count share versus capacity share: keep the grid.
- Einzelkennzahl: exact main fact with unit, date and scope; existing approved
  illustration is decorative, not quantitative evidence. Suitable for a stock
  count or verified subsidy amount. No generic fallback for every unmapped finding.
- Funding status card: usable even with no numeric amount, e.g. application stopped.

## Funding inspection

Local reports contain 373 programme snapshots and 58 change observations.
Deduplicated: 101 programmes and 11 programme/date change groups; shared district
programmes appear in multiple cities. Stored programme states: 68 active,
14 exhausted, 11 discontinued, 8 paused. These are cached counts, not a fresh
verification of all 101 programmes.

Official pages checked on 17 September:
- Konstanz: balcony PV connection-cost subsidy, EUR 150 per installation/dwelling.
  https://www.konstanz.de/stadtwandel/foerderprogramme/breitenfoerderung
- Rhein-Erft-Kreis: exhausted, further applications unavailable.
  https://portal.rhein-erft-kreis.de/detail/-/vr-bis-detail/dienstleistung/59442/show
- Stuttgart: 2026 Solaroffensive funds exhausted; official page refers to 2027.
  https://www.stuttgart.de/solaroffensive

The cached Bergstrasse change primarily extends our description of an already
unavailable programme. It does not prove that programme conditions changed on
1 September. A verified source URL plus a text diff is insufficient for an event.
Require explicit changed programme fact and distinguish effective date from
observation date; own corrections remain audit history, not public news.

## Implementation order

1. Coverage matrix by city and editorial role, not just counts of mapped observations.
2. Extract widget bindings/projections behind the existing adapter, retaining geometry.
3. Reconnect the existing line and single-number visuals using complete local data.
4. Add ring-pair eligibility for actual same-metric share comparisons.
5. Funding availability cards and semantically substantiated change events.
6. Repeat full coverage audit plus representative rendered small/large/zero cases.
