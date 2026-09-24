# Growth-adjusted yield peaks

Local implementation, 2026-09-14. Initial evaluated municipalities: Trier and Nidda.

## Meaning

These stories compare estimated reference-system yield per installed kWp. Identical reference configuration across periods removes installation growth from the comparison. They do not claim measured municipal generation or reconstruct historical total generation. Total generation with contemporaneous installed stock remains a separate model/story family.

The initial configurable window is ten complete calendar years, 2016–2025. It is an editorial comparison window, not the earliest available weather history. The runner accepts other start/end years. No current incomplete calendar year enters this first ranking.

## Sources and calculation

Open-Meteo historical archive, fixed ERA5 model, hourly horizontal shortwave radiation and ambient temperature. No Best Match model switching. Spatial resolution is approximately 25 km; municipal coordinates use available centroids, otherwise the mean of municipal postal-code points, recorded with each weather input.

Documentation checked 2026-09-14: https://open-meteo.com/en/docs/historical-weather-api

Radiation values cover the preceding hour. Energy intervals are assigned by their midpoint to Europe/Berlin dates. Padded year boundaries supply complete intervals. Duplicate, missing, null or invalid hourly inputs reject the window. Complete local days, ISO weeks and calendar months are summed, including zero-yield periods. Partial edge weeks are excluded. Daylight-saving days retain 23/25 hours; month totals retain actual month lengths.

The calculation reuses `calcCurrentPower` at 1,000 kWp and normalizes the hourly energy to kWh/kWp. This reduces its existing whole-watt rounding error without introducing another model. The model uses horizontal irradiation, ambient/cell temperature and the shared performance ratio; individual roof geometry, snow, outages and the actual municipal fleet are not simulated.

## Ranking and deviation

For each time scale, retain all tied maximum unrounded period sums. The runner-up is the next lower modelled sum, not a statistical significance threshold. Deviation is against the arithmetic mean of the same calendar date, ISO week or calendar month in the other years. The winner year is excluded. At least five comparison periods and a positive mean are required for a percentage statement. Leap day and week 53 therefore cannot silently claim nine reference years.

A model maximum is not proof of a physical record, particularly where values are close. Never use "all-time record" or measured-production wording. Display the exact comparison window and "Modellrechnung".

## Reproduction and checks

- Fetch/cache: `node scripts/story-yield-fetch.mjs --cities=Trier,Nidda --start=2016 --end=2025`
- Recompute in the shared story runner: `node --import tsx scripts/story-discovery-run.ts --cities=Trier,Nidda --directory=scripts/.cache/story-discovery --output=/tmp/story-yield-reports.json`
- Weather content is included in each municipality's input hash and preserved under `scripts/.cache/story-yield/sources/<input-hash>/`.
- Existing saved design snapshots are never rewritten.
- Focused tests cover completeness, nulls, duplicates, leap years, DST, ISO boundaries, zero periods, ties and geography mismatches.

An independent Python/zoneinfo calculation from the same raw hours confirmed both sets of winners and exact reference sums. Both cities contain 3,653 days and 87,672 hours.

| Municipality | Day | Week | Month |
| --- | --- | --- | --- |
| Trier | 2023-06-13: 6.441064 kWh/kWp | 2023-W22: 43.369449 | 2023-06: 158.718373 |
| Nidda | 2018-07-01: 6.475637 kWh/kWp | 2023-W22: 43.174892 | 2018-07: 157.806210 |

The historical weather series has only been fetched for these two municipalities so far. Other cities explicitly report the source as not yet fetched; national coverage is not claimed.

Final validation: 17 focused tests passed. Browser inspection confirmed the actual Trier June 2023 candidate in the shared story modal, including 158.72 versus 135.32 kWh/kWp and the explicit 2016–2025 reference window.

## Visual contract — 14 September 2026

- One monthly chart with the full available window (Trier: 120 months, 2016–2025); never replace this with ten June bars.
- The model uses local weather and a fixed reference system, not the municipality's measured generation or reconstructed fleet.
- Keep headline, snapshot date and “Modellrechnung · kWh je kWp” together inside the visual. One source in its footer. Explanation stays below the visual; calculation details collapse.
- Apply light/dark/highlight only to the visual, not the editorial modal.
- Zoom the Y range with numeric scale labels. Sparse horizontal grid; alternating opacity; every second tick and year labelled in regular body typography.
- Highlight matching calendar months (white on dark). Accent only the winning period's energy above the seasonal comparison mean.
- All matching periods above that same mean get callouts: winner larger and accent-filled, others smaller with opaque theme backgrounds. Plus and percent are smaller than the number.
- Mean label sits at the reference line with comfortable padding; do not add a second legend or second chart.
- Paint all annotations after all bars and lines. Covered callouts are a layering bug, not a color problem.
- Observe actual container width. Scale chart geometry, never scale typography down with a fixed SVG viewBox. Both full detail and narrow teaser use the same readable token sizes.
- Browser review on this revision covered Trier's detail, narrow teaser, source and explanation, and all three color schemes. This is a reviewable draft, not product approval.
