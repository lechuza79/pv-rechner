# Anlagenregister in Europa: Nord, Ost und UK

**Frage:** Gibt es in diesen Ländern eine Entsprechung zum deutschen Marktstammdatenregister — ein
öffentlich abrufbares Register von Stromerzeugungsanlagen mit Standortbezug, aus dem sich Gemeinde-
und Regionalseiten mit Anlagenbestand, Leistung und Zubau bauen ließen?

**Länder dieses Dokuments:** Vereinigtes Königreich · Irland · Dänemark · Schweden · Norwegen ·
Finnland · Polen · Tschechien · Slowakei · Ungarn · Rumänien · Griechenland

**Erhebungstag:** 23.09.2026. Jede Aussage trägt ihren Prüfstatus:
- **GEPRÜFT** = die Adresse wurde an diesem Tag selbst aufgerufen, die zitierte Angabe stand dort.
- **UNGEPRÜFT** = nur gelesen oder aus einer Suchantwort übernommen, nicht am Original bestätigt.
- **Abruf gescheitert** = die Quelle existiert möglicherweise, war aber nicht lesbar. Das ist
  ausdrücklich **kein** Beleg für Nichtexistenz; der Grund steht jeweils dabei.

**Zwei Begriffe, die nicht zu verwechseln sind.** Ein *Register* führt die einzelne Anlage mit
Standort. Eine *Statistik* führt Summen je Gebiet. Für Gemeindeseiten genügt die zweite Form, wenn
das Gebiet klein genug ist — aber nur das Register erlaubt Auswertungen, die das Gebiet
unterschreiten (Anlagengrößen, Zubaujahre, Anlagentypen nebeneinander).

---

## Vereinigtes Königreich

**Kurz:** Kein einzelnes Register wie das MaStR, sondern **drei** Quellen nebeneinander, die je eine
Größenklasse abdecken — und keine davon erfasst die private Aufdachanlage mit Standort.

### 1. Register mit Einzelanlagen?

Ja, zwei — beide mit Leistungsschwelle.

**(a) Renewable Energy Planning Database (REPD)**, Department for Energy Security and Net Zero
(DESNZ), <https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract>
— GEPRÜFT 23.09.2026. Einzelprojekte durch das Planungsverfahren, von der Antragstellung bis zur
Stilllegung.

**(b) Embedded Capacity Register (ECR)** der Verteilnetzbetreiber. Ein zusammengeführter
nationaler Datensatz liegt bei Northern Powergrid:
<https://northernpowergrid.opendatasoft.com/explore/dataset/ecr_manual_combine_test/> —
GEPRÜFT 23.09.2026 über die Schnittstelle
`https://northernpowergrid.opendatasoft.com/api/explore/v2.1/catalog/datasets/ecr_manual_combine_test/records`.
Titel laut Metadaten: „National Embedded Capacity Register (ECR)", Beschreibung: „This dataset
combines all the ECR data from each DNO to form a national picture." **25.167 Datensätze** (Zahl aus
`total_count` der Schnittstelle). Jeder Verteilnetzbetreiber führt zusätzlich eigene Datensätze, z. B.
UK Power Networks `ukpn-embedded-capacity-register-1-under-1mw` (4.503 Zeilen) und
`ukpn-embedded-capacity-register` (1.041 Zeilen) — GEPRÜFT 23.09.2026 über
<https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets>.

**(c) Kleinanlagen** erfasst allein das **Microgeneration Certification Scheme (MCS)** über die MCS
Installations Database, veröffentlicht aber nur als Auswertungs-Oberfläche:
<https://mcscertified.com/low-carbon-landscapes/mcs-data-dashboard/> — UNGEPRÜFT (nur über
Suchantwort gelesen, die Oberfläche selbst nicht bedient).

### 2. Granularität und Standortbezug

**REPD:** Einzelanlage. Die Seite nennt ausdrücklich „x/y co-ordinates" und eine interaktive Karte
— GEPRÜFT 23.09.2026. Ob ein Betriebsdatum enthalten ist, geht aus der Veröffentlichungsseite nicht
hervor (UNGEPRÜFT; die Datei selbst wurde nicht geöffnet).

**ECR:** Einzelanlage mit **gekürzter Postleitzahl**. Aus einem selbst abgerufenen Datensatz
(GEPRÜFT 23.09.2026), hier ein Solar-Eintrag im Wortlaut der Felder:

```
"postcode": "W7 3S", "country": "ENGLAND",
"customer_name": "REDACTED", "address_line_1": "REDACTED", "town_city": "REDACTED",
"location_x_coordinate_eastings_where_data_is_held": "Data not available",
"energy_source_1": "Solar", "energy_conversion_technology_1": "Photovoltaic",
"energy_source_energy_conversion_technology_1_registered_capacity_mw": 0.175,
"connection_status": "ACCEPTED TO CONNECT",
"date_connected": "Data not available", "date_accepted": "2026-02-17 00:00:00",
"target_energisation_date": "2027-02-17 00:00:00"
```

Das ist der entscheidende Befund: **Name, Straße und Ort sind mit „REDACTED" geschwärzt, die
Koordinaten stehen auf „Data not available", und die Postleitzahl ist um die letzten beiden Zeichen
gekürzt.** Eine britische Postleitzahl im Format „W7 3SA" identifiziert typischerweise eine Handvoll
Adressen; „W7 3S" ist ein Straßenzug-Bereich. Für eine Zuordnung auf Gemeindeebene reicht das, für
eine Adresse nicht — und genau so ist es gemeint. Ein Inbetriebnahmedatum (`date_connected`) ist
vorgesehen, war im geprüften Datensatz aber nicht gefüllt.

**MCS:** Nach der Beschreibung Auswertung nach Jahr, Ort, Technik und Installationsart, mit
Ranglisten auf Ebene der „local authority" — UNGEPRÜFT.

### 3. Zugang

**REPD:** Voller Download, kostenlos. Auf der Seite angeboten (GEPRÜFT 23.09.2026):
„Renewable Energy Planning Database (REPD): July 2026 (CSV) — 4.85 MB" und dieselbe Ausgabe als
Excel (4.95 MB).

**ECR:** Offene Schnittstelle ohne Schlüssel und ohne Anmeldung, dazu Datei-Export über die
Opendatasoft-Portale — GEPRÜFT 23.09.2026 (die oben zitierten Abrufe liefen ohne jede
Authentifizierung).

**MCS:** Die Auswertungs-Oberfläche ist frei. Alles darüber hinaus ist ein Antrag, und er kann
kosten: „Any data provided that exists beyond The MCS Data Dashboard may incur a charge" —
GEPRÜFT 23.09.2026, <https://mcscertified.com/low-carbon-landscapes/mcs-data-requests/>. Dort steht
außerdem: „we are obliged to limit the data sharing as much as possible to still be able to fulfil
the purposes of the projects in question". **Der Bulk-Zugang zu den Kleinanlagen ist damit nicht
offen, sondern eine Einzelfallentscheidung mit möglicher Rechnung.**

### 4. Lizenz

**REPD:** „All content is available under the Open Government Licence v3.0, except where otherwise
stated" — GEPRÜFT 23.09.2026 auf der Veröffentlichungsseite. Die OGL v3.0 erlaubt ausdrücklich
kommerzielle Nutzung und Weiterverbreitung gegen Quellenangabe.

**ECR — und hier laufen die Netzbetreiber auseinander, was für eine Zusammenführung wichtig ist:**
- Northern Powergrid (der nationale Datensatz): `license = "Northern Powergrid Open Data Licence v1.0"`,
  `license_url = https://northernpowergrid.opendatasoft.com/p/opendatalicence/` — GEPRÜFT
  23.09.2026 aus den Metadaten. **Der Wortlaut der Lizenz selbst ist ungeprüft:** Die Lizenzseite
  lieferte beim Abruf nur Navigation, der Bedingungstext wird erst im Browser nachgeladen (Abruf
  gescheitert, Grund: die Seite rendert erst im Browser). Ob sie kommerzielle Nutzung erlaubt, ist
  damit **offen** und vor einer Verwendung zu klären.
- UK Power Networks: `license = "CC BY 4.0"`, `license_url = https://creativecommons.org/licenses/by/4.0/`
  — GEPRÜFT 23.09.2026 aus den Metadaten. Das ist eindeutig kommerziell nutzbar gegen Namensnennung.
- Der nationale Datensatz führt zusätzlich eine Herkunftsangabe, die mit weitergegeben werden muss
  (GEPRÜFT 23.09.2026): `attributions = ['UKPN', 'SSEN', 'SPEN', 'NGED', 'ENW', 'Office for National
  Statistics licensed under the Open Government Licence v.3.0 Contains OS data © Crown copyright and
  database right [2019-]']`.

**MCS:** Keine Lizenzangabe gefunden — auf der Datenanfrage-Seite stehen keine Nutzungsbedingungen
(GEPRÜFT 23.09.2026, die Seite nennt keine).

### 5. Aktualität

**REPD:** Quartalsweise. Neuester selbst gesehener Stand: Ausgabe **Juli 2026**, Seite zuletzt
geändert am **3. August 2026** — GEPRÜFT 23.09.2026.

