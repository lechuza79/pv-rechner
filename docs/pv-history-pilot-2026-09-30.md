# PV-Rückblick und Rechner-Einstiege – begrenzter Pilot, 30.09.2026

## Ergebnis und Aussagegrenze

Referenzmodell: 5 kWp, Kasseler ERA5-Rasterpunkt 51,25° N / 9,5° E, Süd, 35°, Volleinspeisung, Betriebsbeginn Jahresanfang 2004. Zwanzig Kalenderjahre 2004–2023, ausdrücklich nicht die gesamte gesetzliche Vergütungsdauer. Kein nachgewiesener privater Betreiber und keine gemessene Produktion.

- Modellproduktion nach Alterung: 99.183,74 kWh.
- Nominale Vergütung: 56.931,47 Euro.
- Jährlich einzeln inflationsbereinigt: 74.891,67 Euro in Kaufkraft von 2025; 49.272,45 Euro in Kaufkraft von 2004.
- Historischer Referenzpreis aus IEA PVPS: 5.300 Euro/kW für kleine Anlagen 2–5 kW im Jahr 2004, also 26.500 Euro einschließlich Umsatzsteuer. Umgerechnet 40.278,68 Euro in Kaufkraft von 2025. Kein konkretes Angebot dieser Modellanlage. Die Tabellenüberschrift nennt pauschal 19 % Umsatzsteuer trotz früherer Jahre; keine eigene Nettoumrechnung daraus ableiten.
- Keine Gewinnaussage: laufende Kosten, Wechselrichterersatz, Finanzierung und individuelle Steuern fehlen.

Die Haushaltsstrompreise werden im historischen Volleinspeisefall nicht gebraucht, weil keine Eigenverbrauchsersparnis angesetzt wird. Historische Eigenverbrauchsfälle sind damit noch nicht untersucht.

## Daten und Rechenweg

175.320 Wetterstunden, ohne Datenlücken. ERA5-Reanalyse, keine Stationsmessung. 2004–2021 aus dem öffentlichen Open-Meteo-Archiv, 2022–2023 aus dem bestehenden lokalen ERA5-Archiv. Jeweils Globalstrahlung, direkte horizontale Strahlung und Lufttemperatur. Stündliche Strahlung auf Süd/35° mit `lib/solar-tilt.ts`, Leistung mit `lib/simulation.ts`. Das vereinfachte Bestandsmodell verwendet pauschal 15 % Systemverluste und einen Temperaturkoeffizienten von −0,4 %/°C; keine historische Modulspezifikation behaupten. Alterung 0,5 % jährlich ist eine Annahme. Tarif 0,574 Euro/kWh.

Jahresergebnis und öffentliche Quellverweise: `lib/pv-history-example.json`. Herleitung: Jahresertrag × 0,995^(Jahr−2004) × 0,574. Kaufkraft: Jahreszahlung × 121,9 / Jahresindex; danach summieren. Destatis-Jahresindizes 2020=100, 2004–2023: 80,2;81,5;82,8;84,7;86,9;87,2;88,1;90;91,7;93,1;94;94,5;95;96,4;98,1;99,5;100;103,1;110,2;116,7. Jahresindex 2025:121,9.

Arbeitsdateien einschließlich Stundenreihen und ausführbarem Pilot: `/private/tmp/pv-history-pilot/`. Dieser lokale Cache ist keine dauerhafte Datenpipeline. Vor einer eigenständigen Datenstory oder einem interaktiven Rechner Datenarchivierung und reproduzierbaren Import produktisieren.

Primärquellen, am 30.09.2026 eingesehen:
- Wetter: https://open-meteo.com/en/docs/historical-weather-api ; Archiv `https://openmeteo.s3.amazonaws.com/data/copernicus_era5/`
- Tarif: BGBl. 2003 I S.3074, https://www.bgbl.de/xaver/bgbl/start.xav?start=%2F%2F%2A%5B%40attr_id%3D%27bgbl103s3074.pdf%27%5D
- Inflation: https://genesis.destatis.de/datenbank/online/table/61111-0001/
- Historischer Investitionspreis: https://iea-pvps.org/wp-content/uploads/2020/01/nsr_2007_DEU.pdf , Tabelle 5a, Druckseite17.

Council: drei unabhängige eng begrenzte Prüfungen (Primärquelle Tarif, unabhängige Stunden-/Summenrechnung, adversariale Aussageprüfung). Historischer Hook bestätigt innerhalb der offen genannten Modellannahmen. Preis- und Inflationsquellen vom Hauptagenten eingesehen; keine Behauptung dreifacher unabhängiger Quellenvalidierung. Zukunftsteil nicht freigegeben.

