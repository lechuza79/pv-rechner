# Shared solar storage — first implementation stage, 2026-09-27

## Delivery boundary

Local changes in the existing owned `solar-check-bkw-shared` worktree, preserving the prior unstaged UI and price-model work. No merge or deployment. The shared engine supports the new optional physical inputs. No caller has silently enabled them; rooftop PV and current generic/shop results keep their previous numbers until the offer adapter and visible qualifications are integrated in stage two.

The independent review's A/B work is covered here: shared dispatch, backward compatibility, manufacturer research, chronology measurements and rooftop comparison. C (funding/ranking, text, links, horizon, extras/shading) and D (separate electricity-price change for release) remain pending. Existing price-projection edits were not touched in this stage. The user's earlier approval of shared price projections must be reconciled with the review's requested release separation before integration.

## One dispatch, optional device inputs

`lib/solar-storage.ts` holds the hourly energy dispatch used by `simulateSolarYear` and the existing rooftop example-day view. It was extracted from the existing loop, not built as another simulator.

- `usableBatteryKwh`: explicit usable capacity, bounded by the supplied nominal/legacy capacity. Omitted retains the original interpretation of `batteryKwh`.
- `batteryCoupling`: default AC retains charging after clipping; DC charges before the common AC inverter. Direct consumption has priority, followed by storage and export.
- `batteryPowerLimits`: optional charge kW at storage input and discharge kW at AC output. Omitted limits are unbounded, as before. DC also limits combined direct + battery output to the existing inverter rating.
- No invented depth of discharge, new efficiency or standby number. Round-trip loss is still applied once, at discharge. Hourly resolution remains an approximation; PVGIS already includes system losses, so this extension models topology, not detailed DC converter electronics.
- Generation accounting for DC includes harvested energy going into the battery. Direct + storage input + export + inverter clipping equals available generation. Legal export curtailment still occurs after storage and is tracked separately.
- An optional reference series uses the same engine for chronology comparisons. Monthly source normalization uses the existing `referenceMonthKwh` helper.

## Manufacturer evidence checked on 2026-09-27