**ECR:** `update_frequency = MONTHLY`, letzte Änderung des nationalen Datensatzes
`modified = 2026-09-12T18:06:13Z` — GEPRÜFT 23.09.2026. Die beiden Northern-Powergrid-Teildatensätze
tragen `2026-09-14`, die UKPN-Datensätze ebenfalls `2026-09-14` — GEPRÜFT.

**MCS:** „Data is updated every 24 hours" — UNGEPRÜFT (aus Suchantwort).

### 6. Kleinanlagen

**Nein, nicht mit Standort.** Die Schwellen sind der Kern der Sache:
- REPD: „UK renewable electricity projects over 150kW", vorher „1MW until 2021, at which point it
  was lowered to 150kW" — GEPRÜFT 23.09.2026, wörtlich von der Veröffentlichungsseite.
- ECR: **ab 50 kW** (UNGEPRÜFT, aus der Beschreibung des Branchenverbands übernommen; im geprüften
  Datensatz war der kleinste gesehene Wert 0,175 MW, was die Schwelle nicht belegt).
- Eine 8-kWp-Hausanlage oder ein Steckersolargerät steht damit in **keiner** dieser beiden Quellen.
  Sie sind ausschließlich über MCS erfasst, und von dort kommt kein offener Einzelanlagen-Auszug.

---

## Irland

**Kurz:** Kein Register. Für Wind und Wasser gibt es Einzelanlagen-Dateien, die seit 2022
stillstehen; für Solar gibt es nur eine Auswertung je Grafschaft.

### 1. Register mit Einzelanlagen?

