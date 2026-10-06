# Vier Länder am deutschen Maßstab: übrige Technologien, Historie, PV-Aufteilung, Einwohner

**Erhebung am 23.09.2026.** Alle Zahlen in diesem Dokument sind an diesem Tag selbst
gemessen — Dateien heruntergeladen, Zeilen gezählt, Summen gebildet. Jede Aussage ist als
`GEPRÜFT` (selbst aufgerufen) oder `UNGEPRÜFT` markiert. Ein gescheiterter Abruf steht mit
Grund da und ist **kein** Beleg für Nicht-Existenz.

**Der Maßstab** ist, was die deutschen Gemeindeseiten heute zeigen: Anlagenzahl und Leistung
je Gemeinde getrennt nach Photovoltaik, Windkraft, Biomasse, Wasserkraft und
Batteriespeicher (kWh und mittlere Größe); die PV aufgeteilt in Dach, Freifläche und
Steckersolar; Zubau je Jahr über die ganze Historie; daraus Leistung je Einwohner, Speicher
je installiertem Kilowatt und Ranglisten.

---

## Gesamtbild

| | Schweiz | Niederlande | Frankreich | Portugal |
|---|---|---|---|---|
| **Photovoltaik** | dieselbe Quelle | dieselbe Quelle | dieselbe Quelle | dieselbe Quelle |
| **Windkraft** | **dieselbe Quelle** | zweite Quelle (RIVM) | **dieselbe Quelle** | zweite Quelle (DGEG) |
| **Wasserkraft** | **dieselbe Quelle** | **nein** | **dieselbe Quelle** | zweite Quelle, nur Mini-Wasserkraft |
| **Biomasse** | **dieselbe Quelle** | **nein** | **dieselbe Quelle** | nur als Eigenverbrauch (winzig) |
| **Batteriespeicher** | **nein** | **nein** (nur national) | **dieselbe Quelle, mit kWh** | zweite Quelle, nur genehmigt |
| **Dach / Freifläche** | **dieselbe Quelle** (3 Klassen) | **dieselbe Quelle** (Dach/Feld) | **nein** | nur grob über Anlagenart |
| **Steckersolar** | praktisch nein (2-kW-Schwelle) | nicht getrennt | nicht getrennt | nicht belegt |
| **Ältestes Jahr** | **1863** (Wasser), PV 1988 | 2012 (statt 2019) | 1897 nominal, belastbar ab ~2000 | 2023 (PV-Bestand), 1991 (Wind) |
| **Einwohner je Gemeinde** | ja, BFS | ja, CBS | ja, INSEE | ja, INE |

Ein Satz je Land, was am meisten fehlt:

- **Schweiz** — der Batteriespeicher; alles andere ist da, taggenau und bis 1863 zurück.
- **Niederlande** — Wasserkraft, Biomasse und Speicher fehlen je Gemeinde vollständig;
  Wind gibt es nur aus einer zweiten Quelle und ohne Inbetriebnahmedatum.
- **Frankreich** — die Dach-/Freiflächen-Trennung, und der Zubau je Jahr bei Kleinanlagen
  (die stecken als Sammelzeile mit einem erfundenen Datum im Register).
- **Portugal** — die Historie: der PV-Bestand je Gemeinde beginnt erst im Januar 2023, und
  die Großwasserkraft trägt im Register keine Leistung.

---

## Schweiz

Grundlage ist der bereits bekannte Bestand *Elektrizitätsproduktionsanlagen* des
Bundesamts für Energie (`ch.bfe.elektrizitaetsproduktionsanlagen`). Für diese Erhebung neu
heruntergeladen (`GEPRÜFT`):
`https://data.geo.admin.ch/ch.bfe.elektrizitaetsproduktionsanlagen/csv/2056/ch.bfe.elektrizitaetsproduktionsanlagen.zip`
— HTTP 200, 19.195.387 Bytes, `ElectricityProductionPlant.csv` 42,9 MB, Dateistand
14.09.2026, 339.499 Zeilen.

### A) Andere Technologien — vier von fünf geschenkt, der Speicher fehlt

Der Bestand führt **alle** Technologien in derselben Datei, mit demselben
Inbetriebnahmedatum und derselben Ortsangabe. Gemessen (`GEPRÜFT`, je Zeile eine Anlage,
Leistung `TotalPower` in kW):

| Technologie | Anlagen | kW gesamt | Orte | ohne Ort | ohne Datum |
|---|---|---|---|---|---|
| Photovoltaik | 337.455 | 8.829.208 | 3.894 | 0 | 0 |
| Wasserkraft | 1.325 | 12.875.806 | 744 | 0 | 0 |
| Biomasse | 434 | 244.859 | 380 | 0 | 0 |
| Erdgas | 188 | 298.739 | 76 | 0 | 0 |
| Windenergie | 64 | 109.677 | 34 | 0 | 0 |
| Abfälle | 28 | 353.820 | 25 | 0 | 0 |
| Kernenergie | 4 | 3.014.600 | 3 | 0 | 0 |
| Erdöl | 1 | 5 | 1 | 0 | 0 |

Der Katalog `SubCategoryCatalogue.csv` hat genau zehn Einträge: Wasserkraft, Photovoltaik,
Windenergie, Biomasse, Geothermie, Kernenergie, Erdöl, Erdgas, Kohle, Abfälle (`GEPRÜFT`,
Datei gelesen). **Eine Speicher-Kategorie gibt es nicht.**

**Pumpspeicher steckt in der Wasserkraft und muss herausgerechnet werden** (`GEPRÜFT`).
Über `PlantCategory`:

| Wasserkraft-Art | Anlagen | kW |
|---|---|---|
| Pumpspeicherkraftwerk | 20 | 6.501.678 |
| Speicherkraftwerk | 97 | 2.655.265 |
| Ausleitkraftwerk | 407 | 2.102.786 |
| Durchlaufkraftwerk | 327 | 1.517.356 |
| Trinkwasserkraftwerk | 410 | 51.944 |
| Dotierwasserkraftwerk | 48 | 42.701 |
| Abwasserkraftwerk | 15 | 4.070 |

Die 6,5 GW Pumpspeicher sind die Hälfte der ausgewiesenen Wasserkraft. Wer sie
mitzählt, zeigt unter „Wasserkraft in dieser Gemeinde" etwas anderes als der deutsche
Atlas — dort ist Pumpspeicher ausdrücklich ausgenommen.

**Batteriespeicher: nein, und auch nicht über eine zweite Quelle.** Drei Wege gegangen
(`GEPRÜFT`):

1. CKAN-Suche auf opendata.swiss: `q=batterie` → 49 Treffer, **alle**
   Materialforschungs-Publikationen (Kathodenmaterialien, Elektrolyte); `q=speicher` → 6
   Treffer (Gasspeicher-Füllstände, Wetterkameras, ein Hydrologie-Modell); `q=stromspeicher`
   → 0 Treffer.
2. Der **eigene Datenkataster des Bundesamts für Energie**
   (`https://raw.githubusercontent.com/SFOE/open_energy_data/master/open_energy_data.md`,
   HTTP 200, 1.508 Zeilen) enthält **keinen einzigen** Eintrag zu Batterie oder
   Stromspeicher. Das ist die Liste, die das BFE selbst über offene Energiedaten führt.
