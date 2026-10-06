# BKW model review — 2026-09-27

Status: local inventory complete; independent Claude review has not run. Code findings below are not a live validation of manufacturer specifications.

## Review scope

Read-only review of the existing calculator and its shared model. No second simulation engine. Prioritize existing models, source-backed assumptions and regression evidence before changing the recommendation.

Read: `lib/balkon-sim.ts`, `lib/pv-sim.ts`, `lib/consumption.ts`, `lib/solar-year.ts`, `lib/balkon.ts`, `lib/balkon-config.ts`, `lib/shop-angebot.ts`, `lib/shop-solakon.ts`, `lib/use-balkon-angebote.ts`, `lib/balkon-race.ts`, the BKW page and relevant tests. No credentials or environment files.

## Reuse map

- Generation: existing PVGIS monthly site data and shared solar-year orientation series.
- Household consumption: `calcHourlyConsumption` from `lib/consumption.ts`.
- Dispatch: `simulateSolarYear`, also used by rooftop PV through `lib/pv-sim.ts`. Any extension needs regression tests for both callers.
- Economics: `calcBalkon`, including the existing central electricity-price projection, shared degradation and storage retirement.
- Shop equipment: `configFuerAngebot`; complete package price is counted once. Main result and offer cards consume the same catalogue snapshot.
- Funding: existing funding stack using actual power, battery capacity and gross investment.
- Chart: `balkonRace` consumes the model's monthly ledger and derives its horizon from its length.
- Presentation: shared result metrics, settings modal, options, toast and affiliate components.

## Confirmed code limitations to review

1. The hourly storage model clips generation before charging. Its justification refers to small batteries, whereas the catalogue now exposes much larger batteries. Recheck suitability rather than copying another storage implementation.
2. Catalogue nominal battery capacity is currently passed to a simulation input documented as usable capacity. Manufacturer usable capacity, charging/discharging limits and standby consumption need primary-source evidence; do not invent conversion factors.
3. Existing storage efficiency is a documented class-wide assumption, not measured efficiency for each shop bundle. Retirement is modeled at 12 years; no automatic replacement cost is assumed.
4. Package price does not establish installed total cost. Additional costs need explicit inputs or verified included items, not invented lump sums. No storage-only surcharge can be inferred without a genuinely comparable bundle.
5. Shading is not an explicit model input. Any extension must be source-backed, keep weather/site yield distinct, and preserve existing rooftop results by default.
6. A 10-year default must change economics, ranking, annual averages and all labels consistently; 20 years remains optional. The chart already reads its horizon from the ledger. First-year bill savings and average net benefit are different quantities.
7. Offer alternatives should include an economically relevant low-cost/no-storage choice, not only the top three long-horizon gains.

## Required review output

- Up to eight ranked findings with file and line evidence.
- Separate proven defects, intentional approximations, and unverified source claims.
- Minimal shared implementation plan and primary sources still needed.
- Reference cases: no storage; small and large storage; clipping; retirement; 10/20-year endpoints; funding deducted once; custom cost; unavailable catalogue; explicit selection and shared-link restoration.
- Verify consistency of all shared callers and explanatory copy. Passing arithmetic tests alone does not validate physical assumptions.