Nein für Solar. Die Sustainable Energy Authority of Ireland (SEAI) veröffentlicht über das nationale
Portal zwei Einzelanlagen-Datensätze, und Solar ist nicht darunter — GEPRÜFT 23.09.2026 über die
Schnittstelle von <https://data.gov.ie> (`package_search`, gefiltert auf die SEAI):
- `wind-farms-in-ireland` („Wind Farms in Ireland")
- `hydro-energy-connections` („Hydro Energy Connections")

Für Solar gibt es das **Renewable electricity county dashboard** der SEAI,
<https://www.seai.ie/renewable-energy/renewable-electricity/about-dashboard> — **Abruf gescheitert,
Grund: HTTP 403** (die Seite wies den Abruf ab). Inhalt daher UNGEPRÜFT: Nach der Suchantwort ist es
eine thematische Karte der Stromerzeugung je Grafschaft, gespeist unter anderem aus Zähldaten des
Marktbetreibers, Daten von ESB Networks und Planungsdaten.

Ein Register der Mikroerzeugung führt ESB Networks über das NC6-Meldeformular
(<https://www.esbnetworks.ie/services/get-connected/renewable-connection/micro-generation>).
**Eine Veröffentlichung daraus wurde nicht gefunden** — die gezielte Suche danach lieferte nur das
Formular selbst (GEPRÜFT 23.09.2026, dass die Suche nichts anderes ergab; das ist kein Beleg, dass es
sie nirgends gibt).

### 2. Granularität und Standortbezug

Der Winddatensatz ist die einzige Datei mit echtem Anlagenbezug, und sie ist selbst angesehen worden
— GEPRÜFT 23.09.2026, Kopfzeile im Wortlaut:

```
Windfarm_Name,DSO_TSO,Connection_Ref,County,Present_Status,Installed_Capacity__MW_,MEC__MW_,
Gate,F110kV_Node_Name,Target_Connection,Date_of_Connection,Year_of_Connection,
Nat_Grid_E__substation_,Nat_Grid_N__substation_,Type
```

Erste Datenzeile: `Bellacorrick Wind Farm,DSO,DG955,Mayo,Connected,,6.45,Pre-Gate,Bellacorick,
01/10/1992,01/10/1992,1992,98670,321420,Wind`.

Also: Grafschaft, Leistung, **Anschlussdatum taggenau und Anschlussjahr**, dazu Koordinaten — aber
die der **Umspannstation**, nicht der Anlage. Das reicht für eine Grafschaftsseite, nicht für eine
Gemeindeseite.

Für Solar: Grafschaftsebene, monatlicher Erzeugungswert in MWh, zusätzlich je Fläche und je
Bevölkerungsdichte — UNGEPRÜFT.

### 3. Zugang

Offen und kostenlos, direkter Dateidownload ohne Anmeldung — GEPRÜFT 23.09.2026:
<https://seaiopendata.blob.core.windows.net/wind/WindFarmsConnectedJune2022.csv> antwortet mit
`HTTP/1.1 200 OK`, `Content-Length: 37429`. Daneben dieselben Daten als Shapefile in zwei
Projektionen. Der Hydro-Datensatz liegt analog unter
`https://seaiopendata.blob.core.windows.net/hydro/Hydro_Connections_Upload_08Feb2022.csv`.

### 4. Lizenz

**Creative Commons Attribution 4.0** für beide SEAI-Datensätze, ausgewiesen im Lizenzfeld des
Portals (`license_title = "Creative Commons Attribution 4.0"`) — GEPRÜFT 23.09.2026. Kommerzielle
Nutzung und Weiterverbreitung sind damit erlaubt, Namensnennung ist Pflicht. Dieselbe Lizenz tragen
die Statistiken der SEAI und des Central Statistics Office auf demselben Portal (GEPRÜFT: 14 Treffer
der Suchabfrage, davon 13 unter CC BY 4.0, einer unter der „Irish Public Sector Information
Licence").

### 5. Aktualität

**Das ist der Haken.** `Last-Modified: Tue, 26 Jul 2022 09:00:08 GMT` für die Winddatei — GEPRÜFT
23.09.2026 direkt aus dem HTTP-Kopf. Der Dateiname sagt dasselbe („June2022"), der Hydro-Datensatz
trägt „08Feb2022". **Beide Einzelanlagen-Datensätze stehen seit über vier Jahren still.** Die
Grafschafts-Auswertung für Solar wird dagegen laut Beschreibung monatlich nachgeführt (UNGEPRÜFT).

### 6. Kleinanlagen

Nein. Der Winddatensatz enthält Windparks, der Hydro-Datensatz Wasserkraft. Aufdach-Photovoltaik
taucht in keiner Einzelanlagen-Datei auf; sie steckt allenfalls in den Grafschafts-Summen. Eine
Leistungsschwelle ist nirgends ausgewiesen (UNGEPRÜFT).

---

## Dänemark

**Kurz:** Das beste Gesamtpaket dieses Länderkreises für Gemeindeseiten — nicht weil es ein
Einzelanlagen-Register für Solar gäbe, sondern weil die **Gemeindezahlen monatlich über eine offene
Schnittstelle unter CC BY 4.0** kommen und Kleinanlagen mitzählen.

### 1. Register mit Einzelanlagen?

Geteilt nach Technik:

**Wind: ja, ein echtes Stammdatenregister.** Energistyrelsen, „Stamdataregister for vindkraftanlæg",
<https://ens.dk/analyser-og-statistik/data-oversigt-over-energisektoren> — GEPRÜFT 23.09.2026, im
Wortlaut der Seite: „Stamdataregisteret er en landsdækkende database, som omfatter alle
elproducerende vindkraftanlæg tilsluttet det danske elsystem." (Das Stammdatenregister ist eine
landesweite Datenbank, die alle stromerzeugenden Windkraftanlagen am dänischen Netz umfasst.)

**Solar: nur teilweise.** Energistyrelsen veröffentlicht Solardaten über eine Kartenanwendung,
<https://www.sologvindinfo.dk/spatialmap>, mit vier Ebenen — UNGEPRÜFT (die Beschreibung stammt von
<https://ens.dk/energikilder/solenergi>, GEPRÜFT 23.09.2026; die Kartenanwendung selbst wurde nicht
bedient):
- „Større solcellesanlæg": **Einzelanlagen über 1 MW** mit „placering, kapacitet og
  nettilslutningsdato" (Lage, Leistung, Netzanschlussdatum)
- „Solcelleanlæg på kommuneniveau": Summen je Gemeinde in drei Klassen — **≤ 10 kW**, 10–1.000 kW,
  ≥ 1.000 kW
- „Solcelleanlæg udvikling pr. år": Gemeindestatistik ab 01.01.2018
- „Historiske solcelleanlæg"

**Alle Techniken je Gemeinde und Monat: ja, über Energinet.** Datensatz `CapacityPerMunicipality`
des Energi Data Service — GEPRÜFT 23.09.2026 durch eigenen Abruf von
`https://api.energidataservice.dk/dataset/CapacityPerMunicipality`. Eine Zeile im Wortlaut:

```json
{"Month":"2026-08-01T00:00:00","MunicipalityNo":"101","CapacityGe100MW":166.0,
 "CapacityLt100MW":173.95,"OffshoreWindCapacity":40.0,"OnshoreWindCapacity":10.65,
 "SolarPowerCapacity":35.96244,"NumberGenerationUnitsGe100MW":1,
 "NumberGenerationUnitsLt100MW":7,"NumberOffshoreWindGenerators":20,
 "NumberOnshoreWindGenerators":12,"NumberSolarPanels":2102}
```

**Das ist genau die Form, die eine Gemeindeseite braucht:** Gemeindenummer, Monat, installierte
Solarleistung in MW und **Anzahl der Solaranlagen**.

### 2. Granularität und Standortbezug

- Energi Data Service: **Gemeinde × Monat**, Schlüssel `MunicipalityNo` (dänische Kommunenummer) —
  GEPRÜFT.
- Wind-Stammdatenregister: Einzelanlage; die Datei wurde heruntergeladen (siehe Punkt 3), ihr
  Feldinhalt aber nicht ausgewertet — Koordinaten und Anschlussdatum sind nach der
  Registerbeschreibung enthalten, das ist hier UNGEPRÜFT.
- Solar über 1 MW: Einzelanlage mit Lage und Netzanschlussdatum — UNGEPRÜFT.

Ein Hinweis der Behörde, der für jede Auswertung zählt (GEPRÜFT 23.09.2026, ens.dk): „større anlæg,
der er beliggende på samme adresse, vises som samlede anlæg" — größere Anlagen an derselben Adresse
werden zusammengefasst dargestellt, weshalb Stückzahlen abweichen können.

### 3. Zugang

**Energi Data Service:** Offene Schnittstelle, kein Schlüssel, kein Konto — GEPRÜFT 23.09.2026 durch
den oben zitierten Abruf. Es gibt eine Ratenbegrenzung: Ein zu schneller zweiter Abruf antwortete
mit `{ "statusCode": 429, "message": "Rate limit is exceeded. Try again in 210 seconds." }`
(GEPRÜFT). Wer regelmäßig abruft, muss das einplanen.

**Wind-Stammdaten:** Direkter Dateidownload, kostenlos — GEPRÜFT 23.09.2026:
- `https://ens.dk/media/8748/download` → `Content-Disposition: attachment; filename="Vinddata (2).xlsx"`
- `https://ens.dk/media/8747/download` → `filename=Parkproduktion.xlsx`
- `https://ens.dk/media/8746/download` → `filename="Historiske vinddata.xlsx"`

Alle drei antworten mit HTTP 200 und dem Excel-Medientyp. **Die früher kursierende Adresse
`ens.dk/sites/ens.dk/files/byggeri/anlaegprodtilnettet.xls` antwortet mit 404** (GEPRÜFT) — sie ist
veraltet und sollte nirgends weiterverwendet werden.

**Solarkarte:** Download über die Tabellenschaltfläche der Kartenanwendung, dazu WFS/WMS über
<https://www.plandata.dk/webservices> — UNGEPRÜFT.

### 4. Lizenz

**Energi Data Service: CC BY 4.0, kommerzielle Nutzung ausdrücklich erlaubt** — GEPRÜFT 23.09.2026,
<https://www.energidataservice.dk/terms-and-conditions>, im Wortlaut:

> „Users may copy, change and distribute data freely, even for commercial purposes."
>
> „Users must give appropriate credit and indicate if data has been changed."
>
> Quellenangabe: „Source: Energinet (www.energidataservice.dk)."
>
> „Data is provided 'as is' and Energinet shall not be liable for content, origin, errors or
> omissions in the data."

Zwei Pflichten folgen daraus und werden gern übersehen: die **Namensnennung** und der Hinweis,
**dass verändert wurde** — und wir würden verändern, sobald wir aggregieren oder ableiten.

**Wind-Stammdatenregister und Solarkarte:** Keine Lizenzangabe gefunden. Die Seite ens.dk nennt keine
(GEPRÜFT 23.09.2026, sie enthält keine Nutzungsbedingungen zu diesen Dateien). Das ist **nicht**
gleichbedeutend mit „frei" und wäre vor einer Nutzung zu klären.

### 5. Aktualität

- Energi Data Service: monatlich, neuester selbst gesehener Stand **August 2026**
  (`"Month":"2026-08-01"`) — GEPRÜFT 23.09.2026.
- Wind-Stammdaten: „Vinddata (ultimo 08 2026) - Uploadet september 2026" laut Seite, die Datei selbst
  trägt `Last-Modified: Tue, 15 Sep 2026 10:21:30 GMT` — beides GEPRÜFT 23.09.2026.
- Vorbehalt der Behörde (GEPRÜFT): „Da netselskaberne indrapporterer bagudrettet til registeret, kan
  der være en tidsforskydning" — weil die Netzgesellschaften rückwirkend melden, kann es eine
  zeitliche Verschiebung zwischen Inbetriebnahme und Erscheinen im Register geben.

### 6. Kleinanlagen

**Ja.** Die Gemeindeebene der Solarkarte führt ausdrücklich eine Klasse **≤ 10 kW** (UNGEPRÜFT), und
die Energinet-Zeile zählt `NumberSolarPanels` ohne erkennbare Untergrenze (GEPRÜFT: für Gemeinde 101
stehen dort 2.102 Solaranlagen bei 35,96 MW, im Mittel also rund 17 kW je Anlage — das geht nur,
wenn Kleinanlagen mitgezählt werden). Über **1 MW** hinaus gibt es zusätzlich die Einzelanlage.
Steckersolargeräte sind nicht gesondert ausgewiesen (UNGEPRÜFT).

---

## Schweden

**Kurz:** Kein Einzelanlagen-Register, aber eine **amtliche Statistik je Gemeinde, Jahr und
Leistungsklasse** samt offener Schnittstelle — für Gemeindeseiten praktisch ausreichend.

### 1. Register mit Einzelanlagen?

Nein. Was es gibt, ist die amtliche Statistik „Nätanslutna solcellsanläggningar" (netzgekoppelte
Solaranlagen), erhoben vom Statistikamt SCB und veröffentlicht in der Statistikdatenbank der
Energiebehörde Energimyndigheten — GEPRÜFT 23.09.2026 über deren Schnittstelle. Zwei Tabellen:

```
EN0123_1.px | Nätanslutna solcellsanläggningar, antal och installerad effekt, från år 2016 -
EN0123_2.px | Nätanslutna solcellsanläggningar, installerad effekt per capita och landareal, fr.o.m. år 2016 -
```

### 2. Granularität und Standortbezug

**Gemeinde × Jahr × Leistungsklasse.** Die Tabellenstruktur wurde selbst ausgelesen — GEPRÜFT
23.09.2026:

| Dimension | Umfang | Ausprägungen |
|---|---|---|
| År (Jahr) | 10 | 2016 … 2025 |
| Region | 312 | `00 Riket`, `01 Stockholms län` … `2584 Kiruna` |
| Effektklass | 4 | `< 20 kW`, `20 kW - 1 000 kW`, `> 1 000 kW`, `Totalt` |
| Kategori | 2 | `Solcellsanläggningar, antal`, `Installerad effekt (MW)` |

Die 312 Regionen umfassen Land, Provinzen (`län`) und die 290 Gemeinden, jeweils mit amtlichem
Code im Schlüssel — der Standortbezug ist damit sauber. **Kein Inbetriebnahmedatum je Anlage**, nur
der Jahresbestand; Zubau ergibt sich als Differenz zweier Jahre.

### 3. Zugang

Offene PxWeb-Schnittstelle, kein Schlüssel — GEPRÜFT 23.09.2026, Einstieg
`https://pxexternal.energimyndigheten.se/api/v1/sv`, Pfad
`…/Energimyndighetens_statistikdatabas/Officiell_energistatistik/Natanslutna_solcellsanlaggningar/EN0123_1.px`.
Kostenlos. Zusätzlich Export in mehreren Formaten über die Oberfläche (UNGEPRÜFT).

### 4. Lizenz

Keine CC-Lizenz, sondern eigene Nutzungsbedingungen unter
<https://www.energimyndigheten.se/statistik/statistik/anvandarvillkor/> — UNGEPRÜFT (Inhalt nur aus
der Suchantwort, die Seite selbst wurde nicht aufgerufen). Danach gilt sinngemäß: freies Kopieren und
Verbreiten der veröffentlichten Statistik, **Quellenangabe „Källa: Energimyndigheten" Pflicht**, und
— das ist die für uns wichtige Klausel — **wer die Statistik bearbeitet, darf Energimyndigheten
nicht mehr als Quelle angeben**, sondern nur noch darauf hinweisen, dass es sich um bearbeitete
Statistik von dort handelt. Der Schnittstellen-Zugang ist ohne gesonderte Erlaubnis erlaubt, unter
denselben Bedingungen.

**Das ist eine ungewöhnliche Konstruktion und vor einer Nutzung im Original nachzulesen**: Sie
verbietet keine Bearbeitung, aber sie verbietet, die bearbeitete Zahl der Behörde zuzuschreiben.

### 5. Aktualität

**Jährlich.** Neuester selbst gesehener Stand: Jahr **2025**, Tabelle zuletzt geändert am
**2026-04-07** (`updated: 2026-04-07T07:56:41`) — GEPRÜFT 23.09.2026. Eine Gemeindeseite auf dieser
Grundlage wäre also immer einige Monate alt und kennt nur ganze Jahre.

### 6. Kleinanlagen

**Ja**, über die Klasse `< 20 kW` — GEPRÜFT 23.09.2026 aus der Tabellenstruktur. Das deckt die
übliche Hausanlage ab. Eine feinere Aufteilung darunter gibt es nicht, Steckersolargeräte sind nicht
getrennt ausgewiesen (UNGEPRÜFT). Erfasst ist, was **netzgekoppelt** ist — der Tabellenname sagt es.

---

## Norwegen

**Kurz:** Gemeindezahlen existieren und sind monatlich aktuell, aber sie stecken in einer
Auswertungs-Oberfläche, und die Nutzungsbedingungen der Behörde **verbieten Veränderung**. Die
offenen Rohdaten daneben sind je Gemeinde nur für den Verbrauch, nicht für die Erzeugung.

### 1. Register mit Einzelanlagen?

Nein. Die Energiebehörde NVE führt eine Solarstatistik auf Basis der Daten der zentralen
Marktdatenplattform Elhub — GEPRÜFT 23.09.2026,
<https://www.nve.no/energi/energisystem/solkraft/oversikt-over-solkraftanlegg-i-norge/>, dort im
Wortlaut: „Data for installert effekt oversendes månedlig fra Elhub" (die Daten zur installierten
Leistung werden monatlich von Elhub übermittelt).

