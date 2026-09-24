# Oil reference: source audit and integration

Checked 2026-09-10. This patch changes the oil model only; no deployment or UI edits.

## Published sources and exact inputs

1. [UBA / Prognos, Rahmendaten und Endverbrauchspreise 2026, third edition, May 2026](https://www.umweltbundesamt.de/system/files/medien/11850/publikationen/2026-05/Rahmendatenpapier_3A.pdf).
   Table 11, printed p.57, heating-oil end-user price **including VAT**:
   years 2025/2030/2035/2040/2045/2050 = 1.0/1.1/1.2/1.3/1.4/1.5 EUR(2024)/litre.
   These prices already contain the carbon price and energy tax. Do not add the
   separate gas/CO2 surcharge. Do not use gas-network escalation rates.
   Table 3, printed p.21: GDP price index, 2024=100:
   2024/2030/2035/2040/2045/2050 = 100/118.2/131/143.4/156/169.
   Both tables were checked visually against the PDF, including units/footnotes.

2. [KWW Technikkatalog, August 2026, version 1.1](https://api.kww-halle.de/fileadmin/PDFs/KWW-Technikkatalog-Waermeplanung_08-2026_Version_1.1.xlsx),
   sheet `Tab 4` (decentralised oil boiler):
   - D6: 20 kW reference system, smallest published size (not 10 kW).
   - D7: 93% efficiency, on lower heating value. Note R explicitly warns that
     actual annual utilisation can be lower. This is a planning assumption.
   - D14: EUR 21,600 total investment **excluding VAT**; gross EUR 25,704.
   - D15: EUR 400/year O&M excluding VAT; gross EUR 476/year.
   - C29, note T: includes low-cost measures, simple flue adaptation, oil tank
     and buffer storage. C30, note U: repair, maintenance and inspection.
   - D8: 20-year lifetime assumption; not a guarantee for an existing boiler.
   - C32: covered equipment can be suitable for up to 20% bio-oil, not evidence
     that all future compliance requirements/costs are covered.
   KWW `Hinweise` confirms prices are real EUR 2026 excluding VAT, with purchase
   and installation in existing buildings. Do not mix net KWW prices with gross WP costs.

3. [Verbraucherzentrale heating equipment survey, June 2026](https://verbraucherzentrale-energieberatung.de/wp-content/uploads/2019/02/20260821_Grafik-Entwicklung-Heizungspreise.pdf)
   was inspected and **not used** for an oil-only investment: its oil entry
   includes solar thermal. The prior EUR 15,900 source described gas, not oil.

## Calculation choices (our derivation, not additional published observations)

- Linearly interpolate the real oil prices and price index separately between
  their published knots. Multiply them, then divide by 10 kWh/litre.
  Example 2026: 1.02 * (100 + 18.2 * 2/6) / 100 / 10 = 0.108188 EUR/kWh.
  Example 2045: 1.4 * 1.56 / 10 = 0.2184 EUR/kWh.
- The default starting price is a **projection assumption**, not a live offer.
  An entered all-in supplier price replaces its level; future years retain the
  relative nominal UBA trajectory. Source precision is coarse (0.1 EUR/litre);
  many calculation decimals do not imply forecast accuracy.
- One published oil trajectory is used in all three WP scenarios. Electricity
  price and WP efficiency still vary. There is no sourced three-path oil band.
- Beyond 2050, hold the last nominal value; do not invent an extrapolation.
- Keep the existing explicit 85% old-boiler assumption; a manual efficiency
  wins. It is not presented as an observation for every existing boiler.
- Replacement: separate KWW 20 kW complete-system estimate. Zero means continued
  operation without replacement within the horizon; any positive quoted price
  overrides the estimate. There is no automatic future replacement year.
- The investment is **not scaled with the WP size**. The KWW reference covers
  additional equipment which may already exist. Reuse of tank/flue/storage can
  make a project quote lower. This is not a complete-household offer calculator.
- Oil upkeep is a broader repair/maintenance/inspection allowance than the
  current WP service allowance. Do not label the scopes as identical maintenance
  surveys. Uniform repair modelling across heating types remains separate work.
- Bio-oil or other future compliance investments remain outside the calculation.
  The UBA fossil-oil table is not a complete compliant-new-oil-heating scenario.

## Required UI integration (performed by the owning UI task)

1. Use `fossilReplacementInvestment(fuel.kind, cfg)` from `fossil-reference.ts`
   for the displayed/default investment, including the `ersatzInvest` selector
   and editable price. Preserve `oFossilInvest ?? ...`: zero must stay zero.
2. Read price and efficiency from `WP_FUEL_OPTIONS`; do not hardcode 10 ct or 92%.
   Say "UBA-Modellannahme" for the oil price and allow the supplier price.
3. Use the returned scenario explanation. Do not display gas-network rationales
   for oil. Changes to gas inflation or carbon surcharge must not alter oil costs.
4. Label oil O&M "Instandhaltung und Prüfungen" and explain the scope (EUR 476/a).
   Explain the complete-system reference beside the oil investment.
5. The individual race should consume `kostenJeJahr` unchanged, including the
   independent oil costs. Do not reconstruct either side from gas constants.
6. Keep the documented missing biofuel costs visible; there is no legal verdict
   about the suitability of a particular oil installation in this patch.

## Integration into the design branch

The design branch has newer electricity/gas scenario functions than this audit
checkout. Preserve those functions/rates. Apply only the oil-specific imports,
default selection and explanation override around `calcHeatPumpScenarios`.
Keep its existing `kostenJeJahr` return. Do not replace the entire heatpump file.
The oil reference has no dependencies and therefore creates no constants cycle.

## Validation

- Five new behavioural tests failed against the old model before integration.
- Six oil tests cover original table values, gross costs, old/new defaults,
  manual quotes, one oil trajectory and deliberate gas-assumption sabotage.
- Existing assertions that required equal gas/oil upkeep or price trajectories
  were replaced with independent ledger checks; no generic tolerance widening.
- Seven targeted suites passed (175 tests) after integration.
- Full repository TypeScript check and focused model TypeScript check passed.
