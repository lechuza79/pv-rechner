# Municipality stories: candidate selection and ranking archive

Evaluation: 2026-09-10. Local proposal, not implemented or published.

## Evidence and first template candidates

Read existing social_funde rows on 2026-09-10. The candidates below were last
seen by the finder on 2026-09-07 and remain open. That timestamp is NOT the
underlying register data date. Values require source refresh before publication.

1. **Own-history peak — Fürfeld:** 39 balcony installations from March to May
   2025, versus a median of 3 in other three-month windows. Template: chronological
   columns, highlighted interval, median reference and explicit period.
   Use as a historical design example, not as current news. Obtain the complete
   monthly series before drawing a timeline; the saved candidate has two values.
   No inferred funding cause. Feilbingert (34 versus 3 in the same period) is a
   useful second case for testing the template.
2. **Peer comparison — Allmannsweiler:** saved candidate reports 396.4 W of
   additional solar capacity per resident since end-2025 against a national
   municipal median of 41.1 W; absolute addition 126 kWp. Template: paired bars
   plus absolute addition and comparison-group description. Before acceptance,
   recompute against comparable municipality sizes; the saved national comparison
   alone is not sufficient for the intended like-for-like story.
3. **Ranking over time:** new template described below. No invented historical
   ranks for the preview. Use explicitly labelled fixtures until snapshots exist.

Avoid selecting simply by the highest factor: Scheiditz's 9.8-fold candidate
is based on only 15 kWp of additional capacity. District/city land-use contrasts
and tiny villages versus metropolises are not the first municipal templates.

## Current implementation

- awards-server loads current aggregate statistics and computes placements.
- Some aggregates retain earlier capacity values. These are not past published
  rankings, past populations, group memberships or ranking rules.
- storyVergleich derives the current ranking story. Its identity has category,
  area and size class, but no reporting period.
- social-fundvorrat overwrites computed text and values on each finder run.
  It preserves editorial status/notes, not a historical story edition.
- No ranking snapshot reader/writer was found in the examined application code.
  This is a code finding, not a complete database-schema inventory.

## Recommended behavior

The ranking section shows the latest available data, with its actual data date.
A published story retains its original ranking, numbers, text and period. It links
back to the municipality's current ranking section. Historical stories remain
reachable through their own permanent links even after newer stories exist.

Capture each successfully validated new source edition, then select a monthly
edition for the archive. A clock tick without new source data must not create a
new purported ranking observation. Keep observation date, source data date and
publication date separate. Monthly editions are snapshots of the ranking then,
not rankings of that month's additions; the latter is a separate metric.

Keep monthly observations even without a news event. Generate story candidates
for a first place, entering the top three, or a meaningful movement. Offer an
annual retrospective from the retained observations, with explicit data date.
Do not automatically publish twelve identical stories. Annual/year-end claims
need a matching source period; a January import is not automatically year-end.

## Required retained information

Store the municipality, exact metric/value/unit, rank, eligible group size,
comparison area and class, group membership or an immutable reference to it,
population basis, ranking-rule version, tie handling and source-edition reference.
Store enough of the compared ranking to reproduce the result. Preserve full
published story payload, methodology, selected template version, date and source.
Later corrections must be explicit revisions; do not silently rewrite a shared
story or regenerate its historical export from today's values.

Only compare ranks when metric, rules and comparison group remain comparable.
A changed population class, group composition or method is not automatically an
improvement by the municipality. A rank gain alone also does not prove new local
installations caused it. Explain a verified metric change separately.

## Implementation sequence

1. Finalize and test the peak and peer-comparison templates using the examples.
2. Add immutable ranking observations after successful complete imports; make
   repeated runs idempotent and incomplete imports ineligible.
3. Derive dated candidate stories; retain the existing editorial approval boundary.
4. Add a permanent historical-story reader independent of current story generation.
5. Add annual summaries once the relevant observations exist. Do not reconstruct
   alleged former published ranks from today's partially historical aggregates.

No database writes, schema changes, historical backfill or publication were made
as part of this evaluation.

## Implementation update — 2026-09-10

The storage tables have now been created in the connected database. A complete
initial observation for source date 2026-09-09 contains 10,742 municipalities and
7,840 ranking groups. Read-back confirmed the completion marker and group count;
an unchanged-value UPDATE was rejected by the database immutability trigger.
The first oversized write failed at the gateway; bounded group batches succeeded.
Only observations with the final `all` manifest and `complete: true` are eligible.

Local implementation now includes immutable story editions, separate publication
records, authenticated save/publish endpoints with existing content-review gates,
and a public reader that uses each edition's own data date and permanent identity.
Municipal posts now resolve through the existing review endpoint as well.
The import workflow captures an observation after successful import validation
and cache invalidation. This workflow change is LOCAL and not deployed yet.

The current overview's arrows reconstruct the last full year versus the previous
year from today's register and populations. They are not monthly retained ranks.
The new movement function accepts both ascent and descent, rejecting incompatible
groups/rules. Automatic movement-story drafting still needs wiring to the retained
observations and a finished ranking-story template.

Public feed rollout remains off (`MUNICIPALITY_STORY_FEED=1` activates it after
approved editions exist). Current design previews therefore remain available.
No story was published. Admin endpoints are available locally; publishing controls
and their visual acceptance remain part of the next editorial UI step.

### Draft generation and editorial capture

Local draft generation now compares the two latest complete retained editions,
currently within each municipality's district. It includes ascent and descent,
skips unchanged ranks, incompatible groups/rules, suspicious or insufficient
bases, and avoids labelling older observations with a newer source date.
The first retained edition alone produces no movement story.

The individual-contribution editor now offers “Story festhalten” and reopening
of the latest saved edition, including after remount. The template exploration
view does not silently save its unsaved design variants. Browser verification
caught and rejected stale August content, then saved and reopened Breiholz's
September 9 contribution (63 percent). No publication occurred. Draft preview
omits share/link actions because it has no public story URL yet.

58 targeted tests and type checking passed before the final read-back endpoint;
the endpoint was subsequently type checked. Public rollout and the final
ranking visual still await the joint local release review.
