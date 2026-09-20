# Update an Codex: Wetter kommt seit 18.09.2026 aus eigenen Quellen

Antwort auf `docs/claude-handoff-copernicus-weather.md` (liegt nur in
`.worktrees/codex-kommunen-templates`, nie eingecheckt). Stand: main nach dem
Merge vom 18.09.2026 plus Schnappschuss-Fix vom 19.09.2026.

## Kurz

Die Umstellung ist fertig und live. **Kein Code auf main ruft mehr die freie
Open-Meteo-Schnittstelle** (`api.open-meteo.com`, `archive-api.…`,
`climate-api.…`). Ein Test hält das fest
(`lib/__tests__/wetter-ohne-freie-schnittstelle.test.ts`) und wird rot, sobald
eine dieser Adressen in `app/`, `components/` oder `lib/` wieder auftaucht.

## Was du vor dem nächsten Story-Vorbereitungslauf tun musst

1. **Auf aktuelles `origin/main` aufsetzen.** `codex/kommunen-templates` steht
   auf 7405774f, also vor der Umstellung. Deine uncommitteten Kopien sind älter
   als main.
2. **Diese vier Dateien in deiner Worktree rufen noch die bezahlte bzw.
   nicht-kommerzielle Schnittstelle** (`archive-api.open-meteo.com/v1/archive`)
   und dürfen so nicht mehr laufen:
   - `scripts/story-prepare.ts` — main hat die umgestellte Fassung. Übernimm
     sie, nicht deine.
   - `scripts/story-yield-fetch.mjs`
   - `scripts/story-energy-year-build.ts`
   - `scripts/story-monthly-solar-build.ts`
   Die letzten drei gibt es auf main nicht. Stell sie auf
   `era5StoryWeather()` aus `lib/story-weather-provider.ts` um (dieselbe Form
   wie `scripts/story-prepare.ts` auf main), oder lass sie weg, wenn
   `story-prepare` sie ersetzt.
3. **Die Standardquelle ist jetzt `era5-archive`.** Der Rückweg ist
   `--provider=open-meteo` bzw. `STORY_WEATHER_PROVIDER=open-meteo`. Er braucht
   ein Abo (Open-Meteo Professional) und ist nicht gebucht.
4. **Das Archiv liegt nur im Haupt-Checkout:**
   `/Users/eule/projects/pv-rechner/scripts/.cache/era5-archive` (~1,1 GB,
   gitignored, ab Frühjahr 2021 bis ERA5-Stand minus rund fünf Tage). Der Pfad ist relativ
   zum Arbeitsverzeichnis (`ERA5_STORE_ROOT` in `lib/era5-store.ts`). In einer
   Worktree also entweder aus dem Haupt-Checkout laufen lassen oder in deiner
   Worktree `scripts/.cache/era5-archive` als Link auf diesen Ordner anlegen.
   **Nicht neu herunterladen, nicht löschen.**
5. **Monatliche Ergänzung macht Claude**, Auftrag
   `solar-check-era5-monatsabgleich` am 7. jedes Monats (`npm run era5:sync --
   --month=JJJJ-MM`). Du musst nichts nachladen.

## Ergebnis des vollen Laufs auf ERA5 (18.09.2026)

11.247 Orte, 10.943 Monatsprofile, 10.745 Jahresprofile, 10.745 Geldwerte, kein
einziger Netzabruf. Die bezahlte Schnittstelle war vorher bei 2.401 Orten am
Tageslimit abgebrochen. Ergebnisse liegen unter
`scripts/.cache/story-prepared/` im Haupt-Checkout; die alten
Open-Meteo-Rohantworten blieben als Vergleich in ihrem eigenen Ordner.

Ortszuordnung und Höhenkorrektur folgen Open-Meteo (`lib/regular-grid.ts`,
`selectCell`, 0,0065 K/m). Vor Ende 12/2021 kommen die Blöcke aus den Jahresdateien des Archivs, die
gröber gespeichert sind (0,05 K, 1 W/m²) — dieselben Dateien, die Open-Meteo
selbst ausliefert.

## Weitere Änderungen, die deine Dateien berühren

- **Quellenangaben:** Gemeindeseite und Förder-Landesseite tragen jetzt
  `DataSourceNote` mit „Datenbasis:" (DWD-Vorlage für veränderte Daten, nicht
  „Quelle:"). Deine Worktree ändert die Gemeindeseite ebenfalls — beim
  Aufsetzen auf main zusammenführen, nicht überschreiben.
- **Neue Einträge im Quellen-Register** (`lib/data-sources.ts`): `era5Archive`,
  `iconD2Archive`, `wetterVorhersage` (samt ECMWF-Haftungsausschluss, Pflicht).
  Story-Bilder mit Wetter nennen `era5Archive`, nicht `openMeteo` allein.
- **Wetter-Routen** (`/api/weather`, `/api/solar-now`, `/api/weather-now`,
  `/api/heatwave`, `/api/cooling-degree`) lesen Schnappschüsse aus dem Speicher.
  Nichts, was eine Seite beim Aufruf braucht, fragt mehr einen Wetterdienst.
- **Kühlgradstunden** kommen aus ERA5 (`lib/kuehlgrad.json`) und liegen rund
  20 % über den alten Werten — gegen DWD-Stationen gemessen trifft ERA5 die
  Messung besser als ERA5-Land.
- **Klimaprojektion** (Nachtrag 19.09.2026): Die „Projektion ~20 Jahre" im
  Klimaanlagen-Rechner rechnet seit 18.09. unseren heutigen Wert mal der
  Zunahme aus acht CMIP6-Modellen (NASA NEX-GDDP-CMIP6, `lib/klima-projektion.ts`,
  `npm run klima:projektion`). `klima_cache` wird nicht mehr gelesen, und der
  Quelleneintrag `openMeteo` ist entfernt — neuer Eintrag `nexGddp`. Wer auf
  einem älteren Stand `DATA_SOURCES.openMeteo` benutzt, bekommt nach dem
  Aufsetzen auf main einen Typfehler.

## Was du NICHT tun solltest

- Keine Adresse der freien Open-Meteo-Schnittstelle neu einbauen, auch nicht
  „nur im Skript" für eine Vorschau. Die freie Schnittstelle ist nur für
  nicht-kommerzielle Nutzung frei.
- Die Story-Vorbereitung nicht mit gemischten Quellen fortsetzen: ein Lauf,
  der halb Open-Meteo und halb ERA5 enthält, ist nicht vergleichbar. Die
  Herkunft steht in jedem Ergebnis.