### 2. Granularität und Standortbezug

**Gemeindeebene**, mit Sortierung nach Preisgebiet, Provinz (fylke), Branche und Größe;
Datenhistorie „tilbake til 2015" — GEPRÜFT 23.09.2026. Felder: installierte Leistung in kW und
„estimert produksjon" (geschätzte Erzeugung). **Kein Inbetriebnahmedatum je Anlage.**

Ein Vorbehalt der Behörde, der für jede Ertragsaussage zählt (GEPRÜFT): „Produksjonen fra takmontert
solkraft måles ikke" — die Erzeugung aus Aufdach-Solar wird nicht gemessen, sondern geschätzt. Und
ein Qualitätshinweis: Anlagen werden getrennt betrachtet nach über und unter 20 kW, wobei einzelne
Haushaltsanlagen fälschlich mit 100 kW und mehr eingetragen seien.

### 3. Zugang

**Für die Gemeindezahlen: nur die Oberfläche.** Die Darstellung ist ein interaktives
Auswertungs-Dashboard; ein Dateidownload wird auf der Seite nicht genannt — GEPRÜFT 23.09.2026.

**Für die offenen Rohdaten: Schnittstelle und CSV bei Elhub**, <https://elhub.no/data-og-innsikt/datakatalog/>
— UNGEPRÜFT im Wortlaut, aber die Schnittstelle selbst antwortet (GEPRÜFT 23.09.2026:
`https://api.elhub.no/energy-data/v0/municipalities?dataset=…` liefert wohlgeformte Fehlermeldungen
mit der Liste zulässiger Parameter, existiert also). **Und hier liegt die entscheidende Einschränkung:**
Nach dem Datenkatalog gibt es
- `consumption_per_group_municipality_hour` — **Verbrauch** je Gemeinde, monatlich, CSV
- `production_per_group_mba_hour` — **Erzeugung** je *Preisgebiet* (nicht je Gemeinde), täglich

Eine Erzeugung je Gemeinde ist im offenen Katalog also **nicht** enthalten; drei darauf gerichtete
Abrufversuche wurden mit „Invalid dataset for municipality entity" abgewiesen (GEPRÜFT 23.09.2026).
Die Gemeindezahlen zur Solarleistung gibt es folglich nur bei NVE — in der Oberfläche.

### 4. Lizenz

**Zwei Quellen, zwei sehr verschiedene Antworten — das ist der wichtigste Befund zu Norwegen.**

- **NVE:** „Det er tillatt å bruke data og figurer dersom NVE er angitt som kilde og innholdet
  presenteres uten endringer" — GEPRÜFT 23.09.2026. Übersetzt: Die Nutzung ist erlaubt, **wenn NVE
  als Quelle genannt wird und der Inhalt unverändert dargestellt wird.** Für unseren Fall ist das
  eine Sperre: Eine Gemeindeseite, die aus diesen Zahlen eine eigene Kennzahl rechnet, stellt sie
  nicht unverändert dar.
- **Elhub:** CC BY 4.0, im Wortlaut des Katalogs „kopiere, distribuere og bearbeide dataene, også
  kommersielt, så lenge du viser til Elhub som kilde" (kopieren, verbreiten und **bearbeiten**, auch
  kommerziell, solange Elhub als Quelle genannt wird) — UNGEPRÜFT (aus der Katalogseite gelesen, nicht
  am Lizenztext selbst bestätigt).

Die bearbeitbare Lizenz liegt also auf den Daten, die keine Gemeindeerzeugung enthalten, und die
Gemeindeerzeugung liegt unter der Lizenz, die Bearbeitung ausschließt.

### 5. Aktualität

Monatlich; NVE bezieht die Leistungsdaten monatlich von Elhub — GEPRÜFT 23.09.2026. Ein konkreter
Datenstand wurde nicht gesehen (die Oberfläche wurde nicht bedient), insofern UNGEPRÜFT.

### 6. Kleinanlagen

**Ja, ausdrücklich.** Haushalts-Aufdachanlagen sind enthalten; die Auswertung trennt unter und über
20 kW — GEPRÜFT 23.09.2026. Steckersolargeräte sind nicht ausgewiesen (UNGEPRÜFT).

---

## Finnland

**Kurz:** Das schwächste Land des Nordens für unseren Zweck. Kleinerzeugung wird **je
Netzgesellschaft** geführt, nicht je Gemeinde, und das Anlagenregister greift erst ab 1 MW.

### 1. Register mit Einzelanlagen?