3. Zweiter Weg über eine Websuche: Das BFE erhebt Heimspeicher seit 2015 **als jährliche
   Befragung** (Stand Ende 2023 rund 45.000 Anlagen). Das ist eine Landeszahl, keine
   Gemeindezahl.

**Eine Suchergebnis-Zusammenfassung behauptete, der Bestand enthalte „battery storage
installations that are registered in Pronovo's system". Das ist falsch** — am Katalog
selbst nachgemessen gibt es die Kategorie nicht. Nicht weiterverwenden.

### B) Historie — bis 1863, und das Datum ist taggenau

`BeginningOfOperation` ist bei **allen** 339.499 Zeilen gefüllt, Format `JJJJ-MM-TT`
(`GEPRÜFT`). Anlagen je Jahrzehnt:

| Jahrzehnt | PV | Wasser | Wind | Biomasse | andere |
|---|---|---|---|---|---|
| 1860er | 0 | 1 | 0 | 0 | 0 |
| 1880er | 0 | 3 | 0 | 0 | 0 |
| 1890er | 0 | 13 | 0 | 0 | 0 |
| 1900er | 0 | 33 | 0 | 0 | 0 |
| 1910er | 0 | 8 | 0 | 0 | 0 |
| 1920er | 0 | 21 | 0 | 0 | 0 |
| 1930er | 0 | 15 | 0 | 0 | 0 |
| 1940er | 0 | 46 | 0 | 0 | 0 |
| 1950er | 0 | 43 | 0 | 0 | 0 |
| 1960er | 0 | 66 | 0 | 0 | 3 |
| 1970er | 0 | 35 | 0 | 0 | 5 |
| 1980er | 5 | 63 | 0 | 2 | 13 |
| 1990er | 148 | 178 | 0 | 10 | 47 |
| 2000er | 3.815 | 236 | 13 | 108 | 47 |
| 2010er | 92.884 | 494 | 34 | 208 | 91 |
| 2020er | 240.603 | 70 | 17 | 106 | 15 |

Ältester Eintrag je Technologie (`GEPRÜFT`): Wasserkraft **1863-01-01** (Reiden, 200 kW) ·
Biomasse 1980-08-30 (Gland, 115 kW) · Photovoltaik **1988-07-20** (Gais, 13,8 kW) ·
Windenergie 2000-11-02 (Winterthur, 7 kW).

Leistung je Jahrzehnt (kW):

| Jahrzehnt | PV | Wasser | Wind | Biomasse |
|---|---|---|---|---|
| 1890er | 0 | 63.222 | 0 | 0 |
| 1920er | 0 | 499.590 | 0 | 0 |
| 1950er | 0 | 1.151.936 | 0 | 0 |
| 1960er | 0 | 6.432.740 | 0 | 0 |
| 1970er | 0 | 1.101.914 | 0 | 0 |
| 1990er | 3.457 | 423.280 | 0 | 2.050 |
| 2000er | 66.404 | 224.868 | 8.988 | 62.578 |
| 2010er | 2.406.614 | 506.132 | 62.637 | 121.391 |
| 2020er | 6.352.640 | 1.078.321 | 38.052 | 58.596 |

PV-Zubau je Jahr in kW (`GEPRÜFT`): 2019 = 308.729 · 2020 = 454.071 · 2021 = 570.108 ·
2022 = 780.690 · 2023 = 1.544.793 · 2024 = 1.666.662 · 2025 = 1.113.090 · 2026 bis
Datenstand = 223.226.

**Keine erkennbaren Platzhalter-Daten.** Die Verteilung der Wasserkraft über die Jahrzehnte
folgt der Schweizer Ausbaugeschichte (Spitze in den 1960ern), es gibt keinen Einzeltag mit
auffällig vielen Anlagen. Das unterscheidet die Schweiz von Frankreich (siehe dort).

### C) Aufteilung innerhalb der Photovoltaik — drei Klassen, direkt im Bestand

`PlantCategory` trennt bei PV (`GEPRÜFT`):

| Anlagenkategorie | Anlagen | kW |
|---|---|---|
| Angebaut (auf dem Dach aufgesetzt) | 283.574 | 7.740.506 |
| Integriert (gebäudeintegriert) | 42.205 | 728.863 |
| Freistehend (Freifläche) | **1.405** | **58.053** |
| ohne Angabe | 10.271 | 301.786 |

Die deutsche Dreiteilung Dach / Freifläche / Steckersolar ist damit zu zwei Dritteln
abgedeckt: Dach = angebaut + integriert, Freifläche = freistehend. 10.271 Anlagen (3 %)
tragen keine Angabe.

**Steckersolar: praktisch nicht enthalten.** Die freiwillige Registrierung beginnt bei 2 kW;
nur 397 PV-Anlagen liegen darunter, 30 unter 0,8 kW (`GEPRÜFT`, aus der früheren Erhebung,
in dieser Sitzung nicht neu gemessen — `UNGEPRÜFT` für den heutigen Dateistand).

Zusatz, den kein anderes Land hat: `PlantDetail.csv` führt je Teilanlage **Neigung und
Ausrichtung** (`Inclination`, `Orientation` mit Katalog Nord … Zenit) sowie ein eigenes
Datum und eine eigene Leistung (`GEPRÜFT`, Kopfzeile und Beispielzeilen gelesen).

### D) Einwohner je Gemeinde — ja, aber der Ortsschlüssel ist das Problem

Quelle: Bundesamt für Statistik, PX-Web-Tabelle `px-x-0102020000_201` *Demografische Bilanz
nach institutionellen Gliederungen* (`GEPRÜFT`, HTTP 200 über
`https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-0102020000_201/px-x-0102020000_201.px`).
Jahre **1981–2025**, 2.118 Gemeindezeilen, Merkmal „Bestand am 31. Dezember".
Lizenz `https://opendata.swiss/terms-of-use#terms_by` (`GEPRÜFT`, aus den CKAN-Metadaten der
BFS-Datensätze) — dieselbe Stufe wie das Anlagenregister, kommerziell erlaubt,
Quellenangabe Pflicht.

**Der Haken ist nicht die Bevölkerung, sondern der Ortsschlüssel — und das ist neu
gemessen (`GEPRÜFT`):** Das Feld `Municipality` im Anlagenregister ist **nicht die
politische Gemeinde, sondern die Postort-Bezeichnung.**

- Register: **3.903** verschiedene Werte in `Municipality`.
- BFS: **2.118** Gemeinden.
- Wortgleich in der BFS-Gemeindeliste: **1.669 (43 %)**.
- Anlagen unter einem Namen, der keiner BFS-Gemeinde entspricht: **122.347 (36,0 %)**.
- Beispiele: „Wil SG", „Wetzikon ZH", „Gossau SG" (Kantonszusatz), „Jona" (Ortsteil von
  Rapperswil-Jona), „Blonay" (fusioniert zu Blonay–Saint-Légier).

