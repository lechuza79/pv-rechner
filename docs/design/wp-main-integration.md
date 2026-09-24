# Heat pump design integration, 2026-09-24

The original design remains intact in `codex-wp-ergebnis-design`. Integration is performed in `codex/wp-main-integration`, against main at dc0f93ba.

- Use main's SharedSiteHeader and SiteFuss in the site layout. Retain the calculator input steps, result design, illustrations and investment model.
- Retain main's fuel-reading conversion: an oil reading selects an oil reference; existing and replacement boiler efficiencies remain distinct.
- Retain the current responsive RaceChart and add optional title/actions/initial progress for the calculator.
- Restore the device catalogue, import and tests required by the existing device recommendation feature.
- Update copy assertions to the user's approved product disclosure and promise. Restore the visible price date and shop-price qualification at each price.
- Replace the old renovation-ranking assertions: heating savings within different building states do not establish renovation profitability because insulation costs and grants are excluded. The UI now says this explicitly. Tests enforce that scope instead of a numerical threshold tied to an old investment model.

No deployment or integration into main is included.