Teilweise. Die Energiebehörde Energiavirasto führt ein **Kraftwerksregister**
(„voimalaitosrekisteri") für größere Einheiten. Nach der Zusammenfassung der Suchantwort ist es als
Excel-Datei veröffentlicht, beruht auf gesetzlichen Meldungen der Betreiber und wird von der Behörde
nicht eigens auf Richtigkeit geprüft — **UNGEPRÜFT**. Ein Abruf der vermuteten Seite
`https://energiavirasto.fi/sahkontuotanto` scheiterte mit **HTTP 404** (GEPRÜFT 23.09.2026, dass
diese Adresse nicht existiert; das sagt nichts über die richtige Adresse).

Für Kleinerzeugung gibt es kein Register, sondern eine jährliche Erhebung bei den
Verteilnetzgesellschaften — UNGEPRÜFT, aus <https://energiavirasto.fi/-/aurinkosahkon-tuotantokapasiteetti-kasvoi-yli-neljanneksen-vuonna-2025>.

### 2. Granularität und Standortbezug

- Kraftwerksregister: Einzelanlage, laut Suchantwort mit Standort- und Gemeindeangabe — UNGEPRÜFT.
- Kleinerzeugung: **je Verteilnetzgesellschaft**, nicht je Gemeinde — UNGEPRÜFT. Das ist der
  entscheidende Unterschied: Ein finnisches Netzgebiet umfasst viele Gemeinden, eine Zuordnung auf
  die Gemeinde ist daraus nicht ableitbar.
- Fingrid veröffentlicht daneben stündliche Summen der Kleinerzeugung nach Erzeugungsart für ganz
  Finnland (Datensätze 267, 362, 205 unter <https://data.fingrid.fi/datasets>) — UNGEPRÜFT im
  Inhalt; ein Abruf von `https://data.fingrid.fi/api/datasets/267` antwortete mit
  `{ "statusCode": 401, "message": "Access denied due to missing subscription key." }`
  (GEPRÜFT 23.09.2026). **Die Schnittstelle verlangt also einen Zugangsschlüssel**, der Zugang ist
  laut Beschreibung dennoch kostenlos (UNGEPRÜFT).

### 3. Zugang

Fingrid: Registrierung für einen Schlüssel, danach kostenlos, Formate JSON, CSV, XLSX, XML —
UNGEPRÜFT bis auf die gemessene 401-Antwort. Energiavirasto: Excel-Datei — UNGEPRÜFT.

### 4. Lizenz

**Nicht ermittelt.** Weder für das Kraftwerksregister noch für die Fingrid-Daten wurde eine
Lizenzaussage im Original gelesen. Ausdrücklich offen.

### 5. Aktualität

Kleinerzeugungs-Statistik jährlich, veröffentlicht „im Frühherbst" nach Prüfung der Meldungen der
Netzgesellschaften — UNGEPRÜFT. Vorläufige Zahlen für **Ende 2025** lagen vor: rund 1.600 MW Solar
gesamt, davon 1.251 MW netzgekoppelte Kleinerzeugung und 326 MW industrieller Maßstab — UNGEPRÜFT.
Fingrid-Kleinerzeugung: täglich aktualisiert mit monatlichem Berechnungsintervall, Rückstand rund
vier Tage — UNGEPRÜFT.

### 6. Kleinanlagen

In der Statistik ja (Kleinerzeugung ist definiert als **unter 1 MW**), im Kraftwerksregister nein
(dieses beginnt bei **über 1 MW**) — UNGEPRÜFT. Eine Aufdachanlage ist also in einer Summe je
Netzgesellschaft enthalten, aber nirgends mit Standort.

---

## Polen

**Kurz:** Für die kleinen Anlagen, die den polnischen Bestand ausmachen, gibt es **kein Register** —
nur Summen je Netzbetreiber und Woiwodschaft. Und das ist eine große Lücke: Über 1,6 Millionen
Mikroanlagen sind einzeln nirgends öffentlich erfasst.

### 1. Register mit Einzelanlagen?

Gestaffelt nach Größe, und die Staffel ist der Punkt:
- **Mikroinstalacje (bis 50 kW):** kein öffentliches Einzelregister. Es gilt keine Konzessions- und
  keine Registrierungspflicht bei der Regulierungsbehörde URE; erfasst werden sie bei den
  Verteilnetzbetreibern, die URE aggregiert melden.
- **Małe instalacje (kleine Anlagen):** Register bei URE („Rejestr wytwórców energii w małej
  instalacji", MIOZE). Die frühere Veröffentlichungsseite im Behörden-Informationsportal verweist
  inzwischen weiter: „Rejestr MIOZE przeniesiony do zakładki Rejestry i wykazy" — das Register wurde
  nach <https://rejestry.ure.gov.pl/> verlagert (GEPRÜFT 23.09.2026,
  <https://bip.ure.gov.pl/bip/rejestry-i-bazy/wytworcy-energii-w-male/2138,Rejestr-wytworcow-energii-w-malej-instalacji.html>,
  Änderungsdatum der Seite 09.07.2026).
- **Konzessionierte Anlagen:** Konzessionsregister und eine interaktive OZE-Karte bei URE,
  <https://www.ure.gov.pl/pl/oze> — UNGEPRÜFT.

### 2. Granularität und Standortbezug

**Das neue Registerportal war nicht auslesbar.** `https://rejestry.ure.gov.pl/` antwortet mit HTTP 200,
liefert aber nur eine leere Hülle mit dem Text „Rejestry i wykazy … Ładowanie…" (Lade…) — die Inhalte
entstehen erst im Browser (GEPRÜFT 23.09.2026). Fünf vermutete Schnittstellen-Adressen
(`/api/rejestry`, `/api/rejestr/mioze`, `/api/slowniki`, `/api/rejestry/lista`, `/api/mioze`)
antworteten jeweils mit **HTTP 404** (GEPRÜFT). **Abruf gescheitert, Grund: Anwendung rendert erst im
Browser, Schnittstelle nicht gefunden.** Feldinhalt und Standorttiefe des MIOZE-Registers sind damit
offen.

Die frühere Fassung wurde als PDF veröffentlicht (z. B.
`https://bip.ure.gov.pl/download/3/13325/RejestrMIOZEbb.pdf`, Stand 19.04.2021) — UNGEPRÜFT.

Zur OZE-Karte: Sie erlaubt nach der Beschreibung Auswertungen „w podziale na województwa i powiaty"
(nach Woiwodschaften und Kreisen) und tabellarische Berichte der installierten Leistung in
konzessionierten Anlagen — UNGEPRÜFT. **Also Kreis, nicht Gemeinde, und nur konzessionierte Anlagen.**

Einzelne Netzbetreiber gehen weiter: Energa-Operator veröffentlicht „Liczba przyłączonych
mikroinstalacji i moc zainstalowana" auf **Kreisebene** (Karte „Mapa powiaty"), Datenstand
**31.08.2026** — UNGEPRÜFT (aus der Seite
<https://energa-operator.pl/raporty-i-liczby/mikroinstalacje_dane> gelesen). Es gibt dort **keine
Downloaddatei**, nur Bilder, und **keine Nutzungsbedingungen**. Das deckt zudem nur das Gebiet
dieses einen Netzbetreibers.

### 3. Zugang

- MIOZE-Register: Weboberfläche, Bulk-Export nicht ermittelbar (siehe oben).
- URE-Berichte zu Mikroanlagen: PDF, z. B. `https://bip.ure.gov.pl/download/3/18172/RaportOZEmikroinstalacjeza2023.pdf`
  — UNGEPRÜFT.
- Nationales Open-Data-Portal <https://dane.gov.pl>: **Die Suche über die Schnittstelle förderte
  keinen einzigen einschlägigen Anlagendatensatz zutage** — GEPRÜFT 23.09.2026, drei Abfragen
  (`mikroinstalacje`, `fotowoltaika`, `Urząd Regulacji Energetyki`) lieferten Verkäuferlisten,
  Wohnungspreise und Ämterverzeichnisse, aber kein Anlagenregister. Das ist ein belastbares
  Negativergebnis für dieses Portal, kein Beleg für die Behördenseiten.

### 4. Lizenz

**Nicht ermittelt** für die URE-Quellen — auf der geprüften BIP-Seite stehen keine
Nutzungsbedingungen (GEPRÜFT 23.09.2026). Die Datensätze auf dane.gov.pl tragen durchweg CC BY 4.0
oder CC0 1.0 (GEPRÜFT aus den Metadaten der Suchtreffer) — nur eben keine, die uns betreffen.

### 5. Aktualität

URE-Berichte jährlich und quartalsweise; zuletzt genannter Stand: **Ende 2025** mit 1.636.673
Mikroanlagen und fast 13,9 GW, davon über 98,5 % Prosumenten und 99,9 % Photovoltaik — UNGEPRÜFT
(aus Suchantwort, nicht am Bericht selbst gelesen).

### 6. Kleinanlagen

**Zahlenmäßig sind sie fast alles, und genau sie fehlen einzeln.** Die Schwelle ist 50 kW: Darunter
(Mikroinstallation) keine Registrierung bei URE, darüber (kleine Anlage) Registerpflicht. Für
Gemeindeseiten heißt das: Der polnische Bestand — 1,6 Millionen Dachanlagen — ist öffentlich nur als
Summe je Netzbetreiber und Verwaltungsgebiet zu haben, nie als Anlage mit Ort.

---

## Tschechien

**Kurz: Der klarste MaStR-Vergleichsfall dieses Länderkreises.** Ein amtlicher Monatsauszug mit
knapp 38.000 einzelnen Erzeugungsstätten, Gemeinde und Postleitzahl an jeder Zeile, unter
Bedingungen, die einer Gemeinfreigabe entsprechen. Die Einschränkung ist die Konzessionspflicht: Was
keine Lizenz braucht, steht nicht drin.

### 1. Register mit Einzelanlagen?

**Ja.** Energetický regulační úřad (ERÚ), Datensatz „Technologická energetická zařízení – výrobny
elektřiny" (Technologische Energieanlagen – Stromerzeugungsanlagen). Gefunden über den nationalen
Katalog <https://data.gov.cz> — GEPRÜFT 23.09.2026 per Abfrage des Datenkatalogs, Herausgeber
`…/orgán-veřejné-moci/70894451` (ERÚ). Downloadadresse:

```
https://eru.gov.cz/sites/default/files/obsah/prilohy/tez-sk-11-2026-09-01.xml
```

Daneben liegen im selben Muster Datensätze für Stromverteilung, Stromspeicher, Gaserzeugung,
Gasverteilung, Gasspeicher, Wärmeerzeugung und Wärmeverteilung (GEPRÜFT, alle elf ERÚ-Datensätze
aufgelistet). Ergänzend gibt es die Suchoberfläche <https://licence.eru.cz/>, die einzelne Betriebs-
stätten mit Gemeinde, Bezirk, Region und elektrischer wie thermischer Leistung zeigt — GEPRÜFT
23.09.2026.

### 2. Granularität und Standortbezug

**Einzelanlage mit Gemeinde, Postleitzahl, Bezirk, Region und Flurstück.** Die Datei wurde
heruntergeladen und ausgewertet — GEPRÜFT 23.09.2026. Ein Datensatz im Wortlaut:

```xml
<PremiseElec>
  <PremiseElecId>01782_T11</PremiseElecId>
  <Name>MVE - Skalský mlýn Těpeře</Name>
  <DateBegin>1900-01-01</DateBegin><DateChange>2005-08-24</DateChange>
  <City>Těpeře - Železný Brod</City><ZipCode>46822</ZipCode>
  <County>Jablonec nad Nisou</County><State>Liberecký</State>
  <TechnicalData><NoOfResources>3</NoOfResources>
    <ElecPremiseTypeId>VE</ElecPremiseTypeId><ElecPremiseTypeDes>vodní</ElecPremiseTypeDes></TechnicalData>
  <PremiseElecOutputsGroup><PremiseElecOutput>
    <OutputElec>0.013</OutputElec><FuelTypeDes>Vodní</FuelTypeDes></PremiseElecOutput>…
  <TEZCadasterGroup><TEZCadaster><CadasterId>796158</CadasterId>
    <CadasterName>Chlístov u Železného Brodu</CadasterName>
    <CadasterNote>757/5, 286, 289/4</CadasterNote></TEZCadaster></TEZCadasterGroup>
</PremiseElec>
```

Eigene Auszählung der gesamten Datei — GEPRÜFT 23.09.2026:

| Größe | Wert |
|---|---|
| Erzeugungsstätten gesamt | **37.958** |
| davon solar | **34.433** |
| Gas/Verbrennung | 1.677 |
| Wasser | 1.605 |
| Wind | 124 |
| Dampf | 108 |
| Kernkraft | 2 |

Leistungsverteilung der Solaranlagen, ebenfalls selbst gerechnet (Summe der `OutputElec` je Stätte)
— GEPRÜFT:

| Klasse | Anzahl |
|---|---|
| < 10 kW | **17.508** |
| 10–50 kW | 11.036 |
| 50–100 kW | 2.236 |
| 100 kW – 1 MW | 3.008 |
| ≥ 1 MW | 645 |

Und die Zubaujahre aus `DateBegin` — GEPRÜFT: 2019: 423 · 2020: 608 · 2021: 559 · 2022: 932 ·
2023: 1.648 · 2024: 1.954 · 2025: 1.837 · 2026 (bis September): 781. **Damit ist eine Zubaukurve je
Gemeinde direkt aus der Datei rechenbar** — dieselbe Auswertung, die unser Atlas aus dem MaStR macht.

### 3. Zugang

**Voller Bulk-Download, kostenlos, ohne Anmeldung** — GEPRÜFT 23.09.2026:
`HTTP/2 200`, `content-length: 56474228` (rund 54 MB), `last-modified: Tue, 01 Sep 2026 09:42:21 GMT`.
Das Schema liegt offen bei <https://licence.eru.cz/xsd/vzor-11-v5.xsd> und im Quellcode-Repositorium
der Behörde (`https://code.gov.cz/energeticky-regulacni-urad/tezy/…/vzor-11-v5.xsd`) — GEPRÜFT aus
dem Katalogeintrag (`conformsTo`).

### 4. Lizenz

**Die günstigste Ausgangslage aller zwölf Länder.** Der Katalogeintrag führt keine klassische Lizenz,
sondern die tschechische Form der Nutzungsbedingungen, und die wurde aufgelöst — GEPRÜFT 23.09.2026:

```
narrowMatch                        = http://publications.europa.eu/resource/authority/licence/CC0
autorské-dílo                      = …/neobsahuje-autorská-díla/
databáze-chráněná-zvláštními-právy = …/není-chráněna-zvláštním-právem-pořizovatele-databáze/
databáze-jako-autorské-dílo        = …/není-autorskoprávně-chráněnou-databází/
osobní-údaje                       = …/neobsahuje-osobní-údaje/
```

Übersetzt erklärt die Behörde damit vier Dinge: Der Datensatz **enthält keine urheberrechtlich
geschützten Werke**, die Datenbank ist **nicht durch das Datenbankherstellerrecht geschützt**, sie
ist **keine urheberrechtlich geschützte Datenbank**, und sie **enthält keine personenbezogenen
Daten**. Der Katalog ordnet das CC0 zu. Kommerzielle Nutzung und Weiterverbreitung sind damit frei;
eine Quellenangabepflicht besteht formal nicht (fachlich würden wir sie trotzdem setzen).

Als Rechtsgrundlage nennt der Eintrag das tschechische Informationsfreiheitsgesetz
(`applicableLegislation = …/sb/1999/106/…/par_5a/odst_1`) — GEPRÜFT.

### 5. Aktualität

**Monatlich.** Neuester selbst gesehener Stand: Datei `tez-sk-11-2026-09-01.xml` mit Serverdatum
**01.09.2026** — GEPRÜFT 23.09.2026. Die Lizenzhalterliste erscheint zusätzlich wöchentlich
(jüngste genannte Ausgabe 18.09.2026, UNGEPRÜFT).

### 6. Kleinanlagen

**Teilweise, und die Grenze ist eine Lizenzpflicht, keine Meldepflicht.** 17.508 Solaranlagen unter
10 kW stehen in der Datei (GEPRÜFT) — Kleinanlagen sind also nicht ausgeschlossen. Aber 34.433
Solaranlagen insgesamt sind erkennbar weniger als der tschechische Dachanlagenbestand; wer keine
Lizenz braucht, taucht nicht auf. **Die genaue Schwelle wurde nicht am Gesetz geprüft und ist hier
ausdrücklich offen** (UNGEPRÜFT) — wer auf dieser Quelle baut, muss sie zuerst klären, sonst hält er
eine Teilmenge für den Bestand.

Zweite Einschränkung, und sie trifft genau die Privatanlage: Seit dem 25.05.2018 lassen sich Daten zu
Lizenzinhabern, die **natürliche Personen** sind, nicht mehr anzeigen — „není možné od 25. 5. 2018
vyhledávat (zobrazovat) u fyzických osob údaje o držitelích licencí" (GEPRÜFT 23.09.2026,
licence.eru.cz). Dass der Bulk-Datensatz gleichzeitig als „ohne personenbezogene Daten" deklariert
ist, passt dazu: Personenbezogenes ist herausgenommen, der Anlagenbezug bleibt.

---

## Slowakei

**Kurz: Kein Register gefunden.** Von allen zwölf Ländern das dünnste Ergebnis.

### 1. Register mit Einzelanlagen?

**Nicht gefunden.** Die gezielte Prüfung der naheliegendsten Kandidatin — der von ÚRSO
veröffentlichten „Zoznam výrobcov elektriny podľa § 3b ods. 6 a 7 zákona č. 309/2009 Z. z."
(Liste der Stromerzeuger nach § 3b) — ergab, dass es sich **nicht** um ein Anlagenverzeichnis
handelt, sondern um eine **Liste von Erzeugern mit Zahlungsrückständen** gegenüber Finanzverwaltung,
Sozial- und Krankenversicherung — GEPRÜFT 23.09.2026,
<https://www.urso.gov.sk/zoznam-vyrobcov-elektriny-podla-3b-ods-6-a-7-zakona-c-3092009-z-z/>.
Jüngste Datei: „Zoznam subjektov s evidovaným nedoplatkom … za august 2026" (65,59 kB, XLSX,
eingestellt am 02.09.2026). Die Seite trägt einen Haftungsausschluss: Die Liste beruhe auf Angaben
Dritter, für deren Richtigkeit die Behörde nicht einstehe.