Wer über den Namen verbindet, legt ein Drittel des Bestands auf die falsche oder auf keine
Gemeinde. Das ist genau die Fehlerklasse, die im deutschen Atlas als BLOCKER geführt wird
(„Der Ortsschlüssel entscheidet, wessen Bestand unter dem Ortsnamen steht") — nur ohne
roten Test, weil es keinen Schlüssel gibt, gegen den man prüfen könnte.

Zwei belastbare Wege, beide gemessen (`GEPRÜFT`):

| Weg | PV | Wasser | Wind | Biomasse |
|---|---|---|---|---|
| **Koordinaten** (`_x`/`_y`, LV95) fehlen bei | 2.387 (0,7 %) | 104 | 5 | 16 |
| **Postleitzahl** (`PostCode`) fehlt bei | **0** | **0** | **0** | **0** |
| Gebäude-ID (`EGID`) fehlt bei | 7.341 (2,2 %) | 763 | 54 | 102 |

Empfehlung: räumlicher Abgleich über die Koordinaten gegen swissBOUNDARIES3D, mit der
Postleitzahl als Rückfallebene (PLZ ist lückenlos, überschreitet aber gelegentlich
Gemeindegrenzen). Die Gebäude-ID wäre der exakteste Weg (über das Gebäude- und
Wohnungsregister, das den Gemeindeschlüssel führt), fehlt aber bei 2,2 % der PV-Anlagen.

---

## Niederlande

Grundlage bleibt das Statistikamt CBS. Lizenz am Original nachgelesen (`GEPRÜFT`,
`https://www.cbs.nl/en-gb/about-us/website/copyright`, HTTP 200), wörtlich:

> „Unless otherwise stated, the content of this website is subject to Creative Commons
> Attribution (CC BY 4.0). This means that the re-use of the content of this site is
> permitted, provided Statistics Netherlands is cited as the source."

### A) Andere Technologien — nur Wind, und nur über eine zweite Quelle

**Im CBS gibt es je Gemeinde ausschließlich Solar.** Der Katalog wurde mit fünf
Titelsuchen durchgegangen (`GEPRÜFT`, OData-Katalog-Schnittstelle):

- `Windenergie` → 3 Tabellen: `71227ned` (nach Achshöhe, national), `70960ned` (**je
  Provinz**, 1990–2024), `70802ned` (eingestellt). **Keine Gemeindeebene.**
- `85004NED` *Hernieuwbare energie; zonnestroom, windenergie, RES-regio* — Regionen
  nachgezählt: 86 Einträge, davon 1 national, 13 Provinzen, 72 RES-Regionen. **Keine
  Gemeinde** (`GEPRÜFT`).
- `Biogas` → **0 Tabellen**. `Waterkracht` → **0**. `Batterij` → **0**. `Windturbines` → **0**.

**Wasserkraft und Biomasse je Gemeinde gibt es im CBS also gar nicht.** Für die
Niederlande ist das weniger schmerzhaft als es klingt — das Land hat kaum Wasserkraft —
aber die Kachel bleibt leer.

**Windkraft über eine zweite Quelle: ja, und sie ist gut.** Datensatz *Windturbines –
vermogen* des RIVM, verteilt über den Nationaal Georegister
(`https://data.overheid.nl/dataset/54341-windturbines---vermogen`). Bezogen über WFS als
GeoJSON (`GEPRÜFT`, HTTP 200, 2.198.370 Bytes):

```
https://data.rivm.nl/geo/alo/wfs?service=WFS&version=2.0.0&request=GetFeature
  &typeName=alo:rivm_20260101_windturbines_vermogen&outputFormat=application/json
```

Gemessen (`GEPRÜFT`):

| Messung | Wert |
|---|---|
| Turbinen in der Datei | 5.357 (davon Belgien 792, Deutschland 302) |
| Niederlande | **4.263 Turbinen, 11.763.797 kW = 11,76 GW** |
| davon an Land | 3.428 Turbinen, 6.341.077 kW |
| davon Binnengewässer | 162 |
| davon auf See | 1.063 |
| Gemeinden mit mindestens einer Landturbine | **171** (von 342) |
| Landturbinen **ohne** Gemeindenamen | **0** |
| Binnengewässer ohne Gemeindenamen | **0** |
| Seeturbinen ohne Gemeindenamen | 671 (100 % — auf See gibt es keine Gemeinde) |

Felder: `gem_naam` (Gemeindename), `prov_naam`, `kw`, `ash` (Nabenhöhe), `diam`,
`wt_type` (Anlagentyp), `x`/`y` (RD-Koordinaten), `ondergrond` (land / binnenwater / zee),
`naam`, `datum`. Lizenz: **Creative Commons Public Domain Mark 1.0**
(`http://creativecommons.org/publicdomain/mark/1.0/deed.nl`, `GEPRÜFT` aus den
CKAN-Metadaten) — freier als CC BY, keine Namensnennungspflicht.

**Was dieser Quelle fehlt: das Inbetriebnahmedatum.** `datum` ist das Datum des
Datenstands (`2026-01-11`), nicht der Inbetriebnahme (`GEPRÜFT`, am Beispielsatz gelesen).
Zubau je Jahr ist daraus nur über die **Jahresstände** ableitbar: es liegen Ebenen für
2022, 2024, 2025 und 2026 vor (`alo:rivm_2022…`, `…20240101…`, `…20250101…`,
`…20260101…`, `GEPRÜFT` aus der Ressourcenliste) — also eine kurze Reihe mit einer Lücke
bei 2023.

**Batteriespeicher: national ja, je Gemeinde nein.** CBS-Tabelle **85929NED** *Grote
batterijen voor opslag van elektriciteit*, ab 2022, jährlich. Sie hat **keine
Regionaldimension** — der Abruf von `/RegioS` antwortete mit **HTTP 404** (`GEPRÜFT`; das
ist hier kein gescheiterter Abruf, sondern die Auskunft, dass die Dimension nicht
existiert). Inhalt: Anzahl Systeme, MW, **MWh**, Bruttoproduktion, Eigenverbrauch,
Ladeeinsatz, aufgeteilt nach Größenklasse. Landeswerte (`GEPRÜFT`): 2022 = 23 Systeme /
132 MW / 157 MWh · 2023 = 40 / 229 / 343 · 2024 = 84 / 350 / 620.

Die Suche nach `batterijopslag` auf data.overheid.nl ergab **0 Treffer** (`GEPRÜFT`).
Heimspeicher kommen in keiner der geprüften Quellen vor.

### B) Historie — die Reihe reicht bis 2012, nicht nur bis 2019

**Das ist der wichtigste Fund für die Niederlande.** Die bekannte Tabelle `85005NED` deckt
2019–2025. Es gibt eine **abgeschlossene Vorgängertabelle** (`GEPRÜFT`, Katalogsuche
`Zonnestroom`):

| Tabelle | Titel | Zeitraum | Status |
|---|---|---|---|
| `85005NED` | Zonnestroom; vermogen en vermogensklasse, bedrijven en woningen, regio | **2019–2025** | laufend, halbjährlich |
| `84783NED` | Zonnestroom; vermogen bedrijven en woningen, regio (indeling 2019) | **2012–2019** | eingestellt |
| `84518NED` | … regio (indeling 2018) | 2012–2018 | eingestellt |
| `84130NED` | … regio 2012–2017 | 2012–2018 | eingestellt |

Dazu sieben Einmal-Tabellen auf **Quartier- und Nachbarschaftsebene** für die Jahre
2016–2022 (`84131NED`, `84517NED`, `84772NED`, `85010NED`, `85447NED`, `85775NED`,
`86044NED`) — nur Wohnungen, aber feiner als die Gemeinde.

**Die beiden Reihen lassen sich ohne Korrektur zusammensetzen.** Im Überlappungsjahr 2019
gegengeprüft (`GEPRÜFT`, beide Tabellen vollständig abgerufen und Gemeinde für Gemeinde
verglichen):

- `84783NED` 2019: 2.100 Zeilen, 358 Gemeinden · `85005NED` 2019: 4.068 Zeilen, 361 Gemeinden
- gemeinsame Gemeinden: **356**
- Gemeinden mit mehr als 2 % Abweichung im kWp-Wert: **0**
- Summe über die gemeinsamen Gemeinden: alt **7.225.864 kWp**, neu **7.225.864 kWp** —
  **zeichengleich**

Damit reicht die niederländische Gemeindereihe von **2012 bis 2025, also 14 Jahre**.
Zur Größenordnung, national (`GEPRÜFT`): 2012 = 80.648 Anlagen / 287.476 kWp, 2019 =
1.062.265 / 7.225.864 kWp, 2025 = 3.313.355 / 29.430.000 kWp.

**Ein Vorbehalt bleibt:** `84783NED` steht in der Gemeindeeinteilung von **2019**, die
laufende Tabelle in der jeweils aktuellen. Über 14 Jahre sind in den Niederlanden viele
Gemeinden fusioniert; wer die Reihe je Ort zeichnet, braucht eine Umschlüsselung — dieselbe
Aufgabe, die im deutschen Atlas `lib/ags-nachfolger.ts` löst.

### C) Aufteilung innerhalb der Photovoltaik — Dach gegen Feld ist da, aber lückenhaft

Die Dimension `SectorEnVermogensklasse` in `85005NED` hat neun Kategorien (`GEPRÜFT`,
vollständig abgerufen):

`E007161` alle Wirtschaft + Wohnungen · `E007037` Wohnungen · `T001081` alle
Wirtschaftszweige · `301000` Landwirtschaft · `346600` Energieversorgung · `A050176`
**Paneelleistung klein (bis 15 kWp)** · `A050177` **groß (über 15 kWp)** · `A050178`
**groß auf dem Feld** · `A050179` **groß auf dem Dach**.

Gemessen für 2025 (`GEPRÜFT`, alle Zeilen der Periode abgerufen und summiert):

| Kategorie | national, Anlagen | national, GWp | Summe der Gemeindezeilen, GWp | Fehlbetrag |
|---|---|---|---|---|
| alle + Wohnungen | 3.313.355 | 29,43 | 29,43 | **0,00** |
| Wohnungen | 3.041.895 | 12,09 | 12,09 | **0,00** |
| klein ≤ 15 kWp | 3.209.643 | 12,64 | 12,64 | **0,00** |
| groß > 15 kWp | 103.712 | 16,79 | 16,79 | **0,00** |
| **groß auf dem Feld** | 1.018 | 6,22 | **5,12** | **−1,10 (−18 %)** |
| **groß auf dem Dach** | 102.694 | 10,56 | **7,06** | **−3,51 (−33 %)** |

**National geht die Aufteilung exakt auf** (6,22 + 10,56 = 16,78 ≈ groß 16,79). **Auf
Gemeindeebene nicht** — CBS unterdrückt dort Zellen aus Datenschutzgründen, und es fehlt
ein Drittel der Dachleistung und ein Fünftel der Freiflächenleistung. Wer die Trennung auf
einer Ortsseite zeigt, muss den Nenner dazuschreiben oder sie bei zu großer Lücke
unterdrücken; die Summe der beiden Klassen ist **nicht** die Gesamtleistung des Orts.

Die Klassen `klein ≤ 15 kWp` und `Wohnungen` sind dagegen **lückenlos** je Gemeinde. Für
„Dach von Privathaushalten" ist das der belastbare Weg.

**Steckersolar ist nicht getrennt** und in der Klasse „klein" mit enthalten (`UNGEPRÜFT`, ob
steckerfertige Geräte überhaupt in der CBS-Erhebung landen — die Tabelle geht auf
Netzbetreiber- und Förderdaten zurück, das wäre am Metadaten-Volltext zu klären).

