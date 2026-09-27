# Übergabe an Claude: kommunale Wetterdaten direkt aus Copernicus

Stand: 17.09.2026. Auftrag: kostengünstige Alternative zu Open-Meteo Professional (99 EUR/Monat) für historische kommunale Solar-/Windcharts prüfen und nach belegter Eignung implementieren. Kein Abo kaufen. Nutzer möchte diese Arbeit bei Claude fortführen, um Codex-Kontingent zu sparen.

## Entscheidung und ehrliche Grenze

Direktes ERA5 hat nicht automatisch eine geringere meteorologische Grundauflösung: Unser bisheriger Abruf fordert explizit `models=era5`, nicht Best Match/IFS/ERA5-Land. Aber identische Zahlen und keine Qualitätseinbuße sind NICHT bewiesen. Open-Meteo übernimmt standardmäßig land-/höhengerechte Rasterzellauswahl und statistische Höhenanpassung. Ein simpler nearest-grid-point-Import kann besonders an Küsten und in Bergen andere, schlechter geeignete Werte ergeben. Erst Vergleich, dann Umstellung; keine bestehenden Storyeditionen überschreiben. Wenn Parität nicht erreichbar ist, Unterschiede und fachliche Konsequenzen vor einer breiten Umstellung vorlegen.

Reale Nachteile: eigener Importbetrieb, Downloads mit Warteschlangen statt sofortiger Punkt-API, Speicher/Rechenkosten und eigene Qualitätssicherung. ERA5 hat auch bisher ungefähr fünf Tage Verzug. Neueste Daten sind vorläufig (ERA5T); finale Revisionen getrennt behandeln. Für abgeschlossene Monatsstories geeignet, kein Ersatz für aktuelles Hero-Wetter/Forecasts. Kostenfreiheit betrifft den Datenbezug, nicht unseren Betrieb.

## Arbeitsstand / Zuständigkeit

- Repository: /Users/eule/projects/pv-rechner
- Aktive Story-Worktree: /Users/eule/projects/pv-rechner/.worktrees/codex-kommunen-templates, Branch codex/kommunen-templates, Preview4190. Viele uncommittete Änderungen anderer Teilaufgaben, NICHT zurücksetzen/stashen oder pauschal übernehmen.
- Kommunenseiten-Task separat in /Users/eule/.codex/worktrees/8baa/pv-rechner, Preview4196. Keine Chart-/Menü-Redesigns in diesem Auftrag.
- AGENTS.md und `git fetch`, `npm run sessions` zuerst. Bei tsx-IPC-EPERM: `node --import tsx scripts/sessions.ts`. Eigene Worktree; aktuellen Storycode gezielt/koordiniert als Grundlage sichern, nicht veraltete main als gleichwertigen Stand annehmen. Keine fremden Server stoppen.
- Bestehender lokaler Gesamtjob: scripts/story-prepare-resume.mjs, exklusives scripts/.cache/story-prepared/resume.lock; Log /tmp/story-preparation-live.log. Letzter abgeschlossener Lauf: 2401 Monatsprofile,2375 Jahresprofile,2377 Geldkennzahlen bei11247 Orten. Limitmeldung: Daily API request limit exceeded. Please try again tomorrow. Geplanter Retry18.09.2026 00:01UTC (02:01Berlin), kein garantierter Reset des Anbieters. Höchberg derzeit unvollständig. Kein Sondervorrang mehr.
- Vor Wechsel mit diesem laufenden Job koordinieren: keine zwei Schreiber, keine Cachedateien löschen. Bei echter Übergabe nur identifizierten eigenen Vorbereitungsprozess kontrolliert beenden/übernehmen. Lock nicht blind entfernen.

## Bestehende Integration