Das nationale Open-Data-Portal <https://data.slovensko.sk> war nicht auslesbar: Die alte Adresse
`data.gov.sk` leitet dorthin weiter, und die Schnittstelle liefert statt JSON die Hülle der
Weboberfläche — **Abruf gescheitert, Grund: Anwendung rendert erst im Browser** (GEPRÜFT 23.09.2026,
zwei Adressvarianten probiert). Ob dort ein Anlagendatensatz liegt, ist damit **offen**.

### 2.–6.

Nicht beantwortbar, weil keine Quelle gefunden wurde. Was es stattdessen gibt (alles UNGEPRÜFT):
- **OKTE** als Marktbetreiber mit einem neu gestarteten „Energetické dátové centrum" als zentraler
  Datenaustauschplattform, ausgerichtet auf Marktteilnehmer, nicht auf Veröffentlichung.
- **SEPS** als Übertragungsnetzbetreiber mit Systemdaten.
- Registrierungspflichten für „malé zdroje" (kleine Quellen) bis 10,8 kW bei den
  Verteilnetzbetreibern — eine Veröffentlichung daraus wurde nicht gefunden.

**Das ist ein „nicht gefunden", kein „existiert nicht".** Zwei der drei Hauptwege waren technisch
blockiert; eine Nachprüfung mit einem echten Browser wäre der nächste Schritt.

---

## Ungarn

**Kurz:** Es gibt amtliche Jahresdateien zu den Haushalts-Kleinkraftwerken, aber ihre Granularität
konnte nicht belegt werden — die Behördenseite war nicht auslesbar.

### 1. Register mit Einzelanlagen?

Vermutlich nein; belegt ist es nicht. Die Regulierungsbehörde MEKH führt eine eigene
Veröffentlichungsseite „Nem engedélyköteles kiserőművek és háztartási méretű kiserőművek adatai"
(Daten der nicht genehmigungspflichtigen Kleinkraftwerke und der Kleinkraftwerke in
Haushaltsgröße), <https://mekh.hu/nem-engedelykoteles-kiseromuvek-es-haztartasi-meretu-kiseromuvek-adatai>.

**Abruf gescheitert, Grund: Die Seite ist eine im Browser aufgebaute Anwendung.** Drei Versuche —
Seitenabruf, Abruf über vermutete Schnittstellenpfade (`/api/pages?slug=…`, `/api/content/…`) und
`/sitemap.xml` — lieferten jedes Mal dieselbe 18-kB-Hülle mit dem Titel „MEKH" und ohne Inhalt
(GEPRÜFT 23.09.2026, dass genau das zurückkommt). Im Rohtext waren **null** Verweise auf XLSX-, XLS-
oder CSV-Dateien zu finden (GEPRÜFT).

Nach der Suchantwort stellt MEKH dort Jahresdateien im XLSX-Format bereit (2024 mit 185 kB, dazu
2023, 2022, 2021, 2020) — **UNGEPRÜFT**.

