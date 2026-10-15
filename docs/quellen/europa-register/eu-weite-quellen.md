# Europaweite Datenquellen für einen länderübergreifenden Solar-Atlas

**Frage:** Gibt es eine Quelle über viele Länder, die einen Solar-Atlas nach Vorbild unseres
MaStR-Atlas tragen könnte — also nicht 30 nationale Register einzeln?

**Erhoben am 23.09.2026.** Jede Aussage ist als GEPRÜFT (selbst aufgerufen, URL genannt) oder
UNGEPRÜFT (nur aus Sekundärquelle gelesen) gekennzeichnet. Ein gescheiterter Abruf ist jeweils
mit Grund vermerkt und beweist nicht, dass es die Quelle nicht gibt.

## Der Maßstab, an dem alles gemessen wird

Unser deutscher Bestand, am 23.09.2026 aus der eigenen Produktions-API gelesen
(`https://solar-check.io/api/mastr/summary`, GEPRÜFT):

- **6.312.591 Solaranlagen, 129,2 GWp**, Datenstand 09.09.2026
- davon 1.499.088 Steckersolar-Geräte

Eine europäische Quelle ist für uns nur dann brauchbar, wenn sie in dieselbe Richtung geht:
Einzelanlagen mit Ortsbezug, **einschließlich privater Aufdachanlagen**. Wie groß dieser Teil
ist, zeigt Eurostat für die EU-27 (eigene Abfrage, s. u.): Von 307.101 MW PV entfallen
**110.210 MW (36 %) auf Anlagen unter 30 kW**. Eine Quelle, die erst ab mehreren MW zählt,
lässt also mehr als ein Drittel der Leistung und weit über 90 % der Anlagen weg.

---

## 1. ENTSO-E Transparency Platform