- scripts/story-prepare.ts: liest Registerreport, Anlagen/Koordinaten, Monats-/Jahreswetter, berechnet Profile und Geldwerte; drei Arbeiter. Wetter derzeit archive-api.open-meteo.com/v1/archive, models=era5, timezone=UTC, wind_speed_unit=ms.
- Monatsvariablen temperature_2m und shortwave_radiation; Jahr zusätzlich wind_speed_100m. Für neue Speicherung ALLE benötigten Variablen monatlich zusammen laden, Jahr daraus zusammensetzen.
- scripts/.cache/story-weather/: URL-gehashte Rohdaten. scripts/.cache/story-prepared/<sourceDate>/<AGS>.json: berechnete Ergebnisse samt availability. Bestehende Rohdaten als Vergleich erhalten.
- lib/story-weather-validation.ts und lib/story-weather-location.ts: Vollständigkeitsprüfung/örtliche Koordinaten.
- lib/story-monthly-solar.ts: solarMonth verarbeitet Strahlung als Mittelwert der VORHERGEHENDEN Stunde, Zuordnung über Intervallmitte in Europe/Berlin. 23/25-Stunden-Tage berücksichtigt. Monatsabruf beginnt deshalb bereits am Vortag. Keine eigene vereinfachte Datumslogik daneben bauen.
- lib/story-energy-year.ts: energyYear benötigt lückenlose UTC-Jahresstunden, Temperatur C, Strahlung W/m², Wind m/s in100m. Bestehende Windkurve ausdrücklich vereinfachtes Erzeugungsmodell.
- lib/story-unit-value.ts: beide monetären Kennzahlen; individuelle Anlagen, Inbetriebnahme, Einspeise-/Eigenverbrauchsannahmen. Finanzmodell nicht in dieser Migration ändern.
- scripts/story-prepared-verify.ts: Energieabgleich Monatsprofil/Geldwerte. scripts/story-prepared-seeds.ts aktualisiert Vorschau; alte Modelle nicht still mit neuem Quellenstand mischen.
- lib/story-prepared-server.ts: attachPreparedStories, nur Lesen, KEIN Wetterabruf beim Seitenbesuch.
- lib/municipal-chart-catalog.ts und components/social/MunicipalChart.tsx: dauerhafte Charts/Stories teilen Rendering. Neue Datenquelle muss nicht das Frontend umschreiben.

## Vorgehen

1. Zugang prüfen, ohne Secrets auszugeben. CDS-Konto/API-Token und manuelle Annahme der Datensatzbedingungen erforderlich. Wenn nicht vorhanden: konkrete kurze Anleitung liefern, unabhängig davon Import/Tests vorbereiten. Token weder in Chat, URL-Logs noch Git schreiben. Keine Lizenz im Namen des Nutzers akzeptieren.
2. Ein Deutschland-Monat als Pilot, kleiner Gebiets-/Zeit-Test zuerst. Dataset reanalysis-era5-single-levels. Temperatur2m, abwärts gerichtete kurzwellige Oberflächenstrahlung, u/v-Wind100m; ggf. Orographie/Landmaske für belastbare Ortszuordnung. Deutschland-Boundingbox mit Randzellen; bei Bedarf zeitlich/variablenweise teilen. Keine globalen Vollfelder herunterladen.
3. Format und Einheiten aus tatsächlichem CDS-Produkt prüfen: Kelvin→C; Wind sqrt(u²+v²)→m/s; Strahlungsenergie J/m² und jeweilige Akkumulationsperiode korrekt in vorhergehenden Stundenmittelwert W/m² umrechnen. NICHT blind jedes Produkt durch3600 teilen oder ERA5-Land-Akkumulation mit ERA5 verwechseln. Prognoseschritt-/Zeitachsen, expver/finale-vorläufige Werte und Dimensionsreihenfolge explizit behandeln.
4. Gemeindekoordinate/gewählte Rasterzelle getrennt speichern. Open-Meteo-Zellwahl und Höhenanpassung anhand Dokumentation/Quellcode nachvollziehen; land/nearest nicht gleichsetzen. Raster gemeinsam speichern, ortsspezifische Anpassung getrennt; keine unbewiesene Näherung als identisch verkaufen.
5. Adapter in bestehendes Wetterformat einbauen, zunächst optionaler Provider. Provider/Modell/Auflösung/Zeitdefinition/Version/Downloadzeit/Revision/Ortsabbildung als Herkunft festhalten. Neue Cachekeys dürfen Open-Meteo-Dateien nicht überschreiben. Keine fiktive Open-Meteo-sourceUrl für CDS-Daten.
6. Laufkosten messen: Downloadumfang, Laufzeit, RAM, komprimierte Speicherung, monatliche Ergänzung und Wiederholung ohne Download. Erst danach Betriebsort wählen; keine Infrastrukturkosten erfinden oder Anbieter buchen. Raw-NetCDF/GRIB nicht in Git/Browserbundle; dauerhaftes geeignetes Speicherkonzept vorschlagen.
7. Monatliche Vorbereitung idempotent/resumierbar mit kontrollierter Parallelität/Backoff, Prüfung vollständig vorhandener Stunden und atomarem Abschlussmanifest. Fehlende Werte nicht zu Null. Jahresdaten aus Monatsarchiv, keine jährlichen Komplettabfragen je Ort. Bei vorläufigen Daten spätere Revision gezielt, bestehende veröffentlichte Snapshots unverändert lassen.
8. Erst bei bestandener Gegenprüfung Integration aktivieren. Bestehende Quellenhinweise und Methodik aktualisieren. Der bisherige Zehnjahres-Ertragsvergleich muss entweder konsistent weiter mit alter Methode laufen oder seine gesamte Vergleichsreihe geprüft migrieren; keine künstlichen Rekorde durch Methodenwechsel.