### 2. Granularität und Standortbezug

**Offen.** Die Suchantwort deutet auf eine Gliederung nach Komitat (megye) hin, konnte das aber nicht
belegen — UNGEPRÜFT. Ob es eine Gemeindeebene (település) gibt, ist damit **nicht beantwortet**. Das
ist die entscheidende offene Frage für Ungarn.

### 3. Zugang

XLSX-Dateien zum Download auf der Behördenseite, kostenlos — UNGEPRÜFT.

### 4. Lizenz

**Nicht ermittelt.**

### 5. Aktualität

Jahresdateien; zuletzt genannter Stand Ende 2024 mit über 2.692 MW installierter Leistung bei den
Haushalts-Kleinkraftwerken, davon 2.690 MW Solar; rund 300.000 Haushalts-Solaranlagen — alles
UNGEPRÜFT.

### 6. Kleinanlagen

**Ja, sie sind sogar der Gegenstand.** „Háztartási méretű kiserőmű" (HMKE) ist genau die Kategorie
der Haushaltsanlage; die Grenze liegt bei 50 kVA (UNGEPRÜFT, nicht am Gesetz geprüft). Was fehlt, ist
der Nachweis, auf welcher Gebietsebene diese Anlagen ausgewiesen werden.

---

## Rumänien

**Kurz:** Kein Register, aber eine regelmäßige Behördenauswertung der Prosumenten **je Kreis** — für
Kreisseiten brauchbar, für Gemeindeseiten zu grob. Und die Jahresberichtsreihe ist seit 2024 nicht
fortgeschrieben.

### 1. Register mit Einzelanlagen?

Nein. Die Regulierungsbehörde ANRE veröffentlicht Auswertungen, keine Anlagenliste. Auf der
Berichtsseite <https://anre.ro/despre/rapoarte/> stehen drei Prosumenten-Jahresberichte — GEPRÜFT
23.09.2026, im Wortlaut der Verweise:

```
https://anre.ro/wp-content/uploads/2024/05/30.05.2024_Raport-prosumatori_2023_site.pdf
https://anre.ro/wp-content/uploads/2023/05/Raport-prosumatori_2022.pdf
https://anre.ro/wp-content/uploads/2023/03/Raport_prosumatori_2021.pdf
```

Daneben gibt es eine monatliche Reihe „Situatie-prosumatori". Ein Exemplar wurde geprüft —
GEPRÜFT 23.09.2026: `https://anre.ro/wp-content/uploads/2024/11/Situatie-prosumatori_august2024.pdf`
antwortet mit `HTTP/1.1 200 OK`, `Content-Type: application/pdf`, `Content-Length: 221419`,
`Last-Modified: Mon, 04 Nov 2024 13:58:43 GMT`.

### 2. Granularität und Standortbezug

**Kreis (județ).** Der Monatsbericht enthält nach der Beschreibung eine Tabelle mit Kreis, Anzahl der
Prosumenten und installierter Leistung in MW, dazu die monatliche Entwicklung je Verteilnetzbetreiber
— UNGEPRÜFT (das PDF wurde nicht im Volltext gelesen, nur seine Existenz bestätigt). Rumänien hat 41
Kreise plus Bukarest; eine Gemeindeebene gibt es hier nicht, SIRUTA-Codes oder Koordinaten ebenso
wenig. **Kein Inbetriebnahmedatum je Anlage**, nur Monatsstände.

### 3. Zugang

PDF-Dateien zum freien Download, kostenlos — GEPRÜFT 23.09.2026 (siehe HTTP-Antworten oben). **Kein
CSV, keine Schnittstelle.** Wer damit arbeiten will, muss Tabellen aus PDF auslesen — dieselbe Klasse
von Aufwand wie beim KfW-Förderreport, mit demselben Risiko stillschweigend verlorener Zeilen.

Die Verteilnetzbetreiber veröffentlichen teils eigene Übersichten, z. B.
<https://www.distributie-energie.ro/pentru-prosumatori/monitorizare-prosumatori/> — UNGEPRÜFT.

### 4. Lizenz

**Nicht ermittelt.** Auf der geprüften Berichtsseite stand keine Nutzungsbedingung. Offen.

### 5. Aktualität

**Gespalten, und das ist ein Befund für sich.** Die Berichtsseite ist erkennbar aktiv — sie führt
Dateien bis ins Jahr 2026 (GEPRÜFT 23.09.2026, unter anderem
`…/2026/03/Raport-monitorizare-piata-gaze-naturale-luna-ianuarie-2026.pdf`). Die **Prosumenten-
Jahresberichte enden aber mit dem Berichtsjahr 2023**, veröffentlicht am 31.05.2024
(`Last-Modified: Fri, 31 May 2024 08:38:02 GMT`, GEPRÜFT). Die Monatsreihe läuft laut Suchantwort
weiter — zuletzt genannter Stand 31.05.2026 mit 346.194 Prosumenten und 3.897 MW (UNGEPRÜFT); ein
Exemplar aus 2026 wurde **nicht** gefunden: acht geratene Adressen nach dem Muster der 2024er Datei
antworteten sämtlich nicht mit 200 (GEPRÜFT, dass die Rateversuche fehlschlugen — das belegt nur,
dass das Adressmuster anders ist, nicht dass die Berichte fehlen).

### 6. Kleinanlagen

**Ja, sie sind der Gegenstand.** „Prosumator" ist in Rumänien genau der Haushalt oder Betrieb mit
eigener Erzeugung; die Berichte trennen natürliche und juristische Personen (zuletzt genannt:
1.998,80 MW Privatpersonen, 1.898,55 MW juristische Personen — UNGEPRÜFT). Eine Leistungsschwelle
wurde nicht geprüft.

---

## Griechenland

**Kurz:** Ein offener Geodienst mit **einzelnen Photovoltaik-Anlagen als Flächen, mit Gemeinde und
Leistung** — technisch der zweitbeste Fund nach Tschechien. Die Grenze: Es sind
genehmigungspflichtige Anlagen, keine Hausdächer.

### 1. Register mit Einzelanlagen?

**Ja.** Das Geoportal der Regulierungsbehörde (RAE, heute RAAEY) unter <https://geo.rae.gr> stellt
einen offenen Geodatendienst bereit — GEPRÜFT 23.09.2026 durch eigenen Abruf von
`https://geo.rae.gr/geoserver/wfs?request=GetCapabilities&service=WFS&version=2.0.0`
(HTTP 200, 279.530 Byte). Der Dienst führt **174 Ebenen**, darunter für Photovoltaik unter anderem:

```
rae_status:V_SDI_R_PHOTOVOLTAICS_ALL            | Φωτοβολταϊκοί Σταθμοί (Photovoltaik-Anlagen)
rae_status:V_SDI_R_PHOTOVOLTAICS11              | … Άδεια Παραγωγής (Erzeugungsgenehmigung)
rae_status:V_SDI_R_PHOTOVOLTAICS12              | … Άδεια Εγκατάστασης (Errichtungsgenehmigung)
rae_status:V_SDI_R_PHOTOVOLTAICS13              | … Άδεια Λειτουργίας (Betriebsgenehmigung)
rae_status:V_SDI_R_PHOTOVOLTAICS7               | … Αίτηση Σε Αξιολόγηση (Antrag in Prüfung)
```

Dazu dieselbe Staffelung für Wind, Wasser, Biomasse und Speicher.

### 2. Granularität und Standortbezug

**Einzelanlage als Polygon, mit Gemeinde, Regionaleinheit und Region.** Ein Datensatz wurde selbst
abgerufen — GEPRÜFT 23.09.2026,
`…/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=rae_status:V_SDI_R_PHOTOVOLTAICS_ALL&count=1&outputFormat=application/json`:

```
numberMatched = 4890
aa                 = Γ-07392                 (Aktenzeichen)
company            = ΑΓΗΝΩΡ ΑΕ               (Betreiber)
thesh              = ΜΥΛΟΒΟΥΝΙ               (Flurname)
kal_dhmos          = ΛΟΚΡΩΝ,ΟΡΧΟΜΕΝΟΥ        (Gemeinde(n))
kal_dhm_enothta    = ΑΤΑΛΑΝΤΗΣ,ΟΡΧΟΜΕΝΟΥ     (Gemeindebezirke)
kal_perif_enothta  = ΒΟΙΩΤΙΑΣ,ΦΘΙΩΤΙΔΑΣ      (Regionaleinheiten)
kal_perifereia     = ΣΤΕΡΕΑΣ ΕΛΛΑΔΑΣ         (Region)
power_mw           = 19.992
imerominia         = 2019-03-12              (Datum)
katastash_descr    = ΑΠΟΡΡΙΠΤΙΚΗ ΑΠΟΦΑΣΗ     (Status: ablehnende Entscheidung)
geometry           = MultiPolygon [[[415132.48, 4267203.72], …]]
```

