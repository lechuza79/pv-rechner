# Widget gallery: curation and next integrations

Local review, 30 September 2026. No publication or removal of existing embeds.

## Current selection

The gallery reads the existing widget registry and its real renderers. Its presentation
policy lives in `lib/widget-gallery.ts`; `GALLERY_HIDDEN` records reversible exclusions.
This does not establish that an excluded widget has no external users.

- Start with Places compared: podium and regional race, two examples instead of 32.
- Local energy: current monitor charts, including growth, composition and generation.
- Germany: national energy charts, retaining their existing variants.
- Costs compared: PV, heating and green-gas comparisons. These are still used in articles.
- Temporarily hide nine entries: the five older municipal/state views, generic number,
  editorial story, full simulation and funding questionnaire. Do not delete routes.
- Do not propagate menus until this selection is reviewed.

## District hero: prepare the real map, not the old atlas map

The current district page uses `components/landkreis/RegionKarte.tsx` with
`region-scene.ts`, not `MastrHeroSection`. Preserve rotation, touch interaction,
metric switching and its fallback rendering.

Integration boundary:
1. Extract the existing metrics adapter from `LandkreisSeite.tsx` into a shared function.
   Both page and widget use `foldSiblings`, `isDistrictMember` and identical formatting.
   Missing values stay null; forests and retired municipalities must not enter totals.
2. Reuse `districtGeometry` and the chosen municipality's actual district. Independent
   cities need an explicit supported fallback, not a guessed district prefix.
3. Register a standalone map widget centrally and render the existing RegionKarte
   through the shared widget frame. Do not embed the whole district page or recreate 3D.
4. Expose navigation as an explicit option: the gallery must not unexpectedly leave
   for a municipal page when the user inspects the map.
5. Review at gallery column width and mobile width; test all three metrics, labels,
   WebGL fallback, ordinary page scrolling, touch gestures and actual readiness.

Implemented locally on 1 October: `RegionMapWidget` reuses `RegionKarte` and its
scene. `regionMapMetrics` now serves both the district page and the widget. The
standalone route is `/embed/regional-map?ags=06440&selected=06440016`; the gallery
resolves the selected municipality to its actual district (state fallback).
Widget interactions inspect places without navigating away. The selected municipality
is passed to the existing highlight state. One container-responsive standard layout,
fixed dark theme, three current aggregate metrics. No period selection, image/video
export or extra size variants are offered yet. Sources include MaStR and BKG.
The municipality page can import this component directly; no new page placement has
been invented in this step. Desktop/mobile renders and metric switching are checked.
Do not mark a production release based on these local checks.

## Calculator cost racing: one chart, different calculation inputs

Existing examples and personalized calculators already share `components/charts/RaceChart.tsx`:
- `KostenrennenWidget` and `/embed/pv-kostenrennen` supply the editorial PV example.
- `PvResultRace` supplies actual PV calculator results via `pvRace`.
- `BalkonRace` supplies balcony calculator results via `balkonRace`.
- `HeizkostenrennenWidget` supplies the heating example.

Prepare the design migration at RaceChart and the shared frame, not a gallery CSS
replacement. Preserve calculator models, event timing, units, break-even and data
sources. Keep example inputs explicitly examples, not the visitor's personal result.
Provide calculator-specific controls through existing props; a gallery must not copy
calculator result markup. Audit the older browser video path against the common server
export service before exposing any additional video action.

Acceptance: compare the real article embed and calculator result side by side, both
mobile and desktop, at start/midpoint/end. Verify totals against the unchanged model,
replay, tooltip behavior and export availability. Full configuration (dataset, period,
theme, format) remains deferred; add only capabilities a renderer actually supports.