Ein nationales Solarpark-Register gibt es nicht: die Suche auf data.overheid.nl nach
`zonneparken` / `zonnepark` / `zonnevelden` liefert 11, 11 und 2 Treffer, **alle
kommunal oder provinziell** (Assen, Zeeland, einzelne Omgevingsverordeningen) — `GEPRÜFT`.

### D) Einwohner je Gemeinde — ja

CBS-Tabelle **37230ned** *Bevolkingsontwikkeling; regio per maand*, **Januar 2002 bis Juli
2026**, monatlich (`GEPRÜFT`). Regionen: 613, davon **543 Gemeinden**, dazu Provinzen,
Landesteile, COROP-Regionen. Merkmal `BevolkingAanHetEindeVanDePeriode_15`.
Gegenprobe (`GEPRÜFT`): Amsterdam (`GM0363`), Juli 2026 → **944.322** Einwohner.
Schlüssel `GM…` ist derselbe wie in den Solartabellen. Lizenz CC BY 4.0 wie oben.

---

## Frankreich

Zwei Bestände bei ODRÉ (Open Data Réseaux Énergies), beide **Licence Ouverte v2.0 (Etalab)**
(`GEPRÜFT`, aus den Metadaten, mit Lizenz-URL
`https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf`).

### A) Andere Technologien — alles in einer Quelle, Batteriespeicher inklusive kWh

Das **nationale Register** heißt vollständig *Registre national des installations de
production **et de stockage** d'électricité* (`registre-national-installation-production-stockage-electricite-agrege`).
Stand 31.07.2026, verarbeitet 10.09.2026, **140.539 Zeilen**. Als CSV exportiert
(`GEPRÜFT`, HTTP 200, 44.599.893 Bytes):

```
https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/
  registre-national-installation-production-stockage-electricite-agrege/exports/csv?delimiter=%3B
```

Gemessen über `nbinstallations` und `puismaxinstallee` (Einheit **kW**, erschlossen aus der
Kernenergie-Summe von 62.990.000 → 62,99 GW gegen die bekannten 61,4 GW des französischen
Kernkraftparks — `GEPRÜFT` als Gegenprobe, die Metadaten nennen die Einheit nicht):