**4.890 Photovoltaik-Anlagen** in dieser Ebene (GEPRÜFT). Zwei Dinge sind dabei wichtig: Eine Anlage
kann **mehreren Gemeinden** zugeordnet sein (hier zwei, kommagetrennt) — eine Gemeindesumme braucht
also eine Aufteilungsregel. Und das Feld `katastash_descr` zeigt, dass **auch abgelehnte und
zurückgenommene Anträge** enthalten sind; wer den Bestand will, muss auf die Betriebsgenehmigung
filtern (dafür gibt es die eigene Ebene `…PHOTOVOLTAICS13`).

Ein Inbetriebnahmedatum im engeren Sinn fehlt; es gibt `imerominia` und
`imerominia_ekdosis_adeias` (Datum der Genehmigungserteilung) — GEPRÜFT.

### 3. Zugang

**Offener Normdienst (WFS), kostenlos, ohne Anmeldung, mit GeoJSON-Ausgabe** — GEPRÜFT 23.09.2026.
Der Dienst deklariert das selbst in seinen Fähigkeiten: `Fees: NONE`, `AccessConstraints: NONE`
(GEPRÜFT, aus dem GetCapabilities-Dokument). Über WFS sind auch Shapefile- und andere Ausgaben
möglich (UNGEPRÜFT).

### 4. Lizenz

**Formal: keine Zugangsbeschränkung, aber auch keine positive Lizenzaussage.** `AccessConstraints:
NONE` ist eine Aussage über den Zugang, nicht über die Weiterverwendung — GEPRÜFT 23.09.2026. Eine
Lizenz im eigentlichen Sinn (CC BY, offene Verwaltungslizenz) wurde **nicht gefunden**; das Portal
ist nach der INSPIRE-Richtlinie und dem griechischen Gesetz 3882/2010 aufgebaut (UNGEPRÜFT). Vor
einer kommerziellen Nutzung wäre das zu klären — `NONE` bei den Zugangsbeschränkungen ist ein
starkes Indiz, aber kein Lizenztext.

### 5. Aktualität

**Nicht ermittelt.** Der Dienst nennt in den Fähigkeiten keinen Datenstand, und es wurde kein
Änderungsdatum abgefragt. Der geprüfte Datensatz trägt ein Datum von 2019, das aber zum Vorgang
gehört, nicht zur Aktualisierung. Offen.

### 6. Kleinanlagen

**Nein.** Das Geoportal führt genehmigungspflichtige Erzeugungsanlagen; der geprüfte Datensatz hatte
19,992 MW. Die private Dachanlage läuft in Griechenland über Eigenverbrauchsmodelle
(net metering, net billing) beim Verteilnetzbetreiber DEDDIE/HEDNO. **Eine Veröffentlichung daraus
je Gebiet wurde nicht gefunden** — die gezielte Suche nach monatlichen DEDDIE-Statistiken mit
regionaler Aufteilung lieferte nur Verfahrensinformationen und Formulare (GEPRÜFT 23.09.2026, dass
die Suche nichts anderes ergab; kein Beleg für Nichtexistenz).

---

## Übersicht

| Land | Einzelanlagen? | Standortbezug | Bulk-Download | Lizenz kommerziell OK? | Aktualität | Kleinanlagen drin? |
|---|---|---|---|---|---|---|
| **Vereinigtes Königreich** | ja, ab 50 kW (ECR) bzw. 150 kW (REPD) | gekürzte Postleitzahl (ECR, Adresse geschwärzt); x/y-Koordinaten (REPD) | ja, CSV/XLSX + offene Schnittstelle | REPD ja (OGL v3.0); ECR je Netzbetreiber — UKPN CC BY 4.0, Northern Powergrid eigene Lizenz **ungeprüft** | REPD quartalsweise (Juli 2026); ECR monatlich (12.09.2026) | **nein** — nur über MCS, dort kein offener Auszug, Gebühr möglich |
| **Irland** | nur Wind und Wasser | Grafschaft + Koordinaten der Umspannstation | ja, CSV/Shapefile | ja, CC BY 4.0 | **veraltet**: Wind Juni 2022, Wasser Feb 2022; Solar-Dashboard monatlich | nein |
| **Dänemark** | Wind ja; Solar erst ab 1 MW | Gemeindenummer (Statistik); Lage je Anlage (Wind, Solar > 1 MW) | ja: offene Schnittstelle (Energinet) + XLSX (Wind) | **ja, CC BY 4.0** (Energinet); Wind-/Solarregister ohne Lizenzangabe | monatlich, Stand August/September 2026 | **ja** (Klasse ≤ 10 kW, Anlagenzahl je Gemeinde) |
| **Schweden** | nein | Gemeindecode (290 Gemeinden) | offene PxWeb-Schnittstelle | eigene Bedingungen: Quellenangabe Pflicht, **bei Bearbeitung darf die Behörde nicht mehr als Quelle genannt werden** (ungeprüft) | **jährlich**, Jahr 2025, Tabelle vom 07.04.2026 | **ja** (Klasse < 20 kW) |
| **Norwegen** | nein | Gemeinde | **nein** — Gemeindezahlen nur in der Oberfläche; offene CSV nur für Verbrauch je Gemeinde | NVE: **nein** („unverändert darzustellen"); Elhub CC BY 4.0, aber ohne Erzeugung je Gemeinde | monatlich | ja (Trennung über/unter 20 kW) |
| **Finnland** | ab 1 MW (ungeprüft) | Gemeinde (ungeprüft) | Excel (ungeprüft); Fingrid-Schnittstelle **mit Zugangsschlüssel** | nicht ermittelt | jährlich (Kleinerzeugung), Stand Ende 2025 | in der Statistik ja (< 1 MW), im Register nein — aber nur **je Netzgesellschaft**, nicht je Gemeinde |
| **Polen** | erst ab 50 kW (Register nicht auslesbar) | Kreis (Karte, einzelner Netzbetreiber) | **nein** gefunden | nicht ermittelt | Berichte jährlich/quartalsweise, Stand Ende 2025 | **nein** — 1,6 Mio. Mikroanlagen nur als Summen |
| **Tschechien** | **ja, 37.958 Anlagen** | Gemeinde, PLZ, Bezirk, Region, Flurstück | **ja, XML 54 MB, offen** | **ja — als CC0 eingestuft, ohne Datenbankrecht, ohne Personenbezug** | **monatlich**, Stand 01.09.2026 | teilweise: 17.508 Solaranlagen < 10 kW, aber Lizenzpflicht als Grenze (Schwelle ungeprüft) |
| **Slowakei** | **nicht gefunden** | — | — | — | — | — |
| **Ungarn** | vermutlich nein | **offen** (Komitat? Gemeinde?) | XLSX je Jahr (ungeprüft) | nicht ermittelt | jährlich, Stand Ende 2024 (ungeprüft) | **ja, sie sind der Gegenstand** (HMKE) |
| **Rumänien** | nein | **Kreis** (41 + Bukarest) | nur PDF | nicht ermittelt | Jahresberichte enden 2023; Monatsreihe läuft (Stand ungeprüft) | **ja, Prosumenten sind der Gegenstand** |
| **Griechenland** | **ja, 4.890 PV-Anlagen** | Gemeinde + Polygon-Geometrie | **ja, offener WFS mit GeoJSON** | **offen** — `AccessConstraints: NONE`, aber keine Lizenz gefunden | **nicht ermittelt** | nein (genehmigungspflichtige Anlagen) |

---

## Was daraus folgt

**Für eine Gemeindeseite nach dem Muster unseres Solar-Atlas taugen heute zwei Länder.**
Tschechien liefert ein echtes Einzelanlagen-Register mit Gemeinde, Leistung und Zubaujahr, monatlich,
unter der denkbar offensten Rechtslage. Dänemark liefert kein Register, aber genau die Kennzahlen,
die eine Gemeindeseite trägt — Anlagenzahl und Leistung je Gemeinde und Monat, Kleinanlagen
eingeschlossen, unter CC BY 4.0 über eine offene Schnittstelle.

**Schweden ist der nächstbeste Fall**, aber nur mit Jahreswerten und unter einer Nutzungsbedingung,
die vor jeder Verwendung im Original nachzulesen ist.

**Drei Länder scheitern nicht an den Daten, sondern an der Form:** Norwegen hat die Zahlen und
verbietet ihre Veränderung. Rumänien hat die Zahlen und veröffentlicht sie als PDF. Ungarn hat
vermutlich die Zahlen, und die Behördenseite gibt sie einem Abruf nicht heraus.

**Drei offene Punkte, die eine Fortsetzung zuerst klären sollte:**
1. **Tschechien: Ab welcher Leistung besteht die Lizenzpflicht?** Davon hängt ab, ob die 34.433
   Solaranlagen den Bestand oder eine Teilmenge sind — und das ist der Unterschied zwischen einer
   richtigen und einer falschen Zahl auf jeder Gemeindeseite.
2. **Slowakei und Ungarn mit einem echten Browser nachprüfen.** Beide Male stand kein Befund am Ende,
   sondern eine Anwendung, die einem einfachen Abruf nichts herausgibt.
3. **Griechenland: die Lizenz.** Ein Dienst, der `Fees: NONE` und `AccessConstraints: NONE` meldet,
   ist offen zugänglich — ob er auch weiterverwendbar ist, sagt das nicht.
