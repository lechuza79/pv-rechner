# Solar and wind annual reference chart

Local design prototype for Nidda, weather year 2025. The existing solar monthly
chart remains unchanged. Angle represents day of year; radius represents daily
energy in MWh. Yellow solar and neutral wind segments stack on the same linear
radial scale. The common scale stays fixed when switching energy source.

Data: Open-Meteo ERA5, 8,760 consecutive UTC hours, municipal reference coordinate
50.413 / 9.008. UTC days deliberately avoid dropping or duplicating DST energy.
This is municipal-centre weather, not turbine-site weather.

PV: 15,754.617 kWp of currently registered units commissioned before 2026, fixed
throughout the weather year. Existing radiation/temperature conversion.
Wind: 3,600 kW from the stored previous-year installed-capacity baseline, fixed
throughout the weather year. Generic illustrative cubic curve: zero below 3 m/s,
(v³−3³)/(12³−3³) up to 12 m/s, rated output until 25 m/s, shutdown from 25 m/s.
Input is 100 m wind in m/s. This curve is an explicit model assumption, NOT a
manufacturer curve or calibrated Nidda model. No hub-height correction, wake,
availability, curtailment, turbine-specific characteristics or density correction.

Do not describe the result as actual historical local generation. Before using
wind amounts as a municipal factual story, obtain turbine-specific parameters
and validate production. The preview is a reference model for design and seasonal
comparison. Its data and limitations must travel with any exported configuration.

Source: https://open-meteo.com/en/docs/historical-weather-api
Raw hourly data: scripts/.cache/story-energy-year/nidda-2025-weather.json
Rebuild: node --import tsx scripts/story-energy-year-build.ts
Bundled derived data: lib/story-energy-year-data.json
