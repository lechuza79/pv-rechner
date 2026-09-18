# Zehn-Jahres-Rückblick der PV-Simulation: Fenster jährlich verschieben

Auslöser: `RUECKBLICK_STAND.reviewBy` (lib/solar-rueckblick.ts) ist verstrichen —
der Gesundheitscheck meldet das. Ziel: aus 2016–2025 wird 2017–2026 usw.

1. **Strompreise:** Eurostat nrg_pc_204 (DE, Band 2.500–4.999 kWh, inkl. Steuern)
   für beide Halbjahre des neuen Jahres abrufen (Abfrage-URL steht in
   `lib/solar-rueckblick-preise.json`), Werte eintragen. Fehlt das zweite
   Halbjahr noch: nicht verschieben, `reviewBy` um einen Monat vertagen und
   den Grund in den Commit schreiben.
2. **Einspeisesatz** des neuen Startjahrs (Januar, Teileinspeisung ≤ 10 kWp):
   `feedInArchivRates` reicht bis 07/2022; für spätere Startjahre die
   Gesetzeskette (`feedInRatesForCommissioning`) verwenden — im Modell anpassen.
3. **Fenster:** `RUECKBLICK_VON`/`RUECKBLICK_BIS` um eins erhöhen.
4. **Seitentext:** Die Jahreszahlen stehen auch im Text der Simulation (Paket von
   Codex). In `scripts/startseite-uebernehmen.mjs` eine Anpassung ergänzen, die
   „2016“/„2025“ im Rückblick ersetzt, und die Übernahme neu ausführen.
5. **Wetter:** `npm run era5:sync -- --year=<neues Jahr>`.
6. **Vorberechnen:** `npm run rueckblick:vorbereiten -- --trocken --plz=10115,79098,97204`
   (Plausibilität), dann `-- --schreiben` für alle Postleitzahlen.
7. **Stempeln:** `RUECKBLICK_STAND.geprueftIso` = heute, `reviewBy` = 30.06. des
   Folgejahres. Tests, Commit, Push.
