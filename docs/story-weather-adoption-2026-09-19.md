# Story-Datenübernahme abgeschlossen — 19.09.2026

11.247 Orte geprüft. 10.944 Monatsprofile, 10.746 Jahresprofile und 10.746 Orte mit beiden Geldkennzahlen. Alle Wetterprofile stammen aus dem lokalen ERA5-Archiv. Keine Wetter-Netzabrufe. Vorher vorhandene Ergebnisse verloren: 0.

303 Orte ohne Wetterkoordinate; insgesamt 501 Orte ohne passenden Wind-Vorjahresbestand. Für Geldwerte fehlen bei 303 Orten Wetterstunden und bei weiteren 198 die Speichergrundlage. Fehlend wird nicht als null oder als alter Ersatzwert ausgegeben.

Registerstand: 10.09.2026. Speicher-/Windannahmen: 09.09.2026, nach Registerkorrektur am 18.09. aus Produktion abgerufen. Berechnung: 19.09.2026. Rechenannahmen der Geldwerte unverändert; experimentelle Gewerbe-Cluster nicht verwendet.

Code: codex/story-weather-adoption, b2f16582. Aktuelles origin/main als Basis. 4.336 Projektprüfungen grün, zusätzliche Vorschauprüfung verhindert alte Geldwert-Fallbacks. Neues Archivlesen gegen 100 bisherige Zellausschnitte bitgleich; Messung 123 ms vorher / 27 ms danach, nur lokaler Mikrovergleich.

Ergebnisse: scripts/.cache/story-prepared im Haupt-Checkout; unabhängige Quellen-/Vollständigkeitsprüfung in verification.json. Die bisherige Story-Vorschau verlinkt diesen gemeinsamen Bestand; alter Bestand bleibt als story-prepared-before-era5-2026-09-19 erhalten. Alte Wetter-Abrufskripte in der Vorschau sind gesperrt.

Browserprüfung 4190: Höchberg zeigt beide Radialcharts und beide Geldkennzahlen. Monatsdetail nennt ERA5/Copernicus über Open-Meteo. Nur lokal eingebunden, nicht veröffentlicht.

Die Vorschauänderungen liegen weiterhin in codex-kommunen-templates: beide Radialchart-Fußzeilen, story-weather-attribution, data-sources/DataSourceList, story-monthly-candidate inklusive Fallback-Schutz/Test sowie aktualisierte story-discovery-reports. Das Chart-Layout wurde nicht geändert. Bei Integration den bestehenden Hero-/Story-Handoff nicht durch alte Visuals ersetzen.