| Filière | Zeilen | Anlagen | kW | Gemeinden |
|---|---|---|---|---|
| Solaire | 131.832 | 1.281.052 | 34.885.163 | 26.765 |
| Hydraulique | 2.757 | 3.051 | 26.024.788 | 1.819 |
| Eolien | 2.446 | 2.580 | 26.949.185 | 1.473 |
| Bioénergies | 1.256 | 1.357 | 3.206.789 | 1.058 |
| Thermique non renouvelable | 1.242 | 1.252 | 19.832.689 | — |
| **Stockage non hydraulique** | **906** | **906** | **2.263.170** | **761** |
| Nucléaire | 57 | 57 | 62.990.000 | — |
| Autre | 37 | 116 | 32.138 | — |
| Energies Marines | 4 | 4 | 243.500 | — |
| Géothermie | 2 | 2 | 16.500 | — |

**Der Batteriespeicher ist die beste Speicherquelle im ganzen Ländersatz.** Über
`typestockage` (`GEPRÜFT`):

| typeStockage | Zeilen | kW | `energieStockable` |
|---|---|---|---|
| (leer, also Erzeugung) | 139.693 | 174.469.955 | 800.768 |
| **BATTE** (Batterie) | **830** | **1.960.442** | **2.623.483** |
| V.INE (Schwungrad/Trägheit) | 15 | 13.439 | 8.073 |
| HDRGN (Wasserstoff) | 1 | 87 | 68 |

`energieStockable` ist die speicherbare Energie — bei den Batterien **2.623.483, also
2,62 GWh** (`UNGEPRÜFT`, welche Einheit das Feld führt; kWh ist aus dem Verhältnis zur
Leistung von 1,96 GW plausibel, das ergibt 1,34 Stunden Volllast und damit die typische
Bauform eines Netzspeichers — am Datensatz-Handbuch nachzusehen). Damit ist Frankreich das
einzige der vier Länder, in dem sich **Speicherkapazität je Gemeinde** zeigen ließe, also
genau die Größe, die im deutschen Atlas am stärksten wächst.

Technologie-Aufschlüsselung, gemessen (`GEPRÜFT`, Auszug):

- **Eolien**: Terrestre 2.403 Zeilen / 24.471.735 kW · En mer posé 13 / 2.261.000 ·
  En mer flottant 4 / 35.200.
- **Hydraulique**: Fil de l'eau 2.306 / 7.849.063 · Lac 107 / 8.803.325 · Eclusée 177 /
  3.750.278 · **Pompage turbinage 34 / 5.060.445** (Pumpspeicher separat ausweisbar) ·
  Hydrolien fluvial 45 / 22.279.
- **Bioénergies**: acht Technologien, größte Posten Cogénération à combustion (518 Zeilen)
  und Turbine à vapeur (50 Zeilen / 684.516 kW).
- **Stockage**: Batterie 893 / 2.213.552 kW.

### B) Historie — nominal bis 1897, belastbar erst ab etwa 2000

`datemiseenservice` ist in **140.313 von 140.539 Zeilen (99,8 %)** gefüllt, Format
`TT/MM/JJJJ` (`GEPRÜFT`). Anlagen je Jahrzehnt:

| Jahrzehnt | Solaire | Eolien | Hydraulique | Bioénergies | Stockage |
|---|---|---|---|---|---|
| 1890er | 0 | 0 | 1 | 0 | 0 |
| 1900er | **195** | 0 | 19 | 0 | 0 |
| 1910er | **1.036** | 0 | 1 | 0 | 0 |
| 1920er–1940er | 0 | 0 | 5 | 0 | 0 |
| 1950er | 0 | 0 | 38 | 3 | 0 |
| 1960er | 0 | 0 | 23 | 1 | 0 |
| 1970er | 0 | 0 | 17 | 2 | 0 |
| 1980er | 0 | 0 | 74 | 2 | 0 |
| 1990er | 221 | 1 | 991 | 31 | 0 |
| 2000er | 875.589 | 599 | 552 | 125 | 0 |
| 2010er | 329.455 | 1.187 | 1.002 | 750 | 6 |
| 2020er | 74.542 | 768 | 249 | 430 | 895 |
| ohne Datum | 14 | 25 | 79 | 13 | 5 |

Ältester Eintrag (`GEPRÜFT`): Hydraulique **1897-03-21** (Labergement-Sainte-Marie,
400 kW) · Eolien 1998-10-23 (Camiers, 4.800 kW) · Bioénergies 1953-01-01 (Le
Lardin-Saint-Lazare) · Stockage 2015-05-01 (Toulouse, 990 kW, Batterie).

**Die Historie ist von Platzhalter-Daten verunreinigt, und das ist gemessen, nicht
vermutet** (`GEPRÜFT`):

- Die 1.231 Solaranlagen vor 1995 hängen an **genau zwei Tagen**: `01/01/1919` (1.036
  Anlagen) und `01/01/1900` (195). Photovoltaik gab es 1919 nicht.
- Bei der Wasserkraft sitzen **564 Anlagen auf dem 09.10.1997** und 231 auf dem
  01.05.1990 — Sammeltermine einer Verwaltungsumstellung, keine Inbetriebnahmen. Das
  erklärt auch, warum das Jahrzehnt der 1990er mit 16,95 GW mehr Wasserkraft ausweist als
  die 1950er bis 1970er zusammen, obwohl Frankreichs Talsperren aus jener Zeit stammen.

Folge: **Zubau je Jahr ist für Frankreich ab etwa 2000 belastbar, für Wasserkraft gar
nicht.** Ein Diagramm über die ganze Reihe würde eine Geschichte erzählen, die die Daten
nicht hergeben.

**Der zweite Bruch ist schwerwiegender: Kleinanlagen tragen kein eigenes Datum.**
Gemessen (`GEPRÜFT`):

| Zeilenart | Zeilen | Anlagen | kW |
|---|---|---|---|
| Sammelzeilen (`nbinstallations` > 1) | 33.721 | **1.182.941** | 6.151.904 |
| Einzelzeilen (`nbinstallations` = 1) | 98.111 | 98.111 | 28.733.259 |

Die Sammelzeilen heißen wörtlich **„Agrégation des installations de moins de 36KW"**, haben
ein leeres `regime` und tragen **ein** Datum für alle darin zusammengefassten Anlagen —
Toulouse: 2.276 Anlagen, alle auf dem 03.06.2004; Nîmes: 1.760 auf dem 08.02.2008
(`GEPRÜFT`). Das Datum ist für die Zubau-Rechnung wertlos.

Damit gilt: **Zubau je Jahr geht in Frankreich nur für Anlagen ab 36 kW** — 98.111
Solar-Einzelzeilen, Median 106 kW, 28,7 GW und damit 82 % der Leistung, aber nur 7,7 % der
Anlagen.

**Für die Kleinanlagen gibt es stattdessen eine Jahresstands-Reihe**, und die ist
vollständig: neun Jahrgänge des Datensatzes *Nombre d'installations de production et de
stockage d'électricité de moins de 36kW par IRIS*, alle Licence Ouverte 2.0 (`GEPRÜFT`, je
Jahrgang Zeilenzahl und Summe selbst abgerufen):

| Jahrgang | Zeilen | Anlagen unter 36 kW |
|---|---|---|
| 31.12.2017 | 44.078 | 378.480 |
| 31.12.2018 | 46.075 | 403.585 |
| 31.12.2019 | 48.551 | 430.501 |
| 31.12.2020 | 51.215 | 464.548 |
| 31.12.2021 | 63.204 | 519.781 |
| 31.12.2022 | 62.206 | 586.322 |
| 31.12.2023 | 48.960 | 770.345 |
| 31.12.2024 | 56.162 | 973.970 |
| 31.12.2025 | 68.866 | 1.139.713 |