## Gegenprüfung / Abnahme

- Küstenorte Kiel/Flensburg, Binnenland Nidda/Höchberg/Trier, Großstadt und hochgelegenes Gelände; vorhandene Open-Meteo-Caches verwenden, keine neue Abrufwelle trotz Sperre.
- Mindestens Sommer/Winter und beide Zeitumstellungen; Schaltjahr, Monats-/Jahresgrenzen, Randstunden.
- Vergleich Strahlung/Stundenprofil, Temperatur, Wind sowie Tages-/Monats-/Jahres-MWh und BEIDE Geldwerte. Abweichungen absolut/relativ, Spitzenstunden und schlechteste Orte ausweisen; Windunterschiede nicht durch Solar-Gesamtsumme kaschieren.
- Ziel ist fachlich nachvollziehbare Gleichwertigkeit, nicht willkürlich großzügige Toleranz. Akzeptanzgrenzen vor dem flächigen Rollout begründen; Restabweichungen dem Nutzer klar erklären.
- Negative Tests: fehlende/duplizierte Stunde, falsche Einheit, falsche Windhöhe, vertauschte Achse, Küsten-Seezelle, unvollständiger Download, Cache-Providerkollision. Nachweisen, dass wiederholter Lauf keine gleichen Daten erneut lädt und Rendern keine externen Wetterabrufe verursacht.
- Kein Anspruch auf Mehrgenauigkeit gegenüber ERA5. Eigene Anlagen-/Windmodellgrenzen bleiben bestehen.
- Lieferung: lauffähiger Pilot, Vergleichsbericht, gemessener Ressourcenbedarf, Monatslauf mit Herkunft und Wiederaufnahme, konkrete noch nötige Nutzeraktionen. Kein Auto-Merge/Deploy sichtbarer Änderungen ohne vereinbarte Abnahme.

## Primärquellen (17.09.2026 gelesen)

- https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview (Datensatz, Raster, Variablen, Lizenz)
- https://cds.climate.copernicus.eu/how-to-api (Zugang, manuelle Lizenzannahme)
- https://climate.copernicus.eu/getting-started-cds-tips-using-copernicus-climate-change-services-data (kostenloser Datenzugang)
- https://open-meteo.com/en/docs/historical-weather-api (ERA5 explizit0.25°, etwa5TageVerzug; elevation/cell_selection; Strahlung als vorangehender Stundenmittelwert)
- https://open-meteo.com/en/pricing (Professional erforderlich für kommerzielle historische API; keinesfalls durch Drosselung der freien API eine kommerzielle Lizenz ersetzen)

## Register correction on 18 September 2026

The local story inputs are being refreshed to use the official successor keys from
`lib/ags-nachfolger-daten.json`. Python archive readers share `scripts/story_region_key.py`.
The archive edition remains 2026-09-10: a municipality-key repair is not a new source edition.
Do not restore older prepared generation/valuation files merely because their sourceDate matches.
The correction backup and affected municipality keys are under
`scripts/.cache/story-key-repair-2026-09-18/`; the current inputs and rebuilt results remain in
the existing cache locations. The old Open-Meteo resume process was stopped intentionally
before the repair; do not start a second writer during the weather migration.
