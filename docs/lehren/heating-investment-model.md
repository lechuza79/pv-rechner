# Heating investment by capacity

Research and independent review: 2026-09-14. This supersedes the constant gas
investment and the linear total-price rule for air/water heat pumps.

## Sources inspected

- KWW Technikkatalog 08/2026 version 1.1, current download verified on its
  [official page](https://www.kww-halle.de/waermeplanung/technikkatalog).
  [Original workbook](https://api.kww-halle.de/fileadmin/PDFs/KWW-Technikkatalog-Waermeplanung_08-2026_Version_1.1.xlsx):
  Tab 5 rows 6/14/23/24 for gas; Tab 10 rows 6/10/11/12 and note AX for heat pumps.
  All workbook amounts used here are net EUR(2026); VAT is added exactly once.
- VZ Rheinland-Pfalz 2025, **pp.7–8, Table 3**, local original
  `docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2025-06.pdf`:
  42 offers including DHW, hydraulic balancing, foundation and electrical work,
  **excluding radiator replacement**; median EUR 36,011 gross, range
  EUR 26,298–52,032. The 10-kW median on p.4 describes the full sample, NOT
  this filtered subgroup. [Official source page](https://www.verbraucherzentrale-rlp.de/waermepumpen-wir-checken-ihre-angebote-98555).
- VZ RLP 2026, local original `docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2026-07.pdf`,
  pp.4–8: unfiltered median EUR 34,898, broad scatter, no published regression.
  It is **not** substituted for the filtered anchor: some offers include radiators
  and others omit important work. The newer national VZ survey reports a
  EUR 36,000 average with disposal and connection, excluding heating surfaces;
  it supports retaining the approximate older price level, not a precise curve.
  [National survey](https://verbraucherzentrale-energieberatung.de/heizen/neue-heiztechnik/entwicklung-heiztechnikpreise/).
- [Vaillant ecoTEC plus](https://www.vaillant.de/produkte/ecotec-plus/): real
  10/15/20/25/30-kW classes and separate DHW capability. This supports the
  plausibility of a small common cost class; it does not prove a universal
  minimum price or select a suitable appliance for a particular house.

## Gas: published complete-system curve

Gross investment = `1.19 × 3527.996080056838 × max(10, buildingHeatLoadKw)^0.5192211045318676`.

Use the full building heat load, not the WP sizing factor. KWW's range is
10–100 kW. Below 10 kW our explicit assumption retains the smallest cost
reference; do not extrapolate a cheaper hypothetical small boiler. Above
100 kW the estimator rejects unsupported inputs instead of silently clamping.
The ordinary UI's building and manual heat-load ranges fit inside this domain.

The regression is used consistently, including at table points. Its 10-kW value
is about EUR 13,877 gross; the rounded source table gives EUR 14,042. Do not mix
these methods at isolated points: doing so creates discontinuous prices.
At 13.3 kW the curve gives EUR 16,092; at 20 kW about EUR 19,888.

Scope: basic plant with associated installation plus the catalog's additional
measures, simple flue adaptation and standard storage. These are planning
averages, not individual quotes. The legacy config field `fossilErsatzInvest`
is now the **10-kW reference amount**, not the price for every house.
`fossilReplacementInvestment(kind, cfg, heatLoadKw)` is the sole scaling rule.

## Air/water heat pump: KWW core plus a calibrated fixed remainder

Core = KWW Tab 10 row 10 multiplied by its capacity, then VAT. Interpolate
**absolute** core costs linearly between source points; do not interpolate €/kW
and multiply again. The core already includes its associated installation.

| Cost class kW | Core, net EUR |
|---:|---:|
| 5 | 9,500 |
| 10 | 15,300 |
| 20 | 24,600 |
| 30 | 32,700 |
| 40 | 40,000 |
| 50 | 46,500 |
| 60 | 52,800 |
| 80 | 64,000 |
| 100 | 75,000 |

Gross total = interpolated gross core + EUR 17,804 fixed remainder + optional
existing radiator-replacement assumption. At 10 kW this gives EUR 36,011;
at 5 kW EUR 29,109; at 20 kW EUR 47,078, without radiator replacement.

The remainder is **our calibration**, not a measured subtotal: 36,011 minus
15,300 × 1.19. It represents the rest of the offered work and avoids scaling
all storage/electrical/foundation costs down with space-heating demand.
Using the filtered median at 10 kW is also an assumption. The newer survey
confirms the approximate level but does not establish that exact pairing.
Below 5 kW retain the smallest cost reference; above 100 kW reject extrapolation.

KWW's heat-pump capacity refers to A2/W35. Our calculated installation size is
used only as an **assumed cost class**, not a verified conversion to that test
point. Manufacturer performance, local design temperature, DHW requirements
and the actual installation still require individual selection. No unsupported
universal capacity multiplier is introduced.

The optional radiator allowance remains separate. Do not add KWW row 13:
it already includes heating surfaces. Its component breakdown is actually
Tab 57 although the workbook footnote still points to Tab 53. The chosen VZ
filtered price excludes radiators, avoiding that overlap.

Ground-source WP and oil retain their independently described existing
assumptions; they do not inherit the gas curve or claim the new LWWP calibration.

## Quotes, subsidies and sensitivity

- Entered WP net price replaces the estimate, already after subsidies.
- Entered fossil price replaces the estimate; zero remains continued operation.
- Quotes are not scaled with changing building states. The UI states that they
  remain the same; users must enter offers appropriate to the compared house.
- Opposing investment stress cases: favorable to WP = WP gross −20%, fossil
  +20%; adverse = WP gross +20%, fossil −20%. Recalculate grants and municipal
  caps from each gross amount. Keep energy assumptions fixed and entered prices
  unchanged. The ±20% is a deliberate scenario choice, not a confidence interval;
  KWW's gas uncertainty is likewise not a guarantee that real offers lie inside it.
- Insulation costs and insulation subsidies remain outside the heating comparison.

## Integration in the current result-design task

1. Pass `heizlastKw` from the calculation to `fossilReplacementInvestment`.
   For UI edit fields use **the displayed result's `gasInvest`**, never the
   10-kW default for a larger house. The early reference-selection calculation
   may use the minimum reference only to determine whether a new boiler is
   selected; it must not supply displayed prices.
2. `HeatPumpInvestmentAssumptions` additionally receives `fuelKind`, `wpType`,
   `heatLoadKw={sel.heizlastKw}`, `costClassKw={sel.auslegungKw}` and `sensitivity`.
   Calculate that with `calcHeatPumpInvestmentSensitivity(activeInputs, cfg,
   heatPumpScenarioAdj(greenGas ? "realistic" : effScenario, cfg))`, matching
   the displayed result. Keep exactly one note after the result summary.
3. New config field `investLwwpCoreAt10Kw` replaces `investLwwpPerKw`. Update any
   imported metadata or display claiming a linear formula; never revive that
   field during merging. The standalone funding calculator still calls the same
   canonical `calcInvestBrutto` and therefore inherits the corrected assumption.
4. This patch is based on an isolated snapshot of the pending design model,
   combined with current main's existing Berlin-date and fuel-reading fixes.
   Apply only the final investment commit; do not replace the whole design UI.

## Verification

Source-point and VAT checks; source-range and minimum-class boundaries;
monotonic costs; full building load for gas; fixed WP remainder; exactly one
radiator allowance; quotes including zero; subsidy-cap crossing in stress
cases; unchanged running-cost arrays and annual-ledger reconciliation.
Browser checks must additionally exercise the actual result's building tabs,
inline edits and expanded sensitivity explanation at mobile and desktop widths.