Die Reihe ist monoton, also ohne Bruch zusammensetzbar: **acht Jahresdifferenzen je
Gemeinde**. Aber die Felder sind knapp — `codeiris`, `codeinseecommune`, `commune`,
`code_insee_epci`, `epci`, `codedepartement`, `departement`, `coderegion`,
**`nbinstallations`**, `region_maj` (`GEPRÜFT`). **Keine Leistung, keine Technologie.** Man
bekommt „wie viele" je Jahr, nicht „wie viele kW"; und nominell sind alle Technologien unter
36 kW enthalten, was praktisch fast nur Photovoltaik ist (`UNGEPRÜFT`, kein Feld trennt es).

### C) Aufteilung innerhalb der Photovoltaik — nein

`technologie` unterscheidet bei Solaire nur Photovoltaïque (128.412 Zeilen), Thermodynamique
(5) und Autre (32) — **kein Dach/Freifläche** (`GEPRÜFT`). Auch `moderaccordement`,
`tensionraccordement` und `regime` tragen diese Information nicht.

Eine nationale Freiflächen-Ebene gibt es nicht. Auf data.gouv.fr gesucht (`GEPRÜFT`):
`centrales photovoltaïques au sol` → 3 Treffer, `parcs photovoltaïques sol` → 4 — **alle
departemental** (Landes, Vosges, Haute-Marne, Charente, Ille-et-Vilaine), und die
Charente-Datei beschreibt ausdrücklich nur „parcs photovoltaïques au sol **autorisés**",
also Genehmigungen, nicht Bestand.

Ableitbar bleibt nur eine Näherung über die Größe: die größten Einzelzeilen sind
zweifelsfrei Freiflächenanlagen (Champvert 100.000 kW, Châteaudun 88.000 kW, `GEPRÜFT`),
aber es gibt keine Schwelle, die Dach und Feld trennt — eine Logistikhalle trägt mehr als
manche Freiflächenanlage. **Steckersolar** ist ebenfalls nicht getrennt.

### D) Einwohner je Gemeinde — ja, und der Schlüssel passt

INSEE, *Populations de référence 2023* (gültig ab 01.01.2026). Heruntergeladen (`GEPRÜFT`,
HTTP 200, 1.032.385 Bytes): `https://www.insee.fr/fr/statistiques/fichier/8680726/ensemble.zip`
→ `donnees_communes.csv`, **34.900 Gemeinden**, Spalten `COM` (INSEE-Schlüssel), `Commune`,
`PMUN` (Gemeindebevölkerung), `PCAP`, `PTOT`. Dazu Dateien für Departements, Kantone,
Arrondissements und Gemeindeteile.

Lizenz am Original nachgelesen (`GEPRÜFT`, `https://www.insee.fr/fr/information/2008466`),
wörtlich:

> „Sauf mention contraire, les informations publiques diffusées sur ce site (données, bases
> de données, publications, fichiers téléchargeables) sont mises à disposition sous la
> Licence Ouverte / Open Licence version 2.0 (Etalab). Cette licence autorise la
> réutilisation libre, **y compris à des fins commerciales**, sous réserve de mentionner la
> source sous la forme « Source : Insee », de mentionner la date de dernière mise à jour des
> données lorsque celle-ci est connue et de ne pas altérer le sens des informations."

Also dieselbe Lizenz wie das Register — kommerziell ausdrücklich erlaubt, Quellenangabe und
**Datumsangabe** Pflicht.

**Join gegengeprüft (`GEPRÜFT`):** 139.525 Registerzeilen tragen einen INSEE-Gemeindecode,
davon **139.337 (99,9 %)** stehen in der INSEE-Bevölkerungsliste. **27.445** der 34.900
französischen Gemeinden haben mindestens eine Anlage im Register.

---

## Portugal

### A) Andere Technologien — zwei Quellen, und die zweite ist ein Genehmigungsregister

**In der bekannten Quelle (E-REDES) gibt es die anderen Technologien nur als
Eigenverbrauch, und das ist ein Rundungsfehler.** Der Datensatz `8-total-upac-mensal`
führt `tipo_de_tecnologia`, gemessen über alle 518.067 Zeilen (`GEPRÜFT`, Facetten
abgerufen):

| tipo_de_tecnologia | Zeilen |
|---|---|
| Solar | 493.174 |
| Não Atribuído | 23.956 |
| Eólica | **570** |
| Biogás | **185** |
| Hídrica | **59** |
| Cogeração não renovável | 44 |
| Fotovoltaica | 32 |
| Biomassa | **24** |
| Cogeração NFER | 2 |
| nan | 21 |

Das sind Eigenverbrauchsanlagen (UPAC), nicht der Kraftwerkspark. Portugals Windparks sind
keine UPAC und stehen dort nicht.

