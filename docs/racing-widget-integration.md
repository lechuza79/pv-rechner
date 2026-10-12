# Shared racing widgets — local migration, 4 October 2026

## One renderer, preserved chart

`RaceChart` owns the existing two-line drawing, moving camera, milestone track,
event navigation and playback scrubber. No fork of the chart was introduced.
Full widgets now use `ExportableWidgetFrame` for help, primary/menu actions,
source attribution and image/video capture. Mini cards remain linked previews.
Calculator instances keep their hidden heading and disabled actions.

`WidgetPresentation` now wraps both cost-race embed routes. Theme, sharing and
autoplay changes therefore use the shared live presentation context. The registry
advertises these controls for both races. Embedded sources remain visible;
onsite sources are in help and exports. The export frame accepts an optional
legend so the meaning of both lines survives an image export.

The renderer implements the shared animation commands (pause, seek, restore,
restart and duration). Playback and video use the same accelerating clock.
The old independent canvas/video recorder is no longer used by this renderer.

## Additional worldwide comparison

- Component: `components/energy/WorldElectricityRaceWidget.tsx`
- Preview: `/embed/welt-stromrennen?theme=dark&onsite=1&autoplay=off`
- Registered in the widget gallery and component catalogue.
- Metric: annual electricity generation in TWh, Wind + Solar versus Nuclear.
- World observations 2000–2025 from Ember's public yearly electricity CSV.
- Snapshot and source checksum: `data/world-electricity-race.json`.
- The annual adapter uses one observation per year, not invented daily data.
  Only the line drawing moves between observations. Labels and hover show the
  published year and its value. Milestones are derived from those observations.
- This is separate from `/embed/zubau-erneuerbare-atom`: that existing static
  capacity-additions chart (GW) remains unchanged.

No deployment is implied by this local integration.

## Verification

36 focused tests passed (shared architecture, annual data, clock/seek invariants),
and TypeScript passed. Browser checks covered the existing heat race and the
world race at 360px, milestone navigation, start/pause and seeking to the end.
The worldwide end-state PNG was downloaded and inspected; export restores the
original playback position and includes the shared legend/source footer.
The full MP4 encoding run has not been verified in this pass.

## Annual net capacity additions (5 October 2026)

The additional `/embed/welt-zubaurennen` uses `WorldCapacityRaceWidget` and
exactly the world series from `country-comparison.ts`, also used by the static
comparison. Values are annual net GW additions, including negative nuclear
values when dismantling exceeds additions. No accumulated values or new source
snapshot were introduced. Both existing comparisons remain registered.

The shared renderer has an explicit milestone timing variant: more time around
milestones and a slower closing phase. It uses the same clock for playback,
seeking and export. This is not the district ranking's rank-change weighting.
Annual plots now retain negative values and the full historical range at the
end, rather than assuming positive, increasing cost series.
