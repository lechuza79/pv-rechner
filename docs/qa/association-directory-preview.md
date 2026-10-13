# Association overview preview — 2026-10-13

## Accepted correction

Associations are destinations, not municipality filters. The shared place directory displays municipality and association entries with explicit type labels. Two existing OnsiteSearch fields sit alongside each other and navigate directly to the selected municipality or association page. No native select or bespoke autocomplete remains.

All 148 official Verbandsgemeinden use the existing `/verbandsgemeinden/<name>` route and shared district-page composition. Municipality URLs remain unchanged. Breadcrumbs include the association. Global site search and Atlas search resolve association IDs to their own overview.

## Data boundary

The 2,377 official memberships come from Destatis GV100, 2026-08-31. `lib/verband-directory-data.json` records the source URL and text hash. Refresh using `npx tsx scripts/verband-directory-build.ts <official text> <source URL>`.

Association cards sum complete child totals from the existing district package. These overlap municipality entries and never contribute a second time to the district total. Association overview directories retain only their own member totals and use their own sum as denominator. Missing member data refuses the derived amount.

Weilerbach and Bad Breisig retain their existing complete monitor pages. Other associations show map, comparison and municipality directory from existing district data; no invented monitor, subscription option or empty story section. No request-time member-package fan-out was added.

## Verification

- Full suite: 7,014 tests passed, 3 skipped, no failures; type check and diff whitespace check passed.
- District-scoped URL uniqueness, released path compatibility, official membership and subset-energy refusal covered.
- Browser: two shared suggestion fields beside each other at 744px; direct Landstuhl navigation opens its own overview with exactly 12 members and correct subgroup denominator.
- Browser: existing Weilerbach overview remains reachable; 390px has no horizontal overflow; 744px and 1280px keep both fields side by side.
- Preview only, port 4411. No deployment or production build performed.
