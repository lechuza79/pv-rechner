# Area charts and installation counts

Concept agreed on 15 September 2026.

## Geographic area comparison

Use a municipality outline as 100% only for actual area-based metrics. The displayed polygon area excludes holes and includes all disjoint parts. An inset square representing fraction p has side sqrt(displayed polygon area * p), so it remains proportional at any viewport size. Geographic area calculations must use an equal-area projection or geodesic calculation; latitude/longitude coordinates are not planar square metres. If only the visual ratio is needed, calculate the final projected SVG polygon area.

A bottom fill must likewise represent the requested share of polygon AREA, not simply the same percentage of bounding-box height. Solve the horizontal clipping level from the cumulative area. Tiny shares may be better represented by a square with a leader label. Do not imply a real location for that square. An optional small donut can carry a second explicitly named metric at the upper right.

This is saved as a concept, not yet an implemented geographic chart.

## Installation count versus power

Do not use geographic area for a count share. Use a rectangle grid: each full rectangle represents 1, 10, 100, etc. installations, choosing a power of ten to keep at most 500 cells. The last cell represents the remainder; highlighted fill uses exact counts, never a rounded percentage. State the capacity per cell beside the chart. Keep the small power-share donut separate and labeled.

Trier, register export 10 September 2026: 4,406 active solar units = 2,768 building units + 1,628 plug-in solar units + 10 ground-mounted units. Batteries are excluded. Ground-mounted share: 10/4,406 = about 0.227%; the existing power-share observation is 39.8%. At 10 units per cell, the grid has 440 full cells and one 6/10 cell, with one full selected cell. The grid conveys register-unit count, not land area, project count, or measured generation.