**Der Kraftwerkspark liegt bei der DGEG — und das ist der wichtigste Fund für Portugal.**
Die Generaldirektion für Energie und Geologie veröffentlicht fünf Anlagenregister auf
dados.gov.pt, alle **CC BY** und ausdrücklich als hochwertige Datensätze nach der
EU-Richtlinie über offene Daten gekennzeichnet (`GEPRÜFT`, Beschreibung wörtlich: „Este
conjunto de dados integra os Conjuntos de Dados de Elevado Valor/HVD identificados de
acordo com o Regulamento de Execução n.º 2023/138 da Diretiva (UE) 2019/1024"):

*Centrais Eólicas* · *Centrais Solares* · *Centrais Hídricas* · *Centrais Térmicas* ·
*Centrais de Cogeração*

Abruf über WFS (`GEPRÜFT`, HTTP 200 für vier von fünf):

```
https://servergeo.dgeg.gov.pt/arcgis/services/Visualizadores/<CE|CS|CH|CT>/MapServer/
  WFSServer?service=WFS&version=2.0.0&request=GetFeature
  &typeNames=<CE:Centrais_Eólicas|CS:Centrais_Solares|CH:Centrais_Hídricas|CT:Centrais_Térmicas>
  &outputFormat=GEOJSON
```

*Centrais de Cogeração* antwortete mit **HTTP 400** (`GEPRÜFT` — Abruf gescheitert, der
Typname ist unbekannt; das ist kein Beleg dagegen, dass der Datensatz existiert, er steht in
der DGEG-Liste).

Felder je Anlage (`GEPRÜFT`, Beispielsätze gelesen): `Denominação_Parque`, `Sub-Parque`,
`Proprietário`, `Tipo_Instalação`, `Sub-tipo_Instalação`, `Licença_Produção`,
**`Data_Licença_Produção`**, `Licença_Exploração`, **`Data_Licença_Exploração`**,
`Potência_Geradores__KW_`, **`Potência_Instalada__KVA_`**, `Potência_Ligação__KVA_`,
**`Concelho_s_`**, `Distrito_s_`, bei Wind zusätzlich `Aerogerador`, `Raio_Pá__m_`,
`Área_total_Central__ha_`.

Gemessen (`GEPRÜFT`):

| Layer | Zeilen | eindeutige Vorgänge (`Processo`) | Leistung dedupliziert | Concelhos | ohne Concelho |
|---|---|---|---|---|---|
| CE Wind | 2.890 | 257 | **5,96 GVA** | 118 | 0 |
| CS Solar | 746 | 325 | 9,05 GVA (bzw. 4,00 GW über `Potência_Geradores`) | 147 | 0 |
| CH Wasser | 189 | 159 | 0,58 GVA | 121 | 0 |
| CT Thermisch | 17 | — | 0,25 GVA | 11 | 0 |

**Drei Fallen, alle gemessen:**

1. **Roh summiert ergibt der Windbestand 191,92 GVA** — dreißigmal Portugals wirkliche
   Windleistung. Der Grund: Eine Zeile ist eine Turbinengruppe, und
   `Potência_Instalada__KVA_` trägt in jeder Zeile die Leistung des **ganzen** Parks. Nach
   Entdopplung über `Processo` bleiben 5,96 GVA, was zum bekannten Bestand von rund
   5,6–5,9 GW passt (`GEPRÜFT`). Wer nicht entdoppelt, veröffentlicht eine Zahl, die um
   Faktor 32 falsch ist — und sie sieht im Code völlig normal aus.
2. **Es ist ein Genehmigungsregister, kein Betriebsregister.** Die Beschreibung sagt
   wörtlich „licenciadas **ou em fase de licenciamento**" (`GEPRÜFT`). Filtert man auf eine
   vorliegende Betriebslizenz (`Licença_Exploração = LicExploracao`), bleiben von 257
   Windvorgängen **198 mit 5,02 GVA**, von 325 Solarvorgängen **160 mit 1,86 GVA** — beim
   Solar also nur ein Fünftel der genehmigten Leistung.
3. **Die Großwasserkraft ist enthalten, trägt aber keine Leistung.** `Sub-tipo_Instalação`
   trennt Mini-hidrica (155 Zeilen) von **Grande hidrica (34 Zeilen)**. Summiert ergeben die
   34 großen Werke **135 MVA** — Alto Lindoso (630 MW) und Alto Rabagão stehen dort mit
   **0** (`GEPRÜFT`). Portugals Wasserkraft von rund 7 GW ist aus dieser Quelle **nicht**
   ableitbar; nur die Mini-Wasserkraft ist brauchbar.

**Batteriespeicher: ja, mit Gemeinde — aber ausschließlich genehmigt.** Im Solar-Layer
tragen 30 Zeilen `Tipo_Central = Armazenamento` bzw.
`Sub-tipo_Instalação = Armazenamento` (`GEPRÜFT`): **29 Vorgänge, 1.373 MVA**, verteilt
über Concelhos wie Leiria, Penamacor, Ferreira do Alentejo, Chamusca, Estremoz. **Keiner
dieser 29 hat eine Betriebslizenz** — alle tragen nur `Data_Licença_Produção` (2023–2024).
Und: nur Leistung in kVA, **keine Speicherkapazität in kWh**. Für die deutsche
Speicher-Kachel (kWh und mittlere Batteriegröße) reicht das nicht.

Heimspeicher kommen in keiner geprüften portugiesischen Quelle vor. Die Suche auf
dados.gov.pt nach `armazenamento` ergab 14 Treffer — Talsperren-Programme,
CO₂-Speicherung, landwirtschaftliche Lagerung, **kein Stromspeicher** (`GEPRÜFT`).

### B) Historie — der PV-Bestand beginnt 2023, die Kraftwerke reichen zurück

**Beim Eigenverbrauch gibt es keine älteren Jahrgänge.** Gemessen über die Facette `ano`
in `8-total-upac-mensal` (`GEPRÜFT`): 2023 = 131.530 Zeilen · 2024 = 133.629 · 2025 =
147.527 · 2026 = 105.381. Frühester Monat **2023-01**, jüngster **2026-08**.

Nach Vorgängern gesucht (`GEPRÜFT`, alle 70 Datensätze des E-REDES-Katalogs gelistet):

- `total-de-unidades-de-producao-para-autoconsumo-auxiliar` (278 Zeilen, Stand 02.05.2023)
  hat genau zwei Felder — `concelho` und `cpes` (Zählpunkte). **Keine Historie.**
- `energia_injectada_upac` (20.406 Zeilen) beginnt ebenfalls nicht früher und führt Energie,
  nicht Bestand.
- `26-centrais` (neue UPAC je Gemeinde, 77.930 Zeilen) und `25-plr-producao-renovavel` (neue
  Netzanschlüsse über 1 MW, 253 Zeilen) sind Zubau-Reihen, ebenfalls ohne älteren Jahrgang.

**Bei den DGEG-Kraftwerken reicht die Zeitachse weiter**, über
`Data_Licença_Exploração` bzw. ersatzweise `Data_Licença_Produção` (`GEPRÜFT`):

| Layer | mit Datum | ältestes | jüngstes | Jahrzehnte |
|---|---|---|---|---|
| CE Wind | 2.809 / 2.890 (97 %) | **1991** | 2026 | 1990er 61 · 2000er 1.580 · 2010er 836 · 2020er 332 |
| CS Solar | 711 / 746 (95 %) | **2000** | 2026 | 2000er 21 · 2010er 120 · 2020er 570 |
| CH Wasser | 116 / 189 (61 %) | **1967** | 2025 | 1960er 1 · 1970er 1 · 1990er 48 · 2000er 46 · 2010er 15 · 2020er 5 |
| CT Thermisch | 17 / 17 | 2017 | 2022 | 2010er 15 · 2020er 2 |

**Es ist ein Lizenzdatum, nicht das Inbetriebnahmedatum** — bei Wind liegen Produktions- und
Betriebslizenz teils Jahre auseinander (Beispiel Alto Minho I / São Tomé: Produktionslizenz
29.01.2026, Betriebslizenz leer, `GEPRÜFT`). Als Näherung für „Zubau je Jahr" taugt es, als
Inbetriebnahmedatum nicht.

**Die Azoren und Madeira fehlen bei E-REDES** — dort sind EDA bzw. EEM Netzbetreiber.
Gemessen: E-REDES deckt **278 von 308** Concelhos ab (`GEPRÜFT`); die 30 fehlenden sind
genau die 19 azoreanischen und 11 madeirensischen Gemeinden. Die DGEG-Register betreffen
ausdrücklich „Portugal continental".

### C) Aufteilung innerhalb der Photovoltaik — nur grob

Der E-REDES-Bestand trennt nicht nach Dach und Freifläche, sondern nach
**Leistungsklasse** (`escalao_de_potencia_instalada`: `]0, 4]`, `]4, 20.7]`, `]20.7, 30]`,
`]30, 1000]`, `>1000`) und **Spannungsebene** (`nivel_de_tensao`, `BTN` = Haushalts-
Niederspannung). Das ist ein Näherungsweg — `BTN` plus `]0, 4]` ist praktisch Dach-PV eines
Haushalts —, aber keine Aussage über den Aufstellungsort.

Bei der DGEG trägt der Solar-Layer `Sub-tipo_Instalação` mit den Werten
`Solar fotovoltaico` (639), `UPAC` (91), `SubEstacao` (5), `Aerogerador` (5),
`Armazenamento` (4), `Solar fotovoltaico concentrado` (1) — `GEPRÜFT`. Da das Register nur
lizenzierte Kraftwerke führt, sind die 639 faktisch Freiflächen- und Großanlagen; es gibt
aber **kein Feld, das es sagt.**

**Steckersolar: nicht belegt** (`UNGEPRÜFT`). Erfasst ist, was als UPAC zertifiziert ist und
einen aktiven Vertrag hat; ob steckerfertige Kleinstgeräte darunter fallen, ist aus den
Metadaten nicht zu entscheiden.

### D) Einwohner je Gemeinde — ja, und die Schlüssel passen

INE (Instituto Nacional de Estatística), Indikator **0008273** *População residente (N.º)*,
über dados.gov.pt mit Lizenz **cc-by** (`GEPRÜFT`). Abruf (`GEPRÜFT`, HTTP 200, 4.312.380
Bytes):

```
https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0008273&Dim1=S7A2023&lang=PT
```

Dimensionen: Periode (2011–2023), `Local de residência (NUTS - 2013)`, Geschlecht,
Altersgruppe. Gemessen für 2023: 19.608 Zeilen, davon 17.556 mit siebenstelligem Geocode
(Gemeindeebene über alle Geschlechts- und Altersschnitte), **308 eindeutige
Gemeindeschlüssel** — genau Portugals Zahl der Concelhos (`GEPRÜFT`).

**Join gegengeprüft (`GEPRÜFT`):** Die letzten vier Stellen des INE-Geocodes sind der
DICOFRE-Gemeindeschlüssel und stimmen mit `codconcelho` bei E-REDES überein — **alle 278
E-REDES-Gemeinden** finden sich in der INE-Liste, keine einzige Abweichung.

**Bei den DGEG-Registern ist der Join dagegen ein echtes Problem, und das ist neu
gemessen (`GEPRÜFT`):** `Concelho_s_` ist **keine Gemeinde, sondern eine Liste von
Gemeinden** — eine Anlage kann über mehrere Gemeinden reichen, und das Feld nennt dann alle,
mit **vier verschiedenen Trennzeichen**:

| Layer | Concelho-Namen | wortgleich in der INE-Liste | Beispiele für Nicht-Treffer |
|---|---|---|---|
| CE Wind | 118 | 117 | `Paredes de Coura / Valença` |
| CS Solar | 147 | 126 | `Alcoutim e Tavira`, `Anadia, Águeda, Mortágua`, `Cartaxo; Santarém` |
| CH Wasser | 121 | 89 | `Abrantes, Tomar`, `Arcos de Valdevez, Ponte da Barca`, `Arouca, Cinfães` |

Bei der Wasserkraft betrifft das **ein Viertel** der Einträge. Zerlegen lässt sich das
(Trennzeichen `,` / ` e ` / `;` / `/`) — **aber das Register sagt nicht, welcher Anteil auf
welche Gemeinde fällt.** Wer die Leistung gleichmäßig aufteilt, erfindet eine Zahl; wer sie
der ersten Gemeinde zuschlägt, ebenso. Für eine Ortsseite bleibt nur, die Anlage bei allen
genannten Gemeinden zu **nennen** und keine Leistung zuzurechnen — oder sie aus der
Gemeindesumme herauszuhalten und das sichtbar dranzuschreiben.

---

## Was das für den Atlas bedeutet

**Die Schweiz bleibt die einzige direkte Übertragung.** Vier Technologien, taggenaues
Datum bis 1863, Dach/Freifläche im Bestand, Neigung und Ausrichtung obendrein. Zwei
Arbeiten sind nötig: der Ortsschlüssel muss über Koordinaten hergestellt werden (36 % der
Anlagen stehen unter einem Postortnamen, der keiner Gemeinde entspricht), und die
Speicher-Kachel bleibt leer.

**Frankreich ist die einzige Quelle mit Speicherkapazität je Gemeinde** — 830
Batterie-Einträge, 1,96 GW, 2,62 GWh, mit INSEE-Schlüssel. Dafür ist der Zubau je Jahr bei
den 1,18 Millionen Kleinanlagen nicht aus dem Register, sondern nur aus acht
Jahresdifferenzen der IRIS-Reihe zu bekommen, und zwar ohne Leistung.

**Die Niederlande gewinnen sechs Jahre Historie** (2012 statt 2019, im Überlappungsjahr
zeichengleich) und haben als einziges Land eine amtliche Dach/Feld-Trennung je Gemeinde —
die auf Gemeindeebene aber ein Drittel der Dachleistung unterdrückt. Wasserkraft, Biomasse
und Speicher gibt es je Gemeinde nicht.

**Portugal ist am weitesten vom Maßstab entfernt.** Der PV-Bestand je Gemeinde beginnt im
Januar 2023, also mit weniger Historie als jede andere Quelle hier; die Kraftwerksregister
der DGEG sind ein Genehmigungsbestand mit Mehrfachzeilen, Mehrfach-Gemeinden und einer
Großwasserkraft ohne Leistungsangabe. Wer daraus Gemeindezahlen baut, baut sie aus
Entdopplung, Lizenzfilter und Namenszerlegung — drei Schritte, in denen jeweils eine
falsche Zahl entstehen kann, ohne dass irgendetwas kaputt aussieht.

---

## Offene Punkte

- **Einheit von `energieStockable`** im französischen Register (kWh oder MWh) — aus dem
  Verhältnis zur Leistung ist kWh plausibel, aber nicht belegt. Am Datensatz-Handbuch von
  RTE nachzusehen, **bevor** eine Speicherzahl veröffentlicht wird.
- **Einheit von `TotalPower`** im Schweizer Bestand — kW ist über zwei Gegenproben
  erschlossen, die verlinkte BFE-Fachseite antwortete früher mit HTTP 404. Am
  Interlis-Modell nachzusehen.
- **Steckersolar in den Niederlanden und Portugal** — ob die jeweilige Erhebung
  steckerfertige Geräte überhaupt erfasst, ist in beiden Fällen ungeprüft.
- **Nachmeldeverzug** — bei allen vier Quellen ungeprüft, ob ein jüngster Monat bzw. das
  jüngste Jahr nach dem Datenstand noch nachwächst. Für Portugal (Monatsbestand) und
  Frankreich (Stichtag 31.07.) wäre das vor der ersten Monatsaussage zu messen: denselben
  Monat über zwei Datenstände vergleichen.
- **`Centrais de Cogeração`** (Portugal) — WFS-Abruf mit HTTP 400 gescheitert, Typname
  unbekannt. Der Datensatz existiert in der DGEG-Liste; für Biomasse und Biogas in Portugal
  ist er die naheliegende Quelle und noch nicht gelesen.
- **Niederländische Gemeindefusionen 2012–2025** — die Verlängerung der Solarreihe braucht
  eine Umschlüsselung; ob das CBS eine amtliche Nachfolgetabelle dafür führt, ist nicht
  geprüft.
