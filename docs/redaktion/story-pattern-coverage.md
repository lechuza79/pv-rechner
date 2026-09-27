# Municipal story discovery: coverage contract

Audit date: 2026-09-14. This document describes inspected implementation, not a claim that every data story is discoverable. The original family registry is `lib/social-funde.ts`; the municipal discovery report and its adapters are a separate path that must not silently replace it.

## Three different meanings of coverage

1. **Source coverage:** all available records were read and reconcile with independently aggregated counts and units.
2. **Pattern coverage:** each original family is implemented, deliberately outside the municipal scope, or has an explicit unavailable input. A missing adapter is not “no story”.
3. **Journey coverage:** every eligible finding can open its actual evidence in the design preview, preserve related observations, and support the same story in social, municipal teaser, feed and detail.

Passing one layer does not establish either of the others. Candidate counts are not a completeness metric.

## Original patterns versus the current municipal path

| Original family | Original purpose | Current municipal coverage | Required treatment |
| --- | --- | --- | --- |
| `ausreisser` | High and low peer outliers | Recomputed from current per-capita stock, annual additions and installation-size metrics within population bands. | Keep source edition and cohort membership reconstructable. |
| `kontrast` | Strong differences between places | Recomputed municipal counterpart against an opposite-quartile place in the same cohort. | Descriptive selected contrast, not a representative group-median claim. |
| `umkehrung` | Different ranks on related metrics | Current stock versus growth ranks use the same cohort. | Not a historical rank change. |
| `aufholer` | Low stock/high growth or reverse | Both directions recomputed; related observations remain available together. | No growth-causality claim. |
| `topliste` | Shared feature among leaders | Leading places and shared federal-state feature recomputed, including ties. | A shared feature is not a cause. |
| `david` | Small versus large places | Small municipality versus three largest in cohort context, with absolute and population-relative values. | Explicit selected comparison. |
| `flaechenmix` | Installation composition | Declared register segments and count/capacity shares. | Building-mounted does not establish private/commercial use. |
| `foerderluecke` | Differences in support | Explicit missing compatible complete programme comparison; verified individual programme states/changes are separate findings. | Catalogue absence is not absence of funding. |
| `kohorte` | Size by commissioning cohort | Recomputed mean capacity with actual per-year installation denominators. | Mean is not typical size or paired-storage penetration. |
| `heizungsfoerderung` | Heating support | Explicit missing verified eligibility inputs in this municipal run. | Retain original funding workflow; no invented local eligibility. |
| `wohnform` | Housing and solar context | Census composition plus building-mounted capacity per dwelling recomputed. | Separate Census and register dates; includes non-residential installations, not roof potential. |
| `anomalie` | Unusual periods | Full history and local monthly/day/week observations, counts and capacity. | Descriptive screening with declared maturity and comparison rules. |
| `saison` | Energy comparison for calendar periods | Explicit missing municipal weather/production series. | National electricity mix is not municipal production. |

Every municipality now receives all thirteen original-family checks. These municipal counterparts are not asserted to reproduce every original national/group pattern identically. The national audit validates this accounting independently of finding counts.

## Required per-pattern result

Every versioned pattern should return one of:

- **Evaluated, findings present:** candidate identifiers and the exact selection rule.
- **Evaluated, no matching finding:** input coverage and why the rule did not match.
- **Input unavailable:** named absent source or incompatible editions; never equivalent to zero.
- **Not applicable:** a documented product scope reason, such as a national electricity-share story in a municipality-only run.
- **Not connected:** available source/pattern exists but its adapter has not run. This is an implementation gap, not an editorial rejection.

These are technical audit states. The working gallery should show usable stories; it must not ask the operator to repair source quality or to approve routine arithmetic. Unsupported causal claims should be removed from the claim, while preserving the independently supported observation.

## Semantic contract of a finding

Persist: geography, measured subject, current-active-versus-historical status, unrounded evidence with units, source-specific date and URL, compared periods, exact reference membership or reconstructable reference series, completeness and maturity policy, method version, and limitations that materially change the interpretation. A headline, integer score and three numeric cards do not meet this contract.

A stable substantive fingerprint must distinguish a changed fact from a later export of the same fact. Publication snapshots must remain immutable; discovery reruns may update their own current candidates without rewriting published stories.

The template adapter must not assume that equal units imply comparable quantities. A whole and its parts, a stock and an annual flow, and a modelled expectation and a measured value all need different treatment. Never relabel Census or funding data as MaStR merely because that is the report's principal source.

## Changes verified in the monthly/day/week modules in this audit

- Removed the blanket year-2000 and recent-three-years exclusions in solar event discovery. Early dates remain register declarations, not independently verified construction dates.
- Global historical maxima no longer suppress later local episodes. Monthly local screening includes capacity as well as counts; day/week screening evaluates preceding two-year contexts as well as the full series.
- Zero months/years inside the complete export contribute to calendar coverage. The count of nonzero rows is not the duration of the series.
- A verified high month-sum in at most three units is usable as that numerical observation; it is not a claim identifying a large project.
- Funding screening uses a preceding twelve-month context with zero months, rather than all other nonzero months including the future. Temporal proximity remains insufficient evidence of programme effectiveness.
- Impossible ISO weeks, duplicate detail buckets and invalid values cannot produce day/week maxima.

These changes do not establish statistical recall or correctness of implausible individual registry dates. The fixed thresholds are explicit editorial screening rules. Three months of maturation do not prove that late registration has ceased.

## Acceptance before declaring the original failure resolved

1. The coverage report accounts for all thirteen original families, with no silent missing adapter.
2. Cross-check cities of different sizes, sparse and dense series, and a reference set of manually known findings; report misses as well as false positives.
3. A historic peak, a later local peak, a decrease, a stable structural fact and a supported funding change all survive discovery, grouping and navigation into design.
4. Opening each finding shows its own evidence, source dates and comparison periods. Every grouped observation remains accessible.
5. Repeating an identical run leaves substantive identifiers and newness unchanged. A new source edition does not rewrite a saved story.
6. No modelled electricity, revenue, causal funding effect, paired-storage share or reconstructed historical rank is asserted without the necessary underlying data.

## Source replay added after the initial audit

`scripts/story-original-patterns.ts` now computes municipal counterparts directly from the full solar rows, municipal directory and optional Census rows. It covers comparison outliers, a declared opposite-quartile comparison town, stock/growth rank contrast on identical members, both stock/growth directions, small-town versus three-largest-city comparison, a top-ten-with-ties composition pattern, annual mean unit-size changes, and building capacity per dwelling. It adds one coverage result for each of the thirteen original names.

This is deliberately not a blind import of the old wording: declared building-mounted units are not renamed private roofs; dwelling denominators have their Census date; a battery ratio is never substituted for a linked ownership share. The national/group-level meanings of some original patterns differ from these municipal counterparts. Funding-gap, heating-funding and municipal weather/production patterns still report missing inputs explicitly.

Actual local replay against the complete source files on 2026-09-14 produced 16 additional observations for Trier and 15 for Nidda, before grouping and alongside existing source modules. Those counts describe that replay only. The relevant evidence includes a declared quartile comparison with Leipzig for Trier, a named-largest-cities comparison for Nidda, and year-by-year changes of arithmetic mean installation size. Five dedicated tests cover all-family accounting, reverse stock/growth direction, absent population provenance, repeat-run candidate stability and invalid-source rejection. Together with the monthly/day/week modules, 25 tests passed.
