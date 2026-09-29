# Regional navigation: local review

The common LandkreisSeite composes district, state and Germany pages. Order:
racing chart, RegionNavigation (alphabetical children with accessible search),
energy monitor, existing expandable ranking table. No scene files changed.

RegionNavigation reuses DonutChart and the existing regional card surface.
Each card links to its direct child, with prefetch disabled to avoid loading
all child pages. Search also matches names without umlauts and ß.

## Metric

Modelled monthly solar energy, in MWh. Ring = child's monthly energy / parent's
monthly energy. This is not installed capacity and not a rolling 30-day value.
The newest validated complete calendar month before the register month is used;
all children share that month and their sum must match the parent.
Confirmed plant-free areas contribute zero. Unknown children are not zero.
Older packages without the optional summary retain navigation but show missing
energy explicitly. No per-child reads or aggregation on a page request.

The existing district/region package builder now retains child monthly totals
from the inputs it already loads. District content revision 4 invalidates old
fingerprints, including region fingerprints. Before public layout release, run
the existing package build after the code is approved. No publication occurred
as part of the local review.

## Reproduce real-data local previews

`npx tsx scripts/region-navigation-preview.ts 15091 /tmp/region-navigation-preview`
(repeat with 15 and de). This only reads published storage and writes local
copies; it cannot publish. Start the local server with
`REGIONAL_UI_FIXTURES=/tmp/region-navigation-preview` in development.
The established regional fixture reader now also supports district packages;
production ignores the fixture variable.

Verified source generation: 20260928T141618Z-7488ad. August 2026:
- Wittenberg: 9 children, 46251.671196 MWh.
- Sachsen-Anhalt: 14 children, 761082.733824 MWh.
- Germany: 16 children, 15887482.008967998 MWh.