1. [Solakon ONE datasheet](https://www.solakon.de/cdn/shop/files/Solakon_ONE_Datenblatt.pdf), version 1.0 / 2025-08-15, page 2: 2.11 kWh nominal battery energy, 2,600 W PV input, 800 W grid output. No usable-energy, round-trip efficiency or standby-power specification. Downloaded and text-extracted successfully; web extraction alone had failed.
2. [Current ONE manual linked by the shop](https://www.solakon.de/cdn/shop/files/Solakon_ONE_Bedienungsanleitung_050925_71695673-363d-46f8-b56d-f8f9db6c9256.pdf?v=12701225351972487721), ONE v.02/2026, printed page 33: master battery max charge/discharge current 60/60 A; expansion 40/40 A; voltage range 31.9–40.1 V. These are current limits, not a fixed aggregate charge-power guarantee. Do not turn nominal voltage × current into a universal kW rating. The combined control of stacked modules still needs confirmation. The manual confirms direct PV connections and the shared AC output.
3. [Manufacturer: minimum charge and heater](https://serviceportal.solakon.de/help/solakon-one/minimale-ladung-speicherheizung-am-solakon-one): minimum SOC setting 10–40%, factory default 15%, output stops at that threshold. This is a sourced operational reserve, not measured delivered energy. A 15–100% setting spans at most 85% of nominal stored energy; it does not establish AC-delivered capacity or round-trip efficiency. Firmware/settings and the hysteresis matter.
4. [Manufacturer: charging settings](https://serviceportal.solakon.de/help/solakon-one/solakon-one-speicherladung-und-netzbezug-einstellen): upper SOC configurable 80–100%; absent a configured plan, 200 W base output. Protective grid charging/heating can still occur. A model with perfect demand-following discharge therefore assumes appropriate control, not every out-of-box configuration.
5. [Manufacturer: energy plans](https://serviceportal.solakon.de/help/solakon-one/energieplaene-smart-meter-zwangsentladung-und-speicherladung): load-following operation uses smart-meter measurements. Stage two must explain this condition and not assume any optional meter is included in every bundle price.

Still needed from the manufacturer: usable energy with defined SOC window and conditions; charge/discharge power versus stack size, voltage and temperature; conversion efficiency at relevant powers; standby/heater consumption; default maximum SOC and control requirements. No external message was sent. Third-party AC-delivered energy was not substituted for a manufacturer specification (doing so alongside round-trip losses risks double deduction).

The generic HTW-derived 82.5% assumption was not changed or presented as a Solakon measurement. Nennkapazität must remain visibly qualified as an upper bound until stage-two parameters are sourced and identified as manufacturer values or explicit model assumptions.

## Chronology measurement

Fetched public PVGIS v5.3 SARAH3 output: 51.3 N, 9.5 E, 2023, 1 kWp, 14% losses, south 35°, 8,760 chronological hours. Monthly totals are normalized to the same existing 1,024 kWh/kWp profile in every comparison. Household load remains the same BDEW-derived hourly model. Initial battery is empty in every run.

Reproduce:

```sh
curl --fail --location 'https://re.jrc.ec.europa.eu/api/v5_3/seriescalc?lat=51.3&lon=9.5&startyear=2023&endyear=2023&pvcalculation=1&peakpower=1&loss=14&angle=35&aspect=0&outputformat=json' -o /tmp/bkw-pvgis-2023.json
node --import tsx scripts/solar-storage-audit.ts /tmp/bkw-pvgis-2023.json
```

Source SHA-256 and complete measured rows are in `solar-storage-audit-2026-09-27.json`. Four series isolate different effects: existing six sorted types; existing types placed in source-day rank order; real days sorted by yield; real days in chronological order. This separates sequence loss from within-type smoothing. All share the production dispatcher.

For 2 kWp / 800 W, household 2,800 kWh, daytime share 40%, efficiency 82.5%, and nominal capacity used solely for this upper-bound comparison:

| Storage kWh | Existing AC self-use kWh | DC, same sorted types | DC, chronological hours | DC benefit increase on sorted types |
|---|---:|---:|---:|---:|
| 4.22 | 1,459 | 1,478 | 1,466 | 2.83% |
| 6.33 | 1,493 | 1,571 | 1,583 | 11.06% |
| 10.55 | 1,504 | 1,596 | 1,641 | 12.85% |

Percentages refer to **incremental storage self-use**, not total production or money. Not a claim about measured Solakon efficiency.

Isolating only order in the actual hours: at 10.55 kWh DC, sorted days yield 1,586 kWh self-use versus 1,641 chronologically (55 kWh lower, about 2 percentage points of household autonomy). Existing compact types reordered chronologically yield 1,652 versus 1,596 sorted. Sorting underestimates carryover here; smoothing can offset that in total, so neither correction may be inferred from the old final number alone.

At 1 kWp / 800 W the statement “exactly no difference” is not universal: this profile has a tiny clipping effect, about 1 kWh annual self-use for larger storage. The invariant is zero added benefit **when there is no clipping and no AC output bottleneck**, covered separately by tests. Do not hard-code zero from panel size alone.

## Rooftop decision

Retain current production behavior. DC positioning alone changes none of the tested rooftop results, because the inverter is sized to panel kWp and does not clip these profiles. There is no evidence for replacing the existing rooftop efficiency or capacities.

Chronological dispatch has mixed proximity to the HTW reference, rather than a universal improvement:

| PV / storage | Existing autonomy | Chronological autonomy | HTW reference |
|---|---:|---:|---:|
| 5 kWp / 5 kWh | 63.79% | 62.37% | 64% |
| 5 kWp / 10 kWh | 70.11% | 70.69% | 72% |
| 12 kWp / 0 kWh | 37.66% | 35.66% | 39% |
| 12 kWp / 10 kWh | 84.28% | 84.46% | 84% |
| 12 kWp / 15 kWh | 84.94% | 87.02% | 86% |

For the eight rooftop points in the report, mean absolute HTW deviation is 1.05 pp with existing types and 1.59 pp with real chronological hours. At 12 kWp without storage the latter is 3.34 pp away (3 pp after the UI's integer rounding). HTW and this model do not share weather and household traces; closer agreement is not proof of physical truth. Real-day order removes an established sequence artifact, but changing the global reference needs a separate decision and validation across all orientations.

The rooftop engine and HTW lookup expect **usable** storage kWh. `PvStorageQuestion` labels capacity, and its linked glossary explicitly defines it as usable energy. Existing values must therefore not be silently reduced or reinterpreted as nominal capacity.

## Verification and remaining work

- Eight pre-change full year/month output snapshots (BKW no/small/large storage and rooftop) remain identical, normalizing JSON's representation of rounded negative zero only.
- Energy conservation, capacity and power bounds, DC inverter headroom, storage-energy upper bound, explicit usable capacity and invalid-input rejection have focused tests.
- 122 tests passed across shared storage, existing HTW rooftop ±3 pp anchors, balcony references, offer arithmetic and race-chart balances. Typecheck passed. Eight snapshot cases are contained in one regression test.
- No new UI behavior, offer parameter activation or claim of release readiness in this stage.
- Next: shared offer adapter with explicit capacity/control qualifications, then funding before ranking, consistent explanations and shared links, 10/20-year economics and visible optional costs/shading; rendered browser checks at that point.
