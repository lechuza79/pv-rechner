# BKW result consistency — stage two

Local implementation in `codex/bkw-shared-calculator`, building on the shared
storage audit from 27 September 2026. No merge or deployment performed.

## One calculation contract

- The result explicitly passes a 10-year horizon; users can choose 20 years in
  the existing scenario modal. Cancelling leaves the calculation unchanged.
  `calcBalkon` accepts this optional horizon; other existing callers retain their
  configured horizon. Monthly and annual ledgers, race, ranking, cards and copy
  use the chosen value. The result shows first-year savings rather than net
  lifetime benefit divided by years.
- `balkonFunding` delegates to the existing `stackFunding`. Both the selected
  system and each candidate use actual module power, battery capacity, package
  cost, housing tenure and enabled state. Existing evidence freshness gates
  remain intact. No grant data or qualification rules were changed.
- Offers are ranked after their own grant assessment. Main page and affiliate
  component share the evaluated list instead of repeating yearly simulations.
  A low-cost / battery-free alternative remains visible.
- Battery payback compares complete packages with identical module and inverter
  power, accounting for different grants. It uses differences in the existing
  annual cost ledgers and stops at battery retirement / the selected horizon.
  Missing battery-free comparison produces no standalone battery-payback claim.
- Optional additional costs default to zero, enter investment once, and do not
  create additional eligible grant costs. User-entered additional shading loss
  reduces monthly generation before clipping/storage dispatch. This is a flat
  annual user estimate, not an obstacle or module-string shading simulation.

## Shared results

Links retain the exact merchant variant plus a validated hardware/price snapshot,
period, explicit price, household/price overrides, grant switch, tenure, additional
costs and additional shading loss. Available variants use current merchant data.
An unavailable explicitly selected variant must not silently select another offer:
its snapshot becomes a visibly labelled model calculation. Legacy links without
hardware snapshots fall back to visibly labelled generic model assumptions.
A still-available variant is resolved from the entire catalogue, even if another
cheaper variant won the presentation deduplication.

## Checks

- New numerical contract suite: 12 passed. Covers 10/20 years, main/card/race
  equality, grants exactly once, storage-only grant reversing ranking, expired
  evidence exclusion, battery-free alternatives, missing comparator, additional
  costs, complete shading and large-battery snapshot validation.
- Existing model suite: 54 passed (`/tmp/bkw-stage2-regression.log`).
- Existing offer/race suites: 30 + 13 passed in `/tmp/bkw-stage2-final-tests.log`. Together with the new contract checks and model regression, 109 numerical/regression tests passed.
- Browser checks cover period apply/cancel, exact large battery with overrides
  through sharing, and unavailable-variant fallback. The initial sandbox run
  could not launch Chromium; the permitted local browser run succeeded.
- Three browser scenarios passed (`/tmp/bkw-stage2-browser-final.log`), including apply/cancel and both shared-result cases.
- Chart endpoint interaction passed for both 10 and 20 years (`/tmp/bkw-stage2-browser-chart.log`); screenshots `/tmp/bkw-stage2-result.png` and `/tmp/bkw-stage2-stats.png` visually inspected at 569 px. No horizontal overflow.
- Full TypeScript check passed (`/tmp/bkw-stage2-types-final.log`).
- Local server on port 3064 was restarted after its former process stopped. The restart is bound to 127.0.0.1.

## Release boundaries still apply

This stage does not activate unverified manufacturer usable-capacity or charge
power values. Stage one's optional storage dispatch remains available, with its
unchanged legacy default; manufacturer limitations and the chronology experiment
are documented in `solar-storage-2026-09-27.md`.

The worktree also contains earlier shared electricity-price / roof-PV changes.
This stage does not approve those for release. Review or separate that existing
scope before integrating the calculator work. Passing the BKW tests alone is not
production release approval or a claim of manufacturer-verified storage accuracy.

## Follow-up audit — 27 September 2026

The previous focused checks were not a complete pre-commit suite. The subsequent
full run exposed the stale funding assertion, hardcoded price text/comment,
a missing teaser registration, a chart data-tooltip ownership entry, and a test
using UTC instead of the shared Berlin calendar date. These have been corrected.
The local HTTP source-reader test additionally requires permission to listen on
localhost; its sandbox failure is not a funding calculation failure.

The reported methodology "2% versus 1.4%" needs qualification: the 2% text was
in the gas/oil section, matching the fuel helpers' default, not electricity.
It now reads the same exported fuel assumption as those helpers. The outdated
2% electricity comment in `marktwert-config.ts` was also corrected. The existing
shared electricity projection itself is unchanged in this follow-up. The user
explicitly approved sharing the price assumptions ("die sollten wir aber für alles
nehmen", then "ok, go"); this does not constitute a deployment approval.

Solakon ONE charging before the AC limit is now enabled through the shared offer
adapter and existing storage dispatcher. Datasheet re-downloaded and extracted on
27 September: direct PV input 2600 W, AC output 800 W. Nominal capacity remains
unchanged; no invented usable capacity or charge-power limit was introduced.
The main result now explains that nominal capacity overstates usable capacity
and that consumption-following control is assumed. Shared hardware links retain
the coupling so unavailable-offer fallback calculations stay consistent; old
snapshots without topology retain the legacy default. Generic BKW and roof PV
storage defaults remain unchanged. An integration regression compares the known
shop configuration against the legacy one and checks shared-link equivalence.

Final follow-up validation:
- Complete working-tree suite: 456 files passed; 5,271 tests passed, 1 skipped
  (`/tmp/bkw-review-permitted-suite.log`). Includes the formerly failing checks.
- Full TypeScript check passed (`/tmp/bkw-review-final-types.log`).
- All three browser contract cases passed (`/tmp/bkw-review-browser-final.log`):
  10/20-year apply/cancel, shared large storage with overrides, unavailable offer.
  The main-result nominal-capacity qualification is asserted explicitly.
- Rendered result inspected at 569 px; teaser/trust links work, no horizontal
  overflow or browser errors in the focused check. Source-adapter charging change
  also covered by the numerical integration test and shared-link round trip.
- No commit, merge or deployment. Existing parallel worktrees remain untouched.
