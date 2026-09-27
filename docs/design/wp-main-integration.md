# Heat pump design integration, 2026-09-24

The original design remains intact in `codex-wp-ergebnis-design`. Integration is performed in `codex/wp-main-integration`, against main at dc0f93ba.

- Use main's SharedSiteHeader and SiteFuss in the site layout. Retain the calculator input steps, result design, illustrations and investment model.
- Retain main's fuel-reading conversion: an oil reading selects an oil reference; existing and replacement boiler efficiencies remain distinct.
- Retain the current responsive RaceChart and add optional title/actions/initial progress for the calculator.
- Restore the device catalogue, import and tests required by the existing device recommendation feature.
- Update copy assertions to the user's approved product disclosure and promise. Restore the visible price date and shop-price qualification at each price.
- Replace the old renovation-ranking assertions: heating savings within different building states do not establish renovation profitability because insulation costs and grants are excluded. The UI now says this explicitly. Tests enforce that scope instead of a numerical threshold tied to an old investment model.

No deployment or integration into main is included.

## Release validation, 2026-09-26

The operator authorized release after final validation. The branch now includes current main (617dfd56); its shared header, search and district changes are retained.

- Existing heating is optional in the initial flow and can be supplied in the result's funding check. Until the check is applied, only base funding is used.
- Building, price and PV dialogs edit drafts. Cancel discards them; applying recalculates the result and restarts its count-up.
- The obsolete net-investment override is removed. Gross investment, eligible grant and net investment remain connected.
- The income choices now cover the existing child allowance through EUR 60,000. Tests cover the allowance boundary and share-state round trips.
- Full unit suite: 5,218 passed, one skipped. Production build and type checking passed. The flow runner covered 15 heat-pump paths; dedicated browser checks covered funding confirmation, public legal copy, seller disclosures, input changes and share-link restoration. Responsive UI was inspected at 320, 375, 569 and 1,280 pixels.
- Broader calculator standardization and the BKW redesign remain the next stage; they are not included in this release.