| | |
|---|---|
| Granularität | Aggregat je Regelzone/Gebotszone und Produktionstyp; Einzelanlagen erst ab 100 MW |
| Standortbezug | Nur bei Anlagen ab 100 MW (Feld „location", kein Koordinatenpaar) |
| **Aufdach enthalten?** | **Nein — strukturell ausgeschlossen.** Schon die Aggregatzahl zählt nur Anlagen ab 1 MW |
| Zugang | Web-Portal + RESTful-API (M2M). Registrierungs-/Token-Pflicht: UNGEPRÜFT (Hilfeseite antwortet mit HTTP 403) |
| Aktualität | Laufend, Pflichtveröffentlichung |
| Brauchbar? | **Nein** |

**Die Leistungsschwelle ist der Grund**, und sie steht im Recht, nicht in einer Voreinstellung.
Art. 14 Abs. 1 VO (EU) 543/2013 — die Vorschrift heißt **„Forecast generation"**, nicht
„Installed generation capacity"; eine Vorschrift mit letzterer Überschrift gibt es in der
Verordnung nicht, die installierte Leistung steckt als Absatz **in** Art. 14 (im Volltext
gelesen über das amtliche Cellar-Repository `publications.europa.eu/resource/celex/32013R0543`
sowie die UK-Fassung https://www.legislation.gov.uk/eur/2013/543/article/14 — EUR-Lex selbst
antwortet auf automatisierte Abrufe mit HTTP 202 ohne Inhalt, also Bot-Schutz; GEPRÜFT):

> „(a) the sum of generation capacity (MW) installed for all existing production units
> **equalling to or exceeding 1 MW** installed generation capacity, per production type;
> (b) information about production units (existing and planned) with an installed generation
> capacity **equalling to or exceeding 100 MW**. The information shall contain: the unit name,
> the installed generation capacity (MW), the location, the voltage connection level, the
> bidding zone, the production type;"

**Lizenz — keine Lizenz, sondern eine Weiterverweisung.** Aus
`ENTSOE_Transparency_Terms_Conditions.pdf` (gebilligt vom Market Committee am 08.11.2018,
heruntergeladen und ausgelesen, GEPRÜFT):

> „The Transparency Platform, in whole or in part, including but not limited to, its website,
> **its database**, its database content arrangement, translations, compilations, partial
> copies, modifications, graphical interfaces and updates, **is and shall remain the exclusive
> property of ENTSO-E**. Transparency Platform Data may be subject to copyright owned by the
> Primary Owner of Data."

> „not cause prejudice to the copyright or related right on a Transparency Platform Data, which
> may be owned by the concerned Primary Owner of Data. In case of a risk to cause prejudice to
> said right, **the Data User shall seek the prior agreement of the holder of the copyright or
> related right.** Notwithstanding this requirement, as a facilitation for the Data User,
> ENTSO-E publishes on the Transparency Platform and regularly updates **the list of the
> Transparency Platform Data which can be freely re-used** […] The Data User has responsibility
> to check this list before each re-use."

> „The web graphical user interface of the Transparency Platform is primarily designed for human
> access and **not for robots access**."

ENTSO-E beansprucht also ausdrücklich ein eigenes Datenbankrecht und verweist für die
Nachnutzung auf eine Positivliste. **Diese Liste wurde nicht gefunden** (zwei geratene
Download-Adressen → HTTP 404; die Terms-Seite antwortet mit HTTP 400, die Zendesk-Hilfeseite mit
HTTP 403). Sie existiert laut Klausel; wo sie liegt, ist UNGEPRÜFT. Für uns ist das ohnehin
zweitrangig, weil die Quelle fachlich ausscheidet.

---

## 2. Eurostat — die einzige Quelle, die nach Anlagengröße trennt

| | |
|---|---|
| Granularität | **Nur Land.** Kein NUTS |
| Standortbezug | Keiner |
| **Aufdach enthalten?** | **Ja — als Größenklasse, nicht als Anlage** |
| Zugang | Offene SDMX/JSON-API ohne Registrierung, Bulk-Download, Databrowser |
| Aktualität | Berichtsjahr **2024**, Datensatz zuletzt **21.08.2026** aktualisiert |
| Brauchbar? | **Ja, für einen Ländervergleich — nicht für einen Atlas** |

Der einschlägige Datensatz heißt **`nrg_inf_epcrw`** („Electricity production capacities for
renewables and wastes"), nicht `nrg_inf_epc`. Eigene Abfrage am 23.09.2026 über
`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_inf_epcrw` (GEPRÜFT),
Feld `updated` = `2026-08-21`. Er führt **16 Solar-Kategorien**, darunter:

```
RA420              Solar photovoltaic
RA420KW_LT10       Solar photovoltaic (< 10 kW)
RA420KW_LT30       Solar photovoltaic (< 30 kW)
RA420KW_LT30_RT    Solar photovoltaic (< 30 kW, roof top)
RA420KW30-1000     Solar photovoltaic (30 kW - 1000 kW)
RA420KW30-1000_RT  Solar photovoltaic (30 kW - 1000 kW, roof top)
RA420MW_GT1        Solar photovoltaic (1+ MW)
RA420MW_GT1_RT     Solar photovoltaic (1+ MW, roof top)
```

Werte 2024 in MW, selbst abgefragt (Auszug):

| Land | PV gesamt | < 10 kW | < 30 kW | < 30 kW Dach | 1+ MW |
|---|---:|---:|---:|---:|---:|
| DE | 91.204 | 17.140 | 36.482 | 36.134 | 26.311 |
| FR | 25.299 | 3.858 | — | 4.269 | 11.579 |
| ES | 35.823 | 178 | 5.609 | **0** | 26.680 |
| IT | 35.437 | 7.366 | — | 9.860 | 8.863 |
| NL | 24.772 | **0** | 12.132 | 12.132 | 6.790 |
| AT | 8.895 | **0** | — | 7.856 | 1.030 |
| PL | 21.721 | 9.965 | — | 2.595 | 4.412 |

**Die brauchbare Achse ist `< 30 kW`, nicht die Feinklassen — und das ist gemessen, nicht
geschätzt.** Über alle 42 Länder mit einem PV-Gesamtwert für 2024:

- **42 von 42** melden die Klasse `< 30 kW`
- in **39 von 39** auswertbaren Fällen addieren sich `< 30 kW` + `30–1000 kW` + `1+ MW` auf die
  Woche genau zur Gesamtsumme (die drei Ausnahmen sind Island und Georgien mit 0 MW PV sowie
  Liechtenstein, das nur einen Gesamtwert meldet)
- aber nur **27 von 42** melden überhaupt einen Wert über null in `< 10 kW`
- und nur **31 von 42** einen Wert über null in `< 30 kW, roof top`

**Eine Null in den Feinklassen heißt „anders gegliedert", nicht „gibt es nicht".** Spanien
meldet für `< 30 kW, roof top` eine Null und hat trotzdem 5.609 MW unter 30 kW; die Niederlande
und Österreich melden `< 10 kW` als Null und stecken alles in die Aufdachklasse. Wer daraus eine
Karte „Haushalts-PV je Land" baut, zeigt für einen Teil der Länder eine Null, die keine ist —
dieselbe Fehlerklasse wie eine falsche Einheit, nur schwerer zu bemerken.

Die Klassen sind außerdem **hierarchisch, nicht disjunkt**: `< 10 kW` und `< 30 kW, roof top`
sind Teilmengen von `< 30 kW`. Für Deutschland 2024: 17.140 (< 10 kW) und 36.134 (< 30 kW Dach)
liegen beide in 36.482 (< 30 kW). Wer sie addiert, zählt doppelt.

**Lizenz im Wortlaut** (https://ec.europa.eu/eurostat/web/main/help/copyright-notice, GEPRÜFT):

> „**Reuse of statistical data, metadata, publications, and other dissemination tools published
> on this website for commercial or non-commercial purposes is authorised provided the source is
> acknowledged.** The reuse policy of the European Commission is implemented by the Decision of
> 12 December 2011 […]"

Und aus den Metadaten des Datensatzes selbst
(https://ec.europa.eu/eurostat/cache/metadata/en/nrg_inf_epc_esms.htm):

> „free re-use, both for non-commercial and commercial purposes"

Für uns sauber: kommerzielle Nutzung ausdrücklich erlaubt, Quellenangabe genügt.

**NUTS-Ebene für PV gibt es nicht.** Der vollständige Eurostat-Katalog (12.242 Zeilen) wurde
durchsucht: Die einzigen `nrg_*`-Datensätze mit NUTS-Bezug sind `nrg_chddr2_a` und
`nrg_chddr2_m` — Heiz- und Kühlgradtage. Kein Treffer für „photovolt" im gesamten Katalog.

---

## 3. IRENA Renewable Capacity Statistics

| | |
|---|---|
| Granularität | **Nur Land/Gebiet** (226 Einträge); „Region" meint Weltregionen |
| Standortbezug | Keiner |
| **Aufdach enthalten?** | **Nein.** Keine Rooftop- und keine Größenklassen-Dimension, nur on-grid/off-grid |
| Zugang | IRENASTAT-PxWeb-API, Query-Tool, Bulk-Download, PDF |
| Aktualität | Jahre 2000–2025, Tabelle zuletzt 17.04.2026 |
| Brauchbar? | **Nein — rechtlich ausgeschlossen** |

Über die IRENASTAT-PxWeb-API selbst abgefragt (GEPRÜFT). **Lizenz im Wortlaut**
(https://www.irena.org/terms-and-conditions, gilt laut eigenem Text auch für IRENASTAT):

> „Subject to article 4.3 below, Users may freely access, copy, share, download, reproduce,
> print and/or view IRENA's Content **for non-commercial purposes**, provided that appropriate
> attribution is given to IRENA. […] **No other use shall be made of IRENA's Content without
> IRENA's advanced written permission.**"

Dazu zwei Klauseln, die uns unmittelbar treffen — Nutzer dürfen nicht:

> „access or otherwise interact with the Website using **any robot, spider or other automated
> means**"

> „change, modify, delete, interfere with or misuse information contained in the Website and/or
> **attempt to disaggregate any data, material or statistics** generated through any of IRENA's
> Platforms and Tools"

**Damit ist IRENA für solar-check.io erledigt.** Wir sind seit dem Affiliate-Block eine
kommerzielle Seite. Die kursierende Aussage, IRENASTAT erlaube kommerzielle Nutzung, ist durch
den Primärtext widerlegt — nicht weiterverwenden.

---

## 4. Ember

| | |
|---|---|
| Granularität | Nur Land |
| Standortbezug | Keiner |
| **Aufdach enthalten?** | **Nein, nicht trennbar** — in der Landessumme enthalten, aber nicht ausweisbar |
| Zugang | Direkte CSV-Downloads ohne Registrierung (beide selbst abgerufen, HTTP 200) |
| Aktualität | jährlich bis **2025**, monatlich bis **08/2026** |
| Brauchbar? | **Als Frischesignal ja, als Atlas-Grundlage nein** |

Ember liefert installierte PV-Leistung je Land in **zwei** Datensätzen (beide selbst
heruntergeladen und ausgewertet, GEPRÜFT):

- **Yearly Electricity Data** — `Category = Capacity`, `Variable = Solar`, Einheit GW;
  5.634 Solar-Kapazitätszeilen, letztes Jahr **2025**, über 200 Länder.
- **Monthly Wind and Solar Capacity Data** — 17.797 Zeilen, Stand **August 2026**, 25 Länder
  plus Aggregate (europäisch: BE, DK, DE, FI, FR, IT, NL, PL, PT, ES, HU, TR, UK und „EU").
  Das ist **unterjährig** und damit aktueller als alles andere hier.

**Achtung AC/DC:** Der Monatsdatensatz trennt `GWAC` und `GWDC`. Deutschland 08/2026:
117,51 GWAC gegen 129,10 GWDC. Wer das mischt, vergleicht zwei verschiedene Größen. (Unser
eigener MaStR-Wert von 129,2 GWp liegt erwartungsgemäß bei der DC-Zahl.)

**Lizenz** (https://ember-energy.org/data/yearly-electricity-data/ und
.../monthly-wind-and-solar-capacity-data/, beide Seiten abgerufen, GEPRÜFT):

> „All content is released under a **Creative Commons Attribution Licence (CC-BY-4.0)**."

Der Lizenz-Volltext-Link (`ember-energy.org/creative-commons/`) wurde nicht geöffnet: UNGEPRÜFT.

**Offen, und vor einer Nutzung zu klären:** Woher Embers **Kapazitäts**zahlen im Jahresdatensatz
stammen, sagt die Seite nicht — sie nennt allgemein EIA, Eurostat, BP, UN und nationale Quellen,
ohne die Kapazität davon abzugrenzen. Falls die Jahres-Kapazität von IRENA käme (verbreitete
Annahme, hier UNGEPRÜFT), hinge an unserer CC-BY-Nutzung eine Quelle, deren eigene Terms
non-commercial sind. Für die Erzeugungsdaten, die wir bereits nutzen, stellt sich die Frage
nicht; für die Kapazität gehört das Methodik-PDF gelesen.

---

## 5. EU Joint Research Centre

### 5a) PVGIS — bestätigt: kein Bestand

Liefert Einstrahlung und Ertragsmodell, **keine einzige reale Anlage**. Wortlaut der JRC-Seite
(GEPRÜFT, https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en):

> „PVGIS provides information on solar radiation and photovoltaic system performance for any
> location in the world, except the North and South Poles."

Version 5.3 produktiv, Version 6 als Beta mit Sonnendaten 2014–2024. Für die Bestandsfrage
irrelevant — wir nutzen es bereits für den Ertrag.

### 5b) DBSM R2025 — der wertvollste Fund dieser Recherche, aber kein Bestand

„EU Digital Building Stock Model", **Einzelgebäude für die gesamte EU-27** inkl. Azoren,
Madeira, Kanaren.

| | |
|---|---|
| Granularität | Einzelgebäude |
| Standortbezug | Gebäudegeometrie |
| **Aufdach enthalten?** | **Nein — aber am nächsten dran.** Felder `rooftop_pv_potential_MWh_per_y` und `technical_capacity_KWp` sind eine **Modellrechnung**, kein Bestand |
| Zugang | Offener Dateiserver, je Land eine GeoPackage-Datei |
| Aktualität | Veröffentlicht 19.05.2025, Dateistand 12.12.2025, Changelog bis 12.01.2026 — **die aktuellste Quelle im Feld** |

Attribute: Höhe, Kompaktheit, Bauepoche, Nutzungsart, Grundfläche, Geschossfläche,
Dach-PV-Potenzial. Die Potenzialrechnung unterstellt bei Wohngebäuden 25 % der Dachfläche als
nutzbar, bei Nichtwohngebäuden 40 %, Leistungsdichte 234,19 Wp/m², Modulwirkungsgrad 22 %,
Ertrag aus PVGIS für 20° Südausrichtung mit 14 % Systemverlusten. **Was tatsächlich auf dem Dach
liegt, steht nirgends.**

Download verifiziert (GEPRÜFT): `dbsm-germany-R2025.gpkg` antwortet mit HTTP 200,
**52.900.532.224 Byte = 52,9 GB**, Stand 12.12.2025. Frankreich 27 GB, Niederlande 24 GB,
Italien 23 GB.

**Lizenz — hier gibt es einen Widerspruch, und er ist wichtig:**

- Die `copyright.txt` auf dem Dateiserver sagt: „(c) European Union, 1995-2026 … Any copyright
  and/or sui generis right on the dataset is licensed under the Creative Commons Attribution
  4.0 International (CC BY 4.0) licence."
- Der Katalogeintrag auf data.europa.eu nennt für dieselbe Verteilung **ODbL-1.0**, und im selben
  Verzeichnis liegt eine 25 KB große `licenseODbL.txt`.

Das ist erklärbar: Das Modell zieht Gebäude aus OpenStreetMap und Microsoft Buildings, und der
OSM-Anteil ist ODbL. Das Changelog stützt das — zwei behördliche Quellen in Prag und den
Abruzzen wurden im Oktober 2025 „to simplify licensing management" ausgebaut und durch
OSM/Microsoft ersetzt. **Vor einer Nutzung muss das geklärt werden; CC BY anzunehmen wäre eine
Vermutung.** ODbL wäre für uns heikel: Es ist Share-alike und kollidiert mit dem
Nutzungsvorbehalt auf `/lizenz`.

### 5c) Hotmaps — Potenzial, und veraltet

Raster 100 × 100 m und NUTS3-Tabelle. Das Repository `potential_solar` heißt „Solar potential
Raster @ 100 x 100 m yearly (on building roof)" — es kreuzt PVGIS-Einstrahlung mit
Gebäude-Grundflächen aus Copernicus. **Reine Modellrechnung, keine einzige reale Anlage.**
Lizenz im Wortlaut aus der README (GEPRÜFT): „Creative Commons Attribution 4.0 International
License. […] SPDX-License-Identifier: CC-BY-4.0". Copyright-Vermerk „2016-2018",
Toolbox-Endversion September 2020, Einstrahlung als 1-km-Raster. Fachlich durch DBSM überholt.

### 5d) EU Building Stock Observatory — Länderebene, PV unklar

Granularität **Land oder EU gesamt**, keine Regionen. Die amtliche Themenliste nennt „building
stock, energy consumption, building elements and technical building systems installed, energy
performance certificates, nearly zero-energy buildings and renovation rates, energy poverty and
financing" — Solar oder Photovoltaik kommen darin **nicht** vor. Ob unter „technical building
systems" ein PV-Indikator steckt, ist UNGEPRÜFT: Die Datenbank ist ein Power-BI-Embed, das ohne
JavaScript nur „Sorry, we were unable to load the report" liefert; der CIRCABC-Link antwortete
mit HTTP 404 (JS-Oberfläche, kein Beweis, dass die Datei fehlt).

**Lizenz nicht gefunden** — weder auf der Kommissionsseite noch im Datensatzeintrag auf
data.europa.eu steht eine Lizenz an den Verteilungen. Für einen Ortsatlas ist die Quelle wegen
der Länderebene ohnehin unbrauchbar; nicht weiterverfolgen.

### 5e) EUBUCCO — Gebäude ja, PV nein

322+ Mio. Einzelgebäude, EU-27 + UK, Norwegen, Schweiz. Datenschema gelesen (GEPRÜFT):
`id, region_id, city_id, type, subtype, height, floors, construction_year, geometry` plus
Konfidenzfelder — **kein einziges Solar- oder PV-Attribut**. Baujahr nur zu 15,9 % belegt, Höhe
zu 56,7 % per Machine Learning geschätzt.

Download verifiziert: `eubucco-v0_1.zip`, HTTP 200, **103,3 GB**. Zenodo-Snapshot v0.1 vom
20.10.2022; auf der Website läuft v0.2.

**Lizenz im Wortlaut** (docs.eubucco.com/latest/license/, GEPRÜFT):

> „The EUBUCCO dataset is licensed under the Open Data Commons Open Database License (ODbL)
> v1.0, with the following regional exceptions:" — Prag CC-BY-SA, **Abruzzen CC-BY-NC, also
> nicht-kommerziell.** „If you require a dataset licensed exclusively under ODbL, filter out
> these sources using the geometry_source column."

Für ein kommerzielles Projekt heikel: Die Abruzzen-Daten sind unbrauchbar, und ODbL ist
Share-alike. Der Zenodo-Eintrag trägt im Metadatenfeld zudem `"license": "other-closed"`, was der
Doku widerspricht — die Doku ist die belastbarere Aussage, die Unstimmigkeit gehört notiert.
Gegenüber DBSM R2025 kein Grund, EUBUCCO vorzuziehen: älter, ohne PV-Bezug, mit NC-Ausnahme.

### 5f) Weitere JRC-Treffer

Der JRC-Datenkatalog (data.jrc.ec.europa.eu) weist jeden automatischen Abruf ab („Request
Rejected", auch mit Browser-Kennung) — die Metadaten wurden über die data.europa.eu-API geholt.

- **Rooftop-Potenzial-Datensatz (2019)**: Gebäudedichte-Raster 100 × 100 m plus modelliertes
  PV-Potenzial auf **NUTS2-Ebene**. Reines Potenzial, durch DBSM überholt.
- **„Final Installed Capacity of Renewable Energy"**: Klingt nach Bestand, ist keiner — das sind
  die **erwarteten** Kapazitäten aus den nationalen Aktionsplänen zur Erfüllung der 2020-Ziele,
  je Mitgliedstaat, veröffentlicht 18.10.2017. Eine Planungsgröße von vorgestern.

---

## 6. Open Power System Data — der plausibelste Kandidat, und er ist tot

| | |
|---|---|
| Granularität | **Einzelanlage** (DE, CZ, DK, PL, UK) bzw. Gemeinde (CH, FR) |
| Standortbezug | lon/lat, NUTS 1–3, Gemeinde — in einer harmonisierten EU-Datei |
| **Aufdach enthalten?** | **Je nach Land: DE, CZ, DK, CH ja; FR teilweise; PL und UK nein** |
| Zugang | Direkter CSV-Download ohne Registrierung (selbst abgerufen, HTTP 200) |
| Aktualität | **Version 2020-08-25 — seither nichts mehr** |
| Brauchbar? | **Nein, wegen Alter und Lizenzlage** |

Der Datensatz **existiert und ist vollständig herunterladbar** (GEPRÜFT, 23.09.2026). Es gibt
sogar eine harmonisierte Gesamtdatei `renewable_power_plants_EU.csv` (254 MB, 2.115.921 Zeilen)
mit einheitlichen Spalten:

```
electrical_capacity, energy_source_level_1..3, technology, data_source,
nuts_1_region, nuts_2_region, nuts_3_region, lon, lat, municipality,
country, commissioning_date, as_of_year, geographical_resolution
```

Das ist strukturell genau das, was ein europäischer Atlas bräuchte. **Eigene Auswertung dieser
Datei** (alle Zahlen selbst gerechnet, 23.09.2026):

| Land | Solar-Zeilen | MW | Median | < 10 kW | Auflösung | jüngste Inbetriebnahme |
|---|---:|---:|---:|---:|---|---|
| DE | 1.893.618 | 50.456 | 8,8 kW | 1.163.672 | Anlage | 2019 |
| DK | 76.366 | 538 | 5,8 kW | 73.253 | Anlage | 2016 |
| FR | 50.064 | 8.137 | 66,1 kW | 8.270 | **Gemeinde** | 2019 |
| CZ | 14.459 | 1.995 | 10,0 kW | 6.482 | Anlage | *kein Datum* |
| CH | 11.724 | 613 | 9,9 kW | 5.928 | **Gemeinde** | 2018 |
| UK | 1.169 | 8.463 | **5.000 kW** | **0** | Anlage | 2020 |
| PL | 814 | 312 | 108,5 kW | 64 | **ohne Koordinaten** | *kein Datum* |

**Drei Befunde, die die Quelle erledigen:**

1. **Sie wird nicht mehr gepflegt.** Letzte Version 2020-08-25; der letzte Commit im
   GitHub-Repository `Open-Power-System-Data/renewable_power_plants` datiert auf den
   **23.08.2020** (über die GitHub-API abgefragt, GEPRÜFT). Die Projektseite sagt selbst:
   „actively maintained (**current funding until 2020**)". Ein Nachfolger wurde nicht gefunden.
2. **Die Abdeckung ist klein und ungleich.** Acht Länder, zusammen 70.514 MW Solar — zum
   Vergleich: Die EU-27 allein hatte 2024 laut Eurostat 307.101 MW. Davon entfallen 50.456 MW
   (72 %) auf Deutschland, also auf genau das Register, das wir bereits im Original und aktuell
   haben. Außerhalb Deutschlands bleiben 20.058 MW. Polen liegt nur aggregiert nach Powiat vor,
   Schweden nur mit Wind, die Schweiz nur mit KEV-geförderten Anlagen.
3. **Es gibt keine Datenlizenz.** Die Startseite (GEPRÜFT, https://open-power-system-data.org/):

   > „It is our goal to provide all data on this platform free of charge to anyone without
   > restriction on its use, including commercial applications. We would like to publish all data
   > under a Creative Commons Attribution license, an open license that allows any use and
   > derivative work. **However, at this point, several data owners do not allow us to do so.
   > Beware that some data published here might be subject to copyright.**"

   Und am Seitenfuß: „**Text** on this website is licensed under CC BY 4.0." — der Text, nicht
   die Daten. Die `datapackage.json` des Datensatzes trägt **kein `license`-Feld**, nur eine
   `attribution`-Angabe (selbst geprüft).

   Das ist ein **Ziel, keine Lizenz**. Wer die Daten kommerziell nutzen will, müsste jede
   Länderquelle einzeln prüfen — also genau die Arbeit leisten, die die Quelle einsparen sollte.

Selbst wenn man das Alter hinnähme: Der deutsche Teil ist mit 1,89 Mio. Anlagen und 50,5 GW
heute 30 % der Anlagenzahl und 39 % der Leistung unseres eigenen Bestands (6,31 Mio. / 129,2 GW).

---

## 7. OpenStreetMap

| | |
|---|---|
| Granularität | Einzelobjekt (Node/Way/Relation) |
| Standortbezug | Exakte Geometrie |
| **Aufdach enthalten?** | **Grundsätzlich ja, in der Menge aber nicht belastbar** |
| Zugang | Overpass-API, Planet-Dumps, Geofabrik-Auszüge |
| Aktualität | **tagesaktuell** |
| Brauchbar? | **Als Kartenebene ja, als Zahlengrundlage nein** |

**Eigene Zählung am 23.09.2026** über die regionalen taginfo-Datenbanken von Geofabrik
(`https://taginfo.geofabrik.de/<region>/api/4/tag/stats?key=generator%3Asource&value=solar`,
Datenstand laut API-Feld `data_until` jeweils **2026-09-22**). Die Overpass-API war an diesem Tag
über mehrere Endpunkte überlastet („The server is probably too busy") — deshalb der Umweg über
taginfo, der dieselbe Grundgesamtheit zählt.

| Land | Objekte `generator:source=solar` | davon `location=roof` |
|---|---:|---:|
| Deutschland | 285.687 | 116.496 (41 %) |
| Italien | 95.510 | 6.467 (7 %) |
| Spanien | 85.249 | 2.145 (3 %) |
| Frankreich | 79.980 | 40.908 (51 %) |
| Niederlande | 79.413 | 10.267 (13 %) |
| Portugal | 70.602 | — |
| Schweiz | 68.403 | — |
| Polen | 61.684 | 16.411 (27 %) |
| Tschechien | 41.750 | — |
| Belgien | 26.965 | — |
| Schweden | 18.563 | — |
| Dänemark | 16.647 | — |
| Griechenland | 9.070 | — |
| Österreich | 6.110 | — |

**Zwei Messungen, die OSM als Bestandsquelle erledigen:**

1. **Die Abdeckung ist gering.** Deutschland: 285.687 OSM-Objekte gegen **6.312.591** Anlagen im
   Register — **4,5 %**. Und die Lücke ist nicht gleichmäßig, sondern folgt der Mapper-Dichte:
   Ein Atlas darauf stellte Gemeinden nebeneinander, deren Zahlen zeigen, wie aktiv dort gemappt
   wird, nicht wie viel dort gebaut wurde.
2. **Die Leistung fehlt fast überall.** In Deutschland tragen 265.436 der 285.687 Solarobjekte
   (92,9 %) den Schlüssel `generator:output:electricity` — aber der Wert ist zu **67,3 % schlicht
   „yes"** (192.378) und zu **23,9 % „small_installation"** (68.171). Es bleiben **4.887 Objekte
   = 1,7 %**, die überhaupt einen anderen Wert tragen könnten. Und diese Werte sind Freitext:
   Über alle Energiearten führt die deutsche Datenbank **2.608 verschiedene Schreibweisen**
   desselben Schlüssels, darunter „2 MW", „2000 kW" und „2.00 MW" nebeneinander. Zählt man über
   alle Energiearten die Werte, die mit einer Ziffer beginnen, sind es in Deutschland 8,7 %, in
   Italien 1,6 %, in den Niederlanden 2,6 % — und das sind ganz überwiegend Solarparks und
   konventionelle Kraftwerke, nicht Dächer.

Ein Objekt ohne Leistungsangabe ist für eine Auswertung in kWp — also genau das, was unser Atlas
macht — wertlos. **Lizenz:** ODbL, aus der Overpass-Antwort im Wortlaut: „The data included in
this document is from www.openstreetmap.org. The data is made available under ODbL." Share-alike,
also für abgeleitete Datenbanken heikel.

---

## 8. OpenInfraMap

| | |
|---|---|
| Granularität | Einzelobjekt, aber gezählt werden `power=plant`-Objekte |
| **Aufdach enthalten?** | **Faktisch nein** — gezählt werden Kraftwerke, nicht private Dächer |
| Zugang | Karte + Statistikseiten je Land |
| Brauchbar? | **Nein, es ist OSM in anderer Verpackung** |

Datenquelle an der Quelle selbst bestätigt (GEPRÜFT), Wortlaut der About-Seite:

> „All the data currently displayed on Open Infrastructure Map is sourced directly from
> OpenStreetMap."

Betrieben von einer Privatperson. **Lizenz** (Fußzeile jeder Seite): „Data © OpenStreetMap
contributors, ODbL. International regions © MarineRegions.org, CC-BY. Analysis © Open
Infrastructure Map, CC-BY."

Gemessen am 23.09.2026 auf https://openinframap.org/stats/area/Germany:

> „Germany has 11850 power plants totalling 139,340 MW and 143,828 km of power lines mapped on
> OpenStreetMap."

In der Tabelle „Power plants in Germany by source": **solar — 13.436 MW — 6.628 Kraftwerke.**
Das sind 6.628 Objekte gegen 6,31 Mio. Anlagen im Register und 13,4 GW gegen 129,2 GWp — die
Statistik zählt `power=plant`, also Freiflächenanlagen und große Aufdachanlagen. Die privaten
Dächer sind darin nicht.

---

## 9. Satellitenerkennung

Sechs Datensätze geprüft. **Keiner erfasst private Aufdachanlagen** — und die beiden
maßgeblichen sagen das ausdrücklich selbst. Der Grund ist physikalisch: Bei den verwendeten
Bildauflösungen (Sentinel-2 10 m, PlanetScope 4,7 m/px) ist ein Hausdach ein bis zwei Pixel.

### 9a) Global Solar Power Tracker (Global Energy Monitor)

| | |
|---|---|
| Granularität | Großanlagen als Einzelanlage mit Koordinaten; verteilte Anlagen **nur als Ländersumme** |
| **Aufdach enthalten?** | **Nein, nicht als Anlage** — nur als eine Zahl je Land |
| Zugang | Download **hinter Pflichtformular** |
| Aktualität | **Februar 2026**, 103.940 Projektphasen, 2.093 GWac in Betrieb |

**Schwelle im Wortlaut** (Methodik auf der Download-Seite, GEPRÜFT):

> „The Global Solar Power Tracker aims to comprehensively track all operating utility-scale
> (**1 MW+**) solar project phases with capacities greater than 1 MW, and all announced,
> pre-construction, construction, and shelved projects with capacities greater than 20 MW."

> „The Global Solar Power tracker also includes **nationally aggregated distributed (< 1 MW)
> solar capacities for 31 countries/areas**"

Die Tabelle der verteilten Anlagen wurde heruntergeladen (Februar-2026-Stand, GEPRÜFT):
**31 Zeilen, je Land genau eine Zahl.** Deutschland: 69.482 MWac. Keine Koordinate, kein Ort,
kein Jahr.

**Zugang ist nicht anonym:** Das Download-Formular verlangt Klarname, E-Mail, Organisation,
Sektor, Land und einen Freitext zum Verwendungszweck mit **Mindestlänge 100 Zeichen** (im
Quelltext des Formular-Bundles gelesen, GEPRÜFT). Keine API.

**Lizenz — mit einer Falle**, die uns direkt trifft:

> „When the data set is being shared or adapted and our Creative Commons **CC BY 4.0**
> International license applies […]"

> „Please note that records with a ‚TZ ID' in the Other IDs (unit/phase) column were partially or
> fully sourced from the TransitionZero, Solar Asset Mapper, August 2025. […] Distributed under a
> Creative Commons **Attribution-Non-Commercial 4.0** International License (CC BY-NC 4.0)."

Wer kommerziell nutzt, muss diese Zeilen herausfiltern — und **ausgerechnet sie tragen die
Abdeckung zwischen 1 und 20 MW**, denn die Methodik sagt, dass TransitionZero-Datensätze dort
„sourced to improve the coverage" wurden.

*Nebenbefund:* Der von der Seite verlinkte Methodik-Artikel auf gem.wiki antwortet mit HTTP 404
(„There is currently no text in this page"). Die vollständige Methodik steht auf der
Download-Seite selbst.

### 9b) Kruitwagen et al., Nature 2021 — „A global inventory of photovoltaic solar energy generating units"

| | |
|---|---|
| Granularität | Polygon je Anlage mit Fläche, Kapazitätsschätzung, Installationsdatum |
| **Aufdach enthalten?** | **Nein — ausdrücklich ausgeschlossen** |
| Zugang | Zenodo, offen, ohne Registrierung (verifiziert) |
| Lizenz | **CC BY 4.0** (kommerziell erlaubt) |
| Aktualität | Datenstand **Ende 2018**, veröffentlicht 27.10.2021, **keine neuere Version** |

**Schwelle, Abstract im Wortlaut** (GEPRÜFT):

> „Here we provide a global inventory of commercial-, industrial- and utility-scale PV
> installations (that is, PV generating stations **in excess of 10 kilowatts** nameplate
> capacity) […] We locate and verify 68,661 facilities"

**Die Stelle zum Aufdach** (Supplementary Information, Abschnitt „Generating Capacity", PDF frei
heruntergeladen und gelesen, GEPRÜFT):

> „**Our dataset does not include residential solar which is too small to detect reliably in our
> imagery sources and makes up 11% of total installed capacity.** We acknowledge that 10kW does
> not perfectly delineate residential and non-residential PV solar energy installations"

Gewerbliche Dachanlagen sind also enthalten, Einfamilienhaus-Dächer nicht. Der Zenodo-Record
(5005868) trägt `access_right: open` und Lizenz `cc-by-4.0`; die Versionskette enthält nur
**v1.0.0** — es gibt keinen Nachfolger, der Stand bleibt Ende 2018.

### 9c) Global Renewables Watch (Planet / Microsoft / TNC), 2025

Global, quartalsweise 2017 Q4 – 2024 Q2, 86.410 Solar-Polygone. **Schwelle im Wortlaut**
(Paper-PDF gelesen, GEPRÜFT): „we follow the convention set in Kruitwagen et al. for solar —
**targeting installations in excess of 10,000 square meters**". Das sind grob 1–2 MW, also noch
grobkörniger. **Aufdach: nein.** Lizenz **MIT** (im Repo verifiziert), Download ohne
Registrierung (HTTP 200). **Keine Kapazität je Anlage**, nur Polygone.

### 9d) TZ-SAM / Solar Asset Mapper (TransitionZero)

Zenodo-Record geprüft: v1.0, 29.05.2024, Q1-2024-Stand, 63.616 Assets, 183 Länder, 711 GW,
Felder `id, geometry, capacity_mw, constructed_before, constructed_after`. **Lizenz laut
Zenodo-Metadaten: `cc-by-nc-4.0` — kommerzielle Nutzung ausgeschlossen.** Das deckt sich mit
GEMs eigener Angabe zur TZ-ID-Teilmenge. **Aufdach: nein** (Sentinel-2, 10 m). Neuere
Quartalsstände existieren laut Suchergebnissen; die Herstellerseite antwortete bei drei
Versuchen mit HTTP 429 (Rate Limit) — der aktuelle Stand ist damit UNGEPRÜFT, nicht widerlegt.

### 9e) Global photovoltaic solar panel dataset 2019–2022

Scientific Data 2025, Zenodo CC BY 4.0. **Rasterdaten mit 20 m Auflösung** — keine
Anlagenobjekte, keine Kapazitäten, nur Flächen. Die Autoren sagen selbst: „there are some errors
in the identification results for smaller distributed and rooftop PV". Aus einem 20-m-Raster
lässt sich keine Anlage mit Leistung ableiten.

### 9f) OpenPVMapper (Frankreich) — der einzige echte Aufdach-Treffer, und er ist national

| | |
|---|---|
| Abdeckung | **Nur Metropolitan-Frankreich** |
| Inhalt | **1.135.850 Aufdachanlagen, ~15,0 GWp**, Stand Juli 2026 |
| Attribute | Gemeindeschlüssel, Gebäude-ID, **Fläche (m²), Neigung, Azimut, kWp** |
| Lizenz | **CC BY 4.0** |

Inhaltlich genau das, was ein Atlas bräuchte — erzeugt per KI-Erkennung auf IGN-Luftbildern plus
OpenStreetMap plus manuelle Korrekturen. **Aber die Qualität ist eine andere Klasse als ein
Melderegister, und die Autoren sagen es selbst:** Bei manueller Prüfung von 1.862 Anlagen liegt
die Präzision gewichtet bei **74–75 %**. Wird ein Eintrag von zwei Quellen bestätigt, steigt sie
auf 96,9 %, bei drei auf 98,2 % — aber nur 38 % der Einträge sind mehrfach belegt. **Jeder vierte
Eintrag ist also potenziell falsch.** Für ein Projekt, dessen Zusage die Richtigkeit der Zahlen
ist, wäre das nur mit sichtbarem Vorbehalt verwendbar.

### 9g) Was nur Forschung ist, ohne nutzbaren Datensatz (UNGEPRÜFT, ehrlich benannt)

- **3D-PV-Locator / DeepSolar for Germany** (NRW, 10-cm-Luftbilder): Öffentlich sind laut
  Suchergebnis Modelle und Trainingsbilder, nicht das erzeugte Anlagenregister. Ob der
  NRW-Bestand als Datensatz herunterladbar ist, wurde nicht geprüft.
- **Kadaster / CBS Niederlande** (landesweite GeoAI-Erkennung): existiert, Zugangs- und
  Lizenzlage ungeprüft.

---

## 10. EU-Recht als Hebel

**Kurzantwort: Es gibt keine unionsrechtliche Pflicht zu einem öffentlichen Anlagenregister, und
Energiedaten sind keine eigene Kategorie hochwertiger Datensätze.** Beides ist am Normtext
belegt.

*Methodischer Vorbehalt für diesen ganzen Abschnitt:* `eur-lex.europa.eu` beantwortet
automatisierte Abrufe mit einem AWS-WAF-Challenge (HTTP 202, leerer Body). Alle Volltexte
stammen aus dem amtlichen Cellar-Repository des Amts für Veröffentlichungen
(`https://publications.europa.eu/resource/celex/<CELEX>`) — dieselbe Textquelle, die EUR-Lex
rendert.

### 10a) Richtlinie (EU) 2019/944 — keine Registerpflicht

CELEX `32019L0944`, konsolidiert `02019L0944-20240716`, GEPRÜFT. **Art. 23 Abs. 1 Satz 2**
definiert den Gegenstand abschließend:

> „For the purpose of this Directive, data shall be understood to include **metering and
> consumption data** as well as data required for customer switching, demand response and other
> services."

Art. 23/24 regeln also Messwerte und Verbrauchsdaten des Endkunden und den Zugang Dritter dazu —
kein Wort zu Erzeugungsanlagen, Standorten, installierter Leistung oder Inbetriebnahme.
**Gegenprobe über den ganzen Richtlinientext:** `registr*` kommt **genau einmal** vor, in
Erwägungsgrund 46 zu Bürgerenergiegemeinschaften. Es gibt in der Richtlinie kein Register.

### 10b) VO (EU) 2019/943 und VO (EU) Nr. 543/2013 — hier sitzt die Schwelle

**VO 2019/943** (CELEX `32019R0943`, GEPRÜFT) kennt genau ein Register, in **Art. 26 Abs. 10
Buchst. a / Abs. 15**: ein von ENTSO-E betriebenes Register **von Kapazitätsanbietern** für
Kapazitätsmechanismen. Nicht öffentlich, nicht anlagenbezogen.

**VO 543/2013** (CELEX `32013R0543`, GEPRÜFT, Art. 14 unverändert in Kraft) ist die Grundlage der
ENTSO-E-Plattform. Die Schwellen im Überblick:

| Was | Schwelle | Granularität |
|---|---|---|
| Summe installierter Leistung je Erzeugungsart | Anlagen **≥ 1 MW** | aggregiert, jährlich |
| Einzelanlage mit Name, Leistung, Standort, Spannungsebene, Gebotszone, Art | **≥ 100 MW** | Einzelanlage, jährlich |
| Ist-Erzeugung je Einheit (Art. 16 Abs. 1 Buchst. a) | **≥ 100 MW** | Einzelanlage |
| Nichtverfügbarkeit (Art. 15 Abs. 1) | Änderung ≥ 100 MW bei Einheiten ≥ 200 MW | Einzelanlage |

Art. 3 Abs. 1 macht die Plattform öffentlich und kostenlos („available to the public free of
charge through the internet […] up to date, easily accessible, downloadable"). **Aber ihr Inhalt
ist ein Marktdaten-Transparenzinstrument, kein Bestandsregister.** Anlagen unter 1 MW erscheinen
**nicht einmal in der aggregierten Summe**. Und die Pflicht adressiert Übertragungsnetzbetreiber
für ihre Regelzonen — verteilnetzseitige Kleinanlagen sind auch darüber nicht erfasst.

### 10c) RED II / RED III — Genehmigungsverfahren, kein Register

Konsolidiert `02018L2001-20231120`, GEPRÜFT. Art. 16 regelt Kontaktstellen und verlangt, dass
„**By 21 November 2025** Member States shall ensure that all permit-granting procedures are
carried out in electronic form". Die **einzige** Publizitätspflicht des Kapitels ist Art. 16
Abs. 9:

> „Decisions resulting from the permit-granting procedures shall be made publicly available **in
> accordance with the applicable law**."

Das sind Genehmigungs*entscheidungen*, nicht Anlagenstammdaten, und die Pflicht steht unter
nationalem Vorbehalt. Art. 15b/15c (Beschleunigungsgebiete) kartieren **Flächen**, nicht Anlagen.
Der einzige Treffer zu „Registrierung" in RED III steht in Art. 19 Abs. 2 (Herkunftsnachweise):
„Simplified registration processes and reduced registration fees shall be introduced for small
installations of less than 50 kW".

### 10d) Open-Data-Richtlinie und DVO (EU) 2023/138 — und die Nuance, die man kennen muss

**Die Durchführungsverordnung existiert:** DVO (EU) 2023/138 vom **21. Dezember 2022**, ABl. L 19
vom 20.01.2023, S. 43, CELEX `32023R0138`, anwendbar seit Juni 2024. GEPRÜFT.

**Anhang I der RL 2019/1024 nennt sechs Kategorien** (GEPRÜFT):

> „1. Geospatial · 2. Earth observation and environment · 3. Meteorological · 4. Statistics ·
> 5. Companies and company ownership · 6. Mobility"

**Energie ist keine eigene Kategorie.** Die naheliegende Erwartung stimmt also — **aber die
pauschale Antwort „Energiedaten kommen dort nicht vor" wäre falsch.** Anhang Nr. 2.1 der DVO
listet unter „Earth observation and environment" die erfassten INSPIRE-Datenthemen, und darunter
stehen wörtlich:

> „Energy Resources (III)" · „Production and industrial facilities (III)"

Definiert in Anhang III der INSPIRE-Richtlinie 2007/2/EG (GEPRÜFT):

> „**20. Energy resources** — Energy resources including hydrocarbons, hydropower, bio-energy,
> solar, wind, etc., where relevant including depth/height information on the extent of the
> resource."

**Drei Gründe, warum das trotzdem kein Hebel ist, jeder am Text belegt:**

1. **Es ist Ressourcen- und Standortgeografie, kein Anlagenregister.** Gemeint ist das
   *Potenzial* einer Fläche samt Ausdehnung — nicht Betreiber, installierte Leistung,
   Inbetriebnahmedatum oder Speichergröße einer Anlage.
2. **Die DVO verpflichtet nur zur Veröffentlichung vorhandener Daten, nicht zu deren Erhebung.**
   Art. 1 Abs. 1: „establishes the list of high-value datasets … **held by public sector bodies
   among the existing documents**". Wo ein Mitgliedstaat kein Register führt, entsteht durch die
   DVO keines.
3. **Öffentliche Unternehmen sind ausgenommen** — Erwägungsgrund der DVO im Wortlaut: „However,
   data held by public undertakings are not included in the scope of this Implementing
   Regulation." Das trifft genau die Stellen, bei denen Anlagendaten typischerweise liegen:
   Netzbetreiber in öffentlicher Hand.

**Kommt eine Erweiterung um Energie?** Art. 13 Abs. 2 RL 2019/1024 ermächtigt die Kommission,
Anhang I per delegiertem Rechtsakt zu erweitern. **Ein solcher Rechtsakt für Energie wurde nicht
gefunden.** Die Mitteilung COM(2025) 835 final vom 19.11.2025 („Data Union Strategy", Volltext
gelesen, GEPRÜFT) kündigt für Q4 2026 eine Erweiterung an und benennt die Richtung ausdrücklich
**ohne Energie**:

> „In 2026, the Commission will propose to expand the list of high-value datasets to cover
> **legal, judicial, administrative and other data**."

Eine Mitteilung ist eine politische Absichtserklärung, **kein Rechtsakt** — kein Entwurf, keine
Konsultation mit Fundstelle.

### 10e) Data Act und Energy Data Space — nichts davon begründet ein Register

Data Act (VO (EU) 2023/2854, CELEX `32023R2854`, GEPRÜFT): Die Zeichenfolge `registr` kommt im
gesamten Volltext **null Mal** vor (Gegenprobe: „data holder" 145 Treffer — die Suche
funktioniert). Der Durchführungsrechtsakt zu Art. 24 RL 2019/944 ist die **DVO (EU) 2023/1162**,
und die regelt nach ihrem Art. 1 Abs. 1 ausdrücklich „access to **electricity metering and
consumption data**". Der „European Energy Data Space" wird in COM(2025) 835 mit einem Halbsatz
erwähnt und ist ein Förder- und Infrastrukturvorhaben, kein Rechtsakt.

### 10f) Was EU-weit tatsächlich existiert

| Instrument | Rechtsgrundlage | Öffentlich? | Kleinanlagen? |
|---|---|---|---|
| ENTSO-E Transparency Platform | Art. 3 VO 543/2013 | ja, kostenlos | **nein** — Einzelanlage ab 100 MW, Aggregat ab 1 MW |
| Kapazitätsanbieter-Register | Art. 26 VO 2019/943 | nein | nein — registriert Anbieter, nicht Anlagen |
| Marktteilnehmer-Register CEREMP (ACER) | Art. 9 VO 1227/2011 i. d. F. 2024/1106 | teilweise | nein — registriert **Unternehmen** |
| Kontaktstelle / digitales Genehmigungsverfahren | Art. 16 RL 2018/2001 | Verfahren, nicht Daten | — |

**Das Marktstammdatenregister ist eine rein nationale Konstruktion** (§ 111e EnWG, MaStRV) ohne
unionsrechtliche Pflicht dahinter. Wer ein europäisches MaStR-Äquivalent sucht, sucht nach etwas,
das das EU-Recht nirgends verlangt.

---

## Übersicht

| Quelle | Granularität | Aufdach enthalten? | Zugang | Lizenz kommerziell OK? | Aktualität | Für unseren Atlas brauchbar? |
|---|---|---|---|---|---|---|
| **ENTSO-E Transparency** | Gebotszone; Einzelanlage ab 100 MW | **Nein** (Aggregat erst ab 1 MW) | Portal + API | Unklar — eigenes Datenbankrecht, Positivliste nicht auffindbar | laufend | **Nein** |
| **Eurostat `nrg_inf_epcrw`** | Land | **Ja, als Größenklasse** (`< 30 kW`) | Offene SDMX-API | **Ja**, ausdrücklich | Berichtsjahr 2024 | **Nur als Ländervergleich** |
| **IRENA** | Land | Nein | PxWeb-API | **Nein** — „non-commercial purposes", Robots verboten | bis 2025 | **Nein** |
| **Ember** | Land | Nein (nicht trennbar) | CSV offen | **Ja** (CC BY 4.0); Herkunft der Kapazität offen | jährlich 2025, **monatlich 08/2026** | **Nur als Frischesignal** |
| **PVGIS** | Koordinate | — (kein Bestand) | API | ja | v5.3 | **Nein** (nutzen wir für Ertrag) |
| **JRC DBSM R2025** | **Einzelgebäude, EU-27** | **Nein** — Potenzial, nicht Bestand | Dateiserver, 52,9 GB für DE | **Ungeklärt**: CC BY vs. ODbL im Widerspruch | 12/2025 | **Nicht für Bestand — aber für Dachflächen prüfen** |
| **JRC Hotmaps** | Hektarraster / NUTS3 | Nein — Potenzial | GitLab/Zenodo | Ja (CC BY 4.0) | 2018–2020 | **Nein** (überholt) |
| **EU Building Stock Obs.** | Land | Unklar (Power-BI, ungeprüft) | xlsx über CIRCABC | **Keine Lizenz gefunden** | Update 06/2026 | **Nein** |
| **EUBUCCO** | Einzelgebäude, 30 Länder | **Nein** — kein PV-Attribut | Zenodo, 103,3 GB | **Teilweise nein** — ODbL + eine CC-BY-NC-Region | v0.1 10/2022 | **Nein** (DBSM ist besser) |
| **Open Power System Data** | **Einzelanlage** (DE/CZ/DK/PL/UK), Gemeinde (CH/FR) | **Teils ja** (DE, DK, CZ, CH); **nein** bei PL, UK | CSV offen, 254 MB | **Nein** — „some data … might be subject to copyright", kein Lizenzfeld | **2020-08-25, Projekt tot** | **Nein** |
| **OpenStreetMap** | Einzelobjekt | **Ja, aber 4,5 % Abdeckung und ohne Leistung** | Overpass / taginfo / Dumps | ODbL (Share-alike) | **tagesaktuell** | **Nur als Kartenebene** |
| **OpenInfraMap** | `power=plant`-Objekte | **Faktisch nein** (6.628 für DE) | Karte + Statistik | ODbL / CC BY | tagesaktuell | **Nein** (ist OSM) |
| **Global Solar Power Tracker** | Einzelanlage ab 1 MW; verteilte nur Landessumme | **Nein** | Formular mit Klarname | CC BY 4.0, **aber TZ-Zeilen CC BY-NC** | **02/2026** | **Nein** (nur als Kontextzahl) |
| **Kruitwagen et al. 2021** | Polygon je Anlage > 10 kW | **Nein — ausdrücklich ausgeschlossen** | Zenodo offen | Ja (CC BY 4.0) | **Ende 2018** | **Nein** |
| **Global Renewables Watch** | Polygon ab 10.000 m² | **Nein** | GitHub offen | Ja (MIT) | 2024 Q2 | **Nein** |
| **TZ-SAM** | Anlage mit `capacity_mw` | **Nein** | Zenodo | **Nein** (CC BY-NC 4.0) | Q1/2024 geprüft | **Nein** |
| **Global PV panel dataset** | Raster 20 m | **Nein** | Zenodo | Ja (CC BY 4.0) | 2019–2022 | **Nein** |
| **OpenPVMapper (FR)** | **Einzelanlage mit kWp** | **Ja** | Zenodo offen | Ja (CC BY 4.0) | **07/2026** | **Ja — aber nur Frankreich, 74–75 % Präzision** |
| **EU-Recht** | — | — | — | — | — | **Kein Hebel: keine Registerpflicht** |

---

## Was daraus folgt

**Eine europaweite Quelle, die unseren Atlas trägt, gibt es nicht — und es wird sie nicht von
selbst geben.** Das ist kein Rechercheergebnis über den heutigen Stand, sondern eines über die
Struktur: Das EU-Recht verlangt nirgends ein öffentliches Anlagenregister, die
Transparenzpflichten setzen bei 1 MW an, und die hochwertigen Datensätze der Open-Data-Richtlinie
verpflichten nur zur Veröffentlichung dessen, was ohnehin geführt wird.

Drei Wege, die es gibt, und was sie taugen:

1. **Eurostat `nrg_inf_epcrw` für einen Ländervergleich.** Die einzige Quelle, die die Frage „wie
   viel davon sind Kleinanlagen" überhaupt beantwortet, kommerziell frei nutzbar, 42 Länder. Als
   Achse taugt `< 30 kW` (in allen 42 Ländern gemeldet, Summe geht auf); die Feinklassen
   `< 10 kW` und `roof top` **nicht** — dort sind Nullen keine Nullen. Das ist kein Atlas, aber
   eine Geschichte, die sonst kaum jemand zeigt.
2. **JRC DBSM R2025 für die Dachfläche.** Es beantwortet nicht „wo stehen Anlagen", sondern „was
   ginge hier" — und damit ausgerechnet die eine Angabe, die unserem Rechner fehlt und die 36 %
   der Anfrageformulare von Fachbetrieben abfragen: die Dachfläche in Quadratmetern, gebäudescharf
   für die EU-27. Vor jeder Nutzung ist der Lizenzwiderspruch CC BY gegen ODbL zu klären, und
   52,9 GB allein für Deutschland sind kein Nebenbei-Import.
3. **Nationale Register einzeln.** Der einzige Weg zu echtem Bestand. Das ist eine eigene
   Recherche und ein eigenes Projekt.

**Eine Warnung, die bleibt:** Wenn je eine Zahl aus DBSM, Hotmaps oder einem
Satelliten-Datensatz auf eine Seite soll, dann **nie** als „installierte Leistung" und nie in
einer Kachel neben unseren MaStR-Werten. Das sind Potenzial- und Modellwerte mit Annahmen darin
(DBSM: 25 % der Dachfläche nutzbar). Die Verwechslung von Potenzial und Bestand wäre genau die
Fehlerklasse, gegen die dieses Projekt gebaut ist.
