# Shared calculator result design

WP and BKW use the same result CSS and tokens in `components/calculator/`.
The WP route keeps import shims so existing consumers retain their imports.
The shared composition includes the inset result hero, count-up amount, racing
cost comparison, metrics, in-content action row that becomes sticky, product
cards, and the editable assumptions below the result.

`ResultActions` owns the accepted action layout and sticky behavior. Calculators
provide their own sharing, saving, and reset callbacks. Icons come from `Icons`.
`useResultIntro` drives the count-up and race. The solar hint is optional; BKW
starts the race after counting or on early scrolling.

Before changing a result control, identify its shared owner and existing reference
usage. Extend that owner instead of copying inputs, buttons, switches or icons
into a calculator. Location search belongs to `StandortField`, funding display to
`ResultFunding`, toggles to `Switch`, close icons to `Icons`, and apply actions to
`FlowNav`. Verify the rendered states: empty, selected, loading, checked and changed.
Funding checks preview available programs; only the bottom recalculate action
applies location and funding changes to the result. A checked location cannot be
submitted again until the field changes.

`ResultSettings` composes `Modal` and `FlowNav` for numeric assumptions:

- Opening copies current values into a draft.
- Recalculate is disabled until a value changes.
- Cancel, Escape, and close discard the draft.
- Apply alone updates the calculation; consumers apply only changed fields.

BKW price scenarios follow the same draft/apply contract. Its offer comparison
uses the selected price scenario and the existing affiliate URLs. Result links
preserve set, storage, scenario, consumption, price, location and manual costs.

`calcBalkon` exposes annual costs from its existing lifetime loop. `balkonRace`
interpolates those totals for the shared `RaceChart`; it does not calculate a
second savings model. The final cost difference equals the displayed net benefit
exactly. Storage lifetime, degradation and price changes remain in the core.
The UI explicitly describes the interpolation as a model, not a weather forecast.

Validation covers all storage sizes and price scenarios, chart balance,
calculation and affiliate comparison, draft editing, and responsive rendering.

WP and BKW now share `AffiliateTrust` (including `ContactPerson`),
`AffiliateCarousel` (Embla), `AffiliateActions`, and `AffiliateDetails`.
Advertisement labels remain inside every product image, at the upper right;
the recommendation badge occupies the upper left. Domain-specific product data
and ranking remain in the original calculators. Sharing and copying preserve
the merchant affiliate URL. The trust texture and surfaces use the WP styles.


## Shared electricity assumptions and monthly BKW balances

`lib/electricity-projection.ts` owns the electricity assumptions for household
and heat-pump tariffs. Household electricity uses the UBA/Prognos 2026 household
row (table 13, 2025–2045), converted from real to nominal with table 3's GDP
price index. Its unrounded geometric annual rate is about 1.40946 percent.
This smooth rate is applied to the current marginal tariff over the calculator
horizon, including beyond 2045; it does not reproduce each source-table year.
The source's average price contains allocated fixed charges, so transferring its
relative trend to the marginal tariff is an explicit approximation. Fixed charges
are never credited as avoided solar costs. The +/-1 percentage point variants
are sensitivity assumptions, not source forecasts or confidence bounds. Switching
them does not change self-consumption. Existing heat-pump assumptions are unchanged.

Public market-price readers and browser caches use the central model rate;
legacy database values cannot override it. Market price levels remain dynamic.
Price assumptions are no longer editable in the market-price administration form.

BKW monthly costs come from `simulateSolarYear`, the existing shared simulation.
Monthly weights reconcile rounded simulation outputs to each annual cost ledger,
including degradation and the end of battery life. `balkonRace` interpolates within
months only. Endpoints stay identical to the calculator; the payback marker is
located at the actual crossing of the seasonal cost lines.

Validation: `electricity-projection.test.ts` derives the reference factor from
independently transcribed source values, checks stale caches, and compares the
same self-used kWh across PV/BKW. `balkon-race.test.ts` checks monthly/yearly
balances, seasons, battery retirement, leap years and zero production.

`CalculatorTheme` owns the fixed result palette for both calculators.
`input-design.css` and `AccordionField` also own the boxed result disclosures;
BKW settings, location/funding and technical details reuse these WP components.
Carousel card widths belong to the shared stylesheet, not to a calculator.
The optional location prompt waits for count-up and opens location/funding.
`RaceChart` supports pointer and keyboard inspection (arrows, Home/End, Escape)
for both series, with inspection overlays excluded from exports.

### BKW: shop-backed result

`useBalkonAngebote` owns one catalogue snapshot for the calculator and its offer cards. The main result selects the same highest-lifetime-benefit offer as `BalkonAngebot`; explicit product choices are preserved with the `offer` URL parameter. `configFuerAngebot` supplies the actual module power, inverter limit, battery capacity and complete package price to the existing `calcBalkon` calculation. Funding uses those actual specifications and is deducted once from the gross package price. An edited investment changes the price, not the hardware. Product cards continue to show gross, pre-funding comparisons.

When no matching available offer exists, the result explicitly identifies the generic configuration and model prices. The data-status cards distinguish the shop retrieval date from the model-price review date. Package prices do not establish a storage-only surcharge; storage-only payback claims are therefore omitted for shop bundles.

Result metrics in WP and BKW use `ResultStatCard`. Pass units separately (`unit`) so years, currencies and percentages share the subordinate unit style. Floating notices use the central `--shadow-toast` token in `Toast`.

`AffiliateFundedPrice` owns the funded-price block in WP and BKW, including the help tooltip and funding action. Calculators supply their own assessed amount and explanation; BKW must not copy the WP markup or show the subsidy amount as the funded price.