## Heutige Anlage – internes Szenario, nicht im Header publiziert

Gleiches Dach, kein Speicher, Haushalt 3.800 kWh/Jahr mit modelliertem Lastprofil. Zwanzig historische Wetterjahre jeweils separat simuliert und danach gemittelt. Kein vorheriges Glätten der Stunden. Zeitraum 2026–2045, Alterung wie oben. Strompreisstart 31,2 ct/kWh ist ein angenommener Startwert aus dem bestehenden Fallback, kein neu belegter Marktpreis.

UBA-Rahmendaten für THG-Projektionen 2026, Tabelle13 S.59: Haushaltsstrompreise in ct/kWh zu Preisen2024:2025 38,3;2030 32,9;2035 33,9;2040 32,7;2045 33,4. GDP-Deflator aus Tabelle3 S.21:2024 100;2030 118,2;2035 131;2040 143,4;2045 156. Geometrisch interpoliert, nominalisiert und auf den angenommenen Ausgangspreis2026 skaliert. Grundpreisanteile der Quellreihe werden nicht als zusätzliche Ersparnis angesetzt; ihre relative Preisentwicklung wird als Näherung auf den Arbeitspreis übertragen. Original im Hauptrepo `docs/quellen/UBA-Rahmendaten-THG-Projektionen-2026.pdf`.

Bundesbank Juni2026: deutsche HVPI-Prognose2026 2,9 %,2027 2,7 %,2028 1,9 %. Danach Szenarien1/2/3 %, keine gemessene Inflation und keine belastbare Zwanzigjahresprognose. HVPI als Zukunftsnäherung, nicht identisch mit historischem nationalen VPI. Quelle: https://publikationen.bundesbank.de/publikationen-de/berichte-studien/monatsberichte/monatsbericht-juni-2026-998608?article=deutschland-prognose-energiepreisschock-treibt-teuerung-an-und-bremst-die-konjunkturerholung-998836

- Volleinspeisung: nominal12.123 Euro, im mittleren Inflationsszenario9.803 Euro in Kaufkraft2025.
- Mit Eigenverbrauch: nominal13.618 Euro, mittleres Szenario10.933 Euro in Kaufkraft2025 (Spanne10.205–11.755 Euro).
- Nicht eingerechnet: Abregelung, Vergütungsausfälle bei negativen Preisen und spätere Kompensation, individuelle Kosten/Steuern/Finanzierung. Deshalb keine Rendite, kein veröffentlichungsreifer Direktvergleich mit damals. Aktueller Anschaffungspreis noch nicht ausreichend belegt.

## Rechner-Einstiege in die Optimierungsrunde aufnehmen

Der Vercel-Screenshot zeigt gefilterte Seitenbesuche, keine nachgewiesenen Sitzungseinstiege. Queryvarianten werden unter derselben Seite zusammengefasst. Vercel definiert Bounce als Sitzung mit nur einer besuchten Seite; eigene Events ändern das nicht. Ein erfolgreich bedienter Rechner kann daher als Bounce zählen. Quellen: https://vercel.com/docs/analytics und https://vercel.com/docs/analytics/using-web-analytics

Bestandsaufnahme (noch kein flächiger Umbau):
- `/photovoltaik-rechner`: Empfehlung als Standard; direkte Eingabe über `?direkt=1`, vorhandene Daten über `?direkt=1&eingabe=1`. Empfehlung und Direkteingabe getrennt auswerten.
- `/einspeiseverguetung-rechner`
- `/waermepumpe-rechner`
- `/balkonkraftwerk/rechner`
- `/klimaanlage-stromkosten`
- `/pv-simulation`: ergänzendes Simulationstool, ebenfalls Einstieg prüfen.
- Zuführende Start-, Ratgeber-, Förder- und Ortsseiten: Anschluss zum passenden Rechner prüfen.

Vorhandene aggregierte Ereignisse in `lib/analytics.ts` zuerst auswerten: erste Eingabe → Folgeschritte → Ergebnis. Ereignisdefinitionen sind vorhanden; echte Ereigniszahlen wurden in diesem Pilot nicht abgerufen. Keine neue Nutzerverfolgung oder Konfigurationsdaten erfassen. Priorisierung nach tatsächlich begonnenen Rechnungen und Ergebnisquote, zusätzlich Einstiegskanal und Geräteklasse soweit vorhandene Auswertung das hergibt. Erste Empfehlung: PV-Rechner wegen des vom Betreiber gezeigten Besuchsvolumens; daraus keine statistisch gesicherte Rangfolge ableiten.
