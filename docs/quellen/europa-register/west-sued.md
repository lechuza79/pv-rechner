# Anlagenregister in West- und Südeuropa — gibt es ein MaStR-Äquivalent?

**Erhoben am 23.09.2026.** Ländersatz: Niederlande, Belgien (Flandern/Wallonien/Brüssel),
Frankreich, Spanien, Portugal, Italien, Österreich, Schweiz.

**Die Frage:** Gibt es ein öffentlich abrufbares Register von Erzeugungsanlagen mit
Standortbezug, aus dem sich — wie aus dem deutschen Marktstammdatenregister — Gemeinde-
und Regionalseiten mit Anlagenbestand, Leistung und Zubau bauen lassen?

**Prüfstatus:** Jede Aussage ist mit `GEPRÜFT` (am 23.09.2026 selbst abgerufen, mit dem
gemessenen Ergebnis) oder `UNGEPRÜFT` (nur gelesen, nicht am Original nachgesehen)
markiert. Ein fehlgeschlagener Abruf steht als solcher da und ist **kein** Beleg dafür,
dass eine Quelle nicht existiert.

---

## Schweiz — das vollständigste MaStR-Äquivalent im Ländersatz

Einzelanlagen führen auch Flandern und Österreich. Die Schweiz ist der einzige Bestand, der
Einzelanlage **und** Adresse **und** Koordinaten **und** taggenaues Inbetriebnahmedatum
**und** eine ausdrückliche kommerzielle Freigabe zusammen hat.

### 1. Register mit Einzelanlagen?

**Ja, Einzelanlagen.** Herausgeber: Bundesamt für Energie (BFE). Datensatz:
*Elektrizitätsproduktionsanlagen* / `ch.bfe.elektrizitaetsproduktionsanlagen`.

- Datensatzseite: <https://opendata.swiss/de/dataset/elektrizitatsproduktionsanlagen>
  (`GEPRÜFT` — Browser-Abruf gab HTTP 403, die Metadaten kamen über die CKAN-Schnittstelle
  <https://ckan.opendata.swiss/api/3/action/package_show?id=elektrizitatsproduktionsanlagen>,
  HTTP 200)
- Fachseite: <https://www.bfe.admin.ch/elektrizitaetsproduktionsanlagen>

Aus der Datensatzbeschreibung, wörtlich (`GEPRÜFT`):

> „Dieser Datenbestand enthält alle Elektrizitätsproduktionsanlagen, welche im
> Schweizerischen Herkunftsnachweissystem registriert sind. Darunter fallen zum einen alle
> Anlagen mit einer Leistung grösser 30 Kilovoltampere (kVA), sowie Kleinanlagen (grösser
> als 2 Kilowatt), welche freiwillig für die Ausstellung von Herkunftsnachweisen (HKN)
> registriert worden sind. Zum anderen enthält der Datenbestand Anlagen, die durch eine
> Einspeisevergütung, Einmalvergütung, Mehrkostenfinanzierung oder einen
> Investitionsbeitrag gefördert werden (gemäss Art. 19 und 24; EnG). Es sind nur
> Elektrizitätsproduktionsanlagen enthalten, welche in Betrieb sind."

Die Daten stammen aus dem Herkunftsnachweis-Register, das die Pronovo AG betreibt
(`UNGEPRÜFT` — steht so in der Suchergebnis-Zusammenfassung, nicht am Pronovo-Original
nachgelesen; das BFE selbst spricht nur vom „Schweizerischen Herkunftsnachweissystem").

### 2. Granularität

**Einzelanlage, mit voller Adresse und Koordinaten.** `GEPRÜFT` — CSV heruntergeladen und
gelesen. Spaltenkopf von `ElectricityProductionPlant.csv`:

```
xtf_id,Address,PostCode,Municipality,Canton,EGID,BeginningOfOperation,
InitialPower,TotalPower,MainCategory,SubCategory,PlantCategory,_x,_y
```

Beispielzeile:

```
5726,Robbia 2,7741,S. Carlo (Poschiavo),GR,9080323,2024-01-16,38250,38250,maincat_1,subcat_1,plantcat_4,,
```

Gemessen (`GEPRÜFT`, Stand der Datei 14.09.2026):

| Messung | Wert |
|---|---|
| Anlagen gesamt | 339.499 |
| davon Photovoltaik (`subcat_2`) | 337.455 |
| PV-Leistung Median / Max | 12,16 kW / 8.303 kW |
| PV-Summe | 8.829.208 kW ≈ 8,8 GW |
| PV ohne Gemeindeangabe | **0** |
| PV ohne Inbetriebnahmedatum | **0** |
| PV ohne Koordinaten | 2.387 (0,7 %) |

**Zur Einheit von `TotalPower`:** Die Metadaten nennen sie nicht; die verlinkte BFE-Fachseite
antwortete mit **HTTP 404** (`GEPRÜFT` — Abruf gescheitert, Grund 404, das ist kein Beleg
gegen die Existenz einer Dokumentation). Erschlossen ist **kW** aus zwei Gegenproben
(`GEPRÜFT`): Die PV-Summe ergibt 8,83 GW und trifft damit den bekannten Schweizer
PV-Bestand; der größte Wasserkraft-Eintrag in Naters ergibt 350 MW, was zum dortigen
Massa-Kraftwerk passt. **Vor einer produktiven Nutzung am Interlis-Modell nachsehen.**

**Das Inbetriebnahmedatum ist taggenau** (`BeginningOfOperation`, Format `JJJJ-MM-TT`) —
damit ist Zubau je Monat und je Gemeinde direkt rechenbar, ohne Differenzbildung über
Jahresstände. Gemessener PV-Zubau je Jahr: 2022 = 33.763, 2023 = 61.765, 2024 = 57.736,
2025 = 37.174, 2026 bis Datenstand = 7.340 Anlagen.

Zusätzlich liegt `EGID` an, die eidgenössische Gebäudekennung — die Anlage ist also einem
konkreten Gebäude zugeordnet. Eine zweite Datei `PlantDetail.csv` führt je Teilanlage
Datum, Leistung, **Neigung und Ausrichtung** (`Inclination`, `Orientation`) — für einen
Ertragsrechner die interessanteste Spalte im ganzen Ländersatz.

### 3. Zugang

**Voller Bulk-Download, kostenlos, ohne Anmeldung.** `GEPRÜFT` — heruntergeladen:

- CSV (ZIP, 19.195.387 Bytes, `Last-Modified: Mon, 14 Sep 2026 11:42:19 GMT`):
  <https://data.geo.admin.ch/ch.bfe.elektrizitaetsproduktionsanlagen/csv/2056/ch.bfe.elektrizitaetsproduktionsanlagen.zip>
  — entpackt 6 Dateien, `ElectricityProductionPlant.csv` 42,9 MB, `PlantDetail.csv` 23,5 MB,
  dazu vier Katalogdateien (Haupt-/Unterkategorie, Anlagenkategorie, Ausrichtung) viersprachig.
- GeoPackage: `…/gpkg/2056/ch.bfe.elektrizitaetsproduktionsanlagen.gpkg`
- Interlis (ZIP/XTF), WMS, sowie REST-Schnittstelle
  <https://api3.geo.admin.ch/rest/services/api/MapServer/ch.bfe.elektrizitaetsproduktionsanlagen>

### 4. Lizenz

Die Ressourcen tragen im Feld `rights` durchgehend
`https://opendata.swiss/terms-of-use#terms_by` (`GEPRÜFT`, aus den CKAN-Metadaten). Das ist
die Stufe **„Freie Nutzung. Quellenangabe ist Pflicht."** Wörtlich von
<https://opendata.swiss/de/terms-of-use> (`GEPRÜFT`, HTTP 200 über curl; WebFetch gab 403):

> **Freie Nutzung. Quellenangabe ist Pflicht.**
> Sie dürfen diesen Datensatz für nicht kommerzielle Zwecke nutzen.
> Sie dürfen diesen Datensatz für kommerzielle Zwecke nutzen.
> Eine Quellenangabe ist Pflicht (Autor, Titel und Link zum Datensatz).

**Kommerziell ausdrücklich erlaubt, Quellenangabe verpflichtend.** Kein Share-alike, keine
Einschränkung der Weiterverbreitung. Zur Einordnung steht auf derselben Seite (`GEPRÜFT`):

> „In der Schweiz sind Rohdaten oder Datensätze (z. B. Temperaturaufzeichnungen,
> Bevölkerungsstatistiken) in der Regel nicht urheberrechtlich geschützt […]. Aus diesem
> Grund werden Datensätze auf opendata.swiss in der Regel mit Nutzungsbedingungen und nicht
> mit Lizenzen versehen."

### 5. Aktualität

`accrual_periodicity` = `frequency/MONTHLY`, also **monatlich** (`GEPRÜFT`, CKAN-Metadaten).
Neuester selbst gesehener Stand: Datei vom **14.09.2026**, jüngste Inbetriebnahmedaten im
Bestand liegen in 2026 (`GEPRÜFT`).

### 6. Kleinanlagen

**Aufdach-PV von Privathaushalten: ja, vollständig** — der Median von 12,16 kW ist genau
die typische Einfamilienhaus-Anlage, und 28.772 PV-Anlagen liegen zwischen 2 und 5 kW.

**Balkonkraftwerke: praktisch nein.** Die Schwelle der freiwilligen Registrierung liegt bei
2 kW; gemessen tragen nur 397 PV-Anlagen weniger als 2 kW und nur 30 weniger als 0,8 kW
(`GEPRÜFT`). Ein Steckersolargerät taucht hier also nur als Ausnahme auf.

---

## Frankreich — Einzelanlagen ab 36 kW, darunter eine Zeile je Gemeinde

### 1. Register mit Einzelanlagen?

**Ja, oberhalb von 36 kW.** Herausgeber laut Metadaten: **RTE, Enedis, EDF SEI, ELD**
(`GEPRÜFT`). Datensatz: *Registre national des installations de production et de stockage
d'électricité*, Stand 31.07.2026.

- ODRÉ (Open Data Réseaux Énergies):
  <https://odre.opendatasoft.com/explore/dataset/registre-national-installation-production-stockage-electricite-agrege/>
- Spiegelung bei Enedis: <https://opendata.enedis.fr/datasets/registre-national-installation-production-stockage-electricite-agrege-311225>

### 2. Granularität

`GEPRÜFT` — über die Schnittstelle gezählt und Einzelzeilen gelesen:

| Messung (Filière „Solaire") | Wert |
|---|---|
| Zeilen gesamt im Register | 140.539 |
| davon Solar | 131.832 |
| davon **Einzelanlagen** (≥ 36 kW) | 98.110 |
| davon **Aggregat-Zeilen** (< 36 kW) | 33.722 |
| Solarzeilen ohne INSEE-Gemeindeschlüssel | 977 |
| Solarzeilen ohne Inbetriebnahmedatum | 14 |
| Solar-Einzelanlagen mit Inbetriebnahme 2025 | 18.510 |

Standortfelder sind reichlich vorhanden (`GEPRÜFT`): `codeinseecommune`, `commune`,
`codeiris`, `codeepci`, `codedepartement`, `coderegion`. Inbetriebnahme:
`datemiseenservice` plus ein echtes Datumsfeld `datemiseenservice_date`, dazu
`dateraccordement`.

**Die entscheidende Einschränkung** (`GEPRÜFT`, an der Gemeinde Hernicourt / INSEE 62442
nachgesehen): Alle Anlagen unter 36 kW einer Gemeinde stehen in **genau einer** Zeile
namens `Agrégation des installations de moins de 36KW`, mit `nbinstallations` und
Summenleistung:

```
nominstallation  = 'Agrégation des installations de moins de 36KW'
datemiseenservice= '07/10/2009'
nbinstallations  = 14
puismaxinstallee = 49.46
```

Die 33.722 Aggregat-Zeilen verteilen sich auf 33.722 verschiedene Gemeindeschlüssel — also
**eine Zeile je Gemeinde, kein Jahresraster**. Das Datum auf dieser Zeile beschreibt nicht
den Zubau der 14 Anlagen. **Für private Aufdach-PV gibt es damit keinen Zubau nach
Inbetriebnahmejahr aus diesem Datensatz.** Ableitbar ist er nur durch Differenzbildung über
die Jahresschnappschüsse — die existieren, `GEPRÜFT`: ODRÉ führt neben dem laufenden
Datensatz elf weitere, darunter `…-agrege-311218` bis `…-agrege-311225` (Stichtage
31.12.2018 bis 31.12.2025).

Die 36-kW-Schwelle ist regulatorisch, nicht technisch: Nach der Suchergebnis-Zusammenfassung
geht sie auf den Erlass vom 07.07.2016 zurück und die feinste zulässige Gebietsebene ist
IRIS (Art. 179 LTECV) — `UNGEPRÜFT`, der Verordnungstext wurde nicht im Original gelesen.

### 3. Zugang

**Offene API und Bulk-Export, kostenlos, ohne Schlüssel.** `GEPRÜFT` — alle Zählungen oben
liefen über
`https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/registre-national-installation-production-stockage-electricite-agrege/records`
mit HTTP 200.

Der **Vollexport wurde ausgelöst und funktioniert** (`GEPRÜFT`): `/exports/csv` mit
Spaltenauswahl und Filter `filiere='Solaire'` lieferte HTTP 200, **9.318.510 Bytes,
131.833 Zeilen** (Kopfzeile plus 131.832 Datenzeilen — deckungsgleich mit der Zählung über
die Schnittstelle). Weitere Formate: JSON, GeoJSON, Parquet.

Dabei fiel ein Detail auf, das man kennen sollte (`GEPRÜFT`): Der Anlagenname steht bei
einem Teil der Zeilen als `Confidentiel` — die Namen sind teilweise geschwärzt. Für
Gemeindeseiten ist das folgenlos, Standort, Leistung und Datum bleiben vollständig.

### 4. Lizenz

Aus den Datensatz-Metadaten, wörtlich (`GEPRÜFT`):

> `license: "Licence Ouverte v2.0 (Etalab)"`
> `license_url: "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf"`

Der Lizenztext wurde im Original gelesen (`GEPRÜFT` — PDF heruntergeladen, 237.693 Bytes,
und ausgelesen). Wörtlich:

> „Le « Concédant » concède au « Réutilisateur » un droit non exclusif et gratuit de libre
> « Réutilisation » de l'« Information » objet de la présente licence, **à des fins
> commerciales ou non**, dans le monde entier et pour une durée illimitée […]
> de la communiquer, la diffuser, la redistribuer, la publier et la transmettre,
> de l'exploiter à titre commercial, par exemple en la combinant avec d'autres
> informations, ou en l'incluant dans son propre produit ou application.
> **Sous réserve de :** mentionner la paternité de l'« Information » : sa source (au moins
> le nom du « Concédant ») **et la date de dernière mise à jour** de l'« Information »
> réutilisée."

**Kommerziell erlaubt, Weiterverbreitung erlaubt, kein Share-alike.** Die Quellenangabe
muss **Herausgeber UND Datum der letzten Aktualisierung** nennen — das ist strenger als die
üblichen Namensnennungs-Lizenzen und für unsere Quellenzeilen relevant. Die Nennung darf
keinen amtlichen Charakter oder eine Billigung suggerieren.

### 5. Aktualität

Datenstichtag 31.07.2026; `modified` = **10.09.2026 13:22 UTC**, `data_processed` =
10.09.2026 14:01 UTC (`GEPRÜFT`). Ein festes Aktualisierungsintervall nennen die Metadaten
nicht; die Stichtage der Archivdatensätze legen eine mindestens jährliche, faktisch eher
unterjährige Fortschreibung nahe (`UNGEPRÜFT`).

### 6. Kleinanlagen

**Enthalten, aber nur als Gemeindesumme.** Private Aufdachanlagen fallen fast durchweg unter
36 kW und erscheinen damit nie einzeln. Balkonkraftwerke sind in dieser Summe
rechnerisch mit drin, aber nicht unterscheidbar (`GEPRÜFT` in dem Sinne, dass die
Aggregat-Zeile keine Leistungsklassen führt).

---

## Belgien — Flandern

### 1. Register mit Einzelanlagen?

**Ja — eine Zeile je Anlage, nur ohne Adresse.** Herausgeber: **Fluvius**
(Verteilnetzbetreiber für alle flämischen Gemeinden). Zwei Datensätze:

- *Lijst van decentrale productie-installaties gekoppeld aan het distributienet*
  <https://opendata.fluvius.be/explore/dataset/1_20-lijst-van-decentrale-productie-installaties-gekoppeld-aan-het-distributiene/>
- *Lokale productie-installaties per gemeente*
  <https://opendata.fluvius.be/explore/dataset/1_33-lp-open-data-fluvius/>

### 2. Granularität

`GEPRÜFT` — Metadaten und Einzelzeilen über die Schnittstelle gelesen.

**Datensatz 1_20** (1.114.822 Zeilen): Felder `boekjaar_periode`,
**`jaartal_in_dienstname`** (Inbetriebnahme-**Jahr**), `type`, **`postcode`**,
`geinstalleerd_productievermogen_kva`, `spanningsniveau_net`, `counter`. Beispielzeile:

```
{'boekjaar_periode': '2026-07', 'jaartal_in_dienstname': '2025',
 'type': 'Photovoltaic - Photovoltaic', 'postcode': '8900',
 'geinstalleerd_productievermogen_kva': 16.5,
 'spanningsniveau_net': 'Laagspanning', 'counter': 1}
```

**Jede Zeile ist EINE Anlage.** Das war nicht offensichtlich — das Feld `counter` sieht wie
eine Stückzahl aus (die Beispielwerte 1, 3, 5 legen das nahe) und wurde deshalb nachgemessen
(`GEPRÜFT`): Über die PV-Zeilen läuft `counter` von **1 bis 1.112.617 bei genau einer Zeile
je Wert** — es ist eine laufende Nummer, keine Anzahl. Gegenprobe über die Leistung
(`GEPRÜFT`): Die PV-Summe in 1_20 ergibt **7.820.313 kVA**, die Gemeindesummen in 1_33
ergeben **7.869.062 kVA** bei **1.118.046 Anlagen** — beide Datensätze beschreiben denselben
Bestand, und die Zeilenzahl von 1_20 entspricht der Anlagenzahl von 1_33.

**Wer `counter` als Stückzahl aufsummiert, bekommt 617 Milliarden Anlagen.** Das ist der
Fehler, den dieser Datensatz einlädt.

Was gegenüber der Schweiz fehlt: **Adresse, Koordinaten und der Monat** der Inbetriebnahme —
es gibt nur das Jahr und die Postleitzahl. Für Gemeindeseiten mit Bestand *und* Zubau nach
Jahr reicht das vollständig.

Anlagen je Typ (`GEPRÜFT`, Facettenabfrage — Zeilen = Anlagen):

| Typ | Anlagen |
|---|---|
| Photovoltaic - Photovoltaic | 1.110.420 |
| **Plug & Play PV** | **2.196** |
| WKK Aardgas | 871 |
| Windenergie | 569 |
| übrige (Brennstoffzelle, Wasserkraft, Biomasse …) | ~570 |

„Plug & Play PV" ist die flämische Entsprechung zum Balkonkraftwerk — **der einzige
Bestand im Ländersatz, der Steckersolar als eigene Kategorie führt.**

**Es gibt nur EINEN Stichtag, keine Zeitreihe** (`GEPRÜFT`): Die Gruppierung über
`boekjaar_periode` ergibt genau eine Periode, `2026-07-01`. Der Datensatz wird monatlich
ersetzt, nicht fortgeschrieben — wer einen Verlauf braucht, muss die Monatsstände selbst
archivieren. Die Zeitachse steckt stattdessen in `jaartal_in_dienstname`, und die ist
wertvoller: Sie gibt das Inbetriebnahmejahr **je Anlage**, nicht nur den Bestand.

**Datensatz 1_33** (999 Zeilen) ist die fertige Gemeindesicht: `peildatum`, `dnb`,
`hoofdgemeente`, `technologie`, `aantalinstallaties`, `geinstalleerdvermogen_kva` — Bestand
je Gemeinde und Technik, ohne Zeitachse. Gemessen (`GEPRÜFT`): **291 Gemeinden** mit einem
Eintrag für `ZONNE-ENERGIE`, Stichtag 2026, zusammen **1.118.046 Anlagen / 7.869.062 kVA**.

### 3. Zugang

**Offene API und Export, kostenlos.** `GEPRÜFT` — alle Abfragen über
`https://opendata.fluvius.be/api/explore/v2.1/catalog/datasets/…` mit HTTP 200.

### 4. Lizenz

Beide Datensätze tragen `license: "Open data license - FLUVIUS"`,
`license_url: https://opendata.fluvius.be/p/licentieopendatafluvius` (`GEPRÜFT`).

Die Lizenzseite ist eine JavaScript-Seite; der Text steht als JSON im ausgelieferten HTML
und wurde von dort gelesen (`GEPRÜFT`, HTTP 200, 71.083 Bytes). Wörtlich:

> „Deze licentie omvat de voorwaarden voor het hergebruik van datasets opgemaakt door
> Fluvius die als open data gratis ter beschikking worden gesteld."

Zu den eingeräumten Rechten, wörtlich:

> „[…] de informatie verspreiden en herverdelen; de informatie gebruiken om info aan te
> passen, te wijzigen, te extraheren en om te vormen, in het bijzonder om 'gegevens af te
> leiden;' **de informatie commercieel benutten**, bijvoorbeeld door ze met andere gegevens
> te combineren, of door ze in je eigen product of applicatie te gebruiken."

Verpflichtung des Nutzers: Quellenangabe mit Urheber-Nennung und Verweis-Links („een
effectieve vermelding van het auteurschap garanderen"), ohne dabei eine Billigung durch
Fluvius zu behaupten. Belgisches Recht, unbefristet, endet automatisch bei Verstoß.

**Kommerziell ausdrücklich erlaubt, Weiterverbreitung erlaubt, Quellenangabe Pflicht.**

Der Datensatz trägt zudem einen Vorbehalt, der ungekürzt mitgenannt gehört (`GEPRÜFT`):

> „Fluvius spant zich in om volledige en actuele informatie aan te bieden. Niettemin kan
> Fluvius niet garanderen dat alle weergegeven informatie en data volledig of correct is."

### 5. Aktualität

`GEPRÜFT`: 1_20 zuletzt geändert **22.09.2026**, 1_33 zuletzt geändert **23.09.2026** — also
täglich fortgeschrieben. Jüngste Buchungsperiode in den Zeilen: `2026-07`.

### 6. Kleinanlagen

**Ja, beide Klassen.** Private Aufdachanlagen bilden die Masse der 1,11 Mio. Zeilen, und
Steckersolar ist mit „Plug & Play PV" als eigener Typ ausgewiesen (`GEPRÜFT`).

---

## Belgien — Wallonien

### 1. Register mit Einzelanlagen?

**Nein, nur Aggregate — und nur von EINEM Netzbetreiber.** Herausgeber: **ORES**,
veröffentlicht auf dem Open Data Wallonie-Bruxelles (ODWB). Zwei Datensätze:

- *023 — ORES Electricité — Nombre de clients avec production(s) décentralisée(s) par
  localité (Annuel)*
  <https://www.odwb.be/explore/dataset/ores-electricite-nombre-de-productions-decentralisees-par-localite-annuel/>
- *024 — ORES Electricité — Puissance des productions décentralisées par localité (Annuel)*
  <https://www.odwb.be/explore/dataset/ores-electricite-puissance-des-productions-decentralisees-par-localite-annuel/>

**Lücke:** Eine Katalogsuche nach „RESA" auf ODWB ergab **0 Treffer** (`GEPRÜFT`). RESA ist
der Netzbetreiber der Region Lüttich; dessen Gebiet fehlt damit in dieser Quelle. Ob RESA
oder die kleineren Betreiber (AIEG, AIESH, REW) anderswo veröffentlichen, wurde nicht
geprüft (`UNGEPRÜFT`). **Wallonien ist über ODWB also nicht flächendeckend abgedeckt.**

### 2. Granularität

`GEPRÜFT` — Metadaten und Zeilen gelesen. Felder von 024: `fluide`, `annee`,
`secteur_geographique`, `type_de_production`, `categorie_producteur`, `code_postal`,
`commune_lc`, **`localite_lc`**, `puissance_installation_mva`, `nom_commune`, `centroid`
(Koordinaten), `geom` (Gemeindeumriss), `province`, `arrondissement`. 023 führt statt der
Leistung `nombre_de_producteurs`.

Die Einheit ist die **Ortschaft (localité)**, also feiner als die Gemeinde — mit Postleitzahl
und Zentrumskoordinate. Gemessen (`GEPRÜFT`, Facetten auf 024):

| Facette | Werte |
|---|---|
| `categorie_producteur` | **P ≤ 10 kVA: 8.679** · P > 10 kVA: 5.170 |
| `type_de_production` | Photovoltaïque 10.704 · Cogénération 1.401 · Eolien 775 · Hydraulique 694 · Autre 275 |
| `annee` | 2020–**2025** (2025: 2.653 Zeilen) |

**`annee` ist das Berichtsjahr, nicht das Inbetriebnahmejahr** — es handelt sich um
Jahresbestände. Zubau ist nur als Differenz zweier Jahre ableitbar, nicht als
Inbetriebnahme-Kohorte.

Ein Vorbehalt steht in der Beschreibung und gehört an jede Zahl (`GEPRÜFT`):

> „Point d'attention pour les données 2023 : Les chiffres communiqués […] correspondent au
> nombre de dossiers introduits pour des unités de production décentralisées et valablement
> vérifiés et enregistrés par les services d'ORES au 31 décembre 2023. Compte tenu de la fin
> prévue du régime de compensation, un nombre exceptionnel de dossiers a été reçu durant
> l'année […]"

Die Zahlen beschreiben also **bearbeitete Anträge zum Stichtag**, nicht zwingend den
physischen Bestand — 2023 mit ausdrücklich genanntem Bearbeitungsrückstand.

### 3. Zugang

**Offene API, kostenlos.** `GEPRÜFT` (HTTP 200 auf Katalog-, Record- und Facetten-Abfragen
von `https://www.odwb.be/api/explore/v2.1/…` sowie auf die ältere `…/api/datasets/1.0/search/`).

### 4. Lizenz

Aus den Metadaten beider Datensätze, wörtlich (`GEPRÜFT`):

> `license: "Creative Commons - CC0"`

**CC0 — keine Einschränkung, keine Quellenangabepflicht, kommerzielle Nutzung frei.** Das
Feld `license_url` zeigt allerdings auf `http://www.opendefinition.org/licenses/cc-by/`,
also auf CC BY statt CC0 (`GEPRÜFT`) — **ein Widerspruch in der Quelle selbst.** Praktisch
folgenlos, weil die Quellenangabe hier ohnehin gemacht würde; wer sich auf die
Gemeinfreiheit berufen will, sollte ihn vorher bei ORES klären. ORES bittet zusätzlich um
eine Rückmeldung zur Nachnutzung, ohne sie zur Bedingung zu machen (`GEPRÜFT`):

> „Afin de mesurer l'impact de ses Open Data, Ores est intéressée d'être tenue informée des
> réutilisations qui seront faites des données mises à disposition."

### 5. Aktualität

Jährlich. Zuletzt geändert: 024 am **24.03.2026**, 023 am **13.08.2026**; jüngstes
Berichtsjahr **2025** (`GEPRÜFT`).

### 6. Kleinanlagen

**Ja, private Aufdach-PV** — die Kategorie `P ≤ 10 kVA` ist mit 8.679 Zeilen die größere von
beiden (`GEPRÜFT`). **Balkonkraftwerke sind nicht separat ausgewiesen.**

---

## Belgien — Brüssel (Randnotiz)

Zuständig ist die Regulierungsbehörde **BRUGEL**; Netzbetreiber für alle 19 Gemeinden ist
Sibelga.

- <https://brugel.brussels/nl_BE/actualites/gegevens-hernieuwbare-energie-427> (`GEPRÜFT`,
  HTTP 200)

BRUGEL stellt Rohdaten als **Excel** bereit, aufgeschlüsselt nach Eigentümertyp
(öffentliches Unternehmen / Privatunternehmen / Einzelperson), **Gemeinde**, Technologie,
Energiequelle und Leistungsklasse in MWe (`GEPRÜFT`, aus dem Seitentext). Also
**Gemeindeaggregate, keine Einzelanlagen**.

Aktualisierungsfrequenz und Lizenz nennt die Seite nicht; unter „Conditions d'utilisation"
stehen allgemeine Nutzungsbedingungen ohne spezifische Datenlizenz (`GEPRÜFT` in dem Sinne,
dass die Angabe fehlt — **die Lizenzfrage ist für Brüssel offen und vor einer Nutzung zu
klären**). Die Excel-Datei selbst wurde nicht heruntergeladen (`UNGEPRÜFT`).

---

## Niederlande — nur Aggregate, dafür sauber lizenziert

### 1. Register mit Einzelanlagen?

**Nein.** Ein öffentlich abrufbares Einzelanlagen-Register existiert nicht. Das nationale
Register heißt **CERES** (Centrale Registratie Systeem Elementen), wird von **EDSN** für die
Netzbetreiber geführt und hat 2019 das Produktie Installatie Register (PIR) abgelöst. Es
enthält laut eigener Angabe „alle opwekinstallaties tot een vermogen van 1 megawatt en met
zon als energiebron én alle opslaginstallaties tot een vermogen van 1 megawatt" (`GEPRÜFT`)
— also genau den Bestand, um den es geht. **Öffentlich ist davon nur eine bundesweite
Monatsreihe.**

Das war zunächst nicht sichtbar: <https://www.energieleveren.nl/opendata> antwortet mit
HTTP 200, liefert seinen Inhalt aber vollständig per JavaScript nach (380 Bytes HTML).
Die Download-Adresse steckt im JavaScript-Bündel und wurde von dort gelesen (`GEPRÜFT`):

- CSV: <https://prd.content-energieleveren-nl.pages.dev/data/open-data-energieleveren.csv>
  (`GEPRÜFT`, HTTP 200, 10.571 Bytes, `text/csv`, **96 Zeilen**)
- Begleitseite: <https://www.energieleveren.nl/inzicht>, Rohtext unter
  `…/insights/installatie-register-inzichten.md` (`GEPRÜFT`, 135 Zeilen)

Der Inhalt des CSV (`GEPRÜFT`, Spaltenkopf gelesen):

```
Datum registratie, Som van aantal_registraties,
Som van vermogen <5 kW, Som van vermogen 5-15 kW, Som van vermogen >15 kW,
aantal van vermogen <5 kW, Aantal van vermogen 5-15 kW, aantal van vermogen >15 kW,
Aantal KVB, Aantal GVB, Cumulatief aantal registraties, Cumulatief <5kW, …
```

Eine **Monatsreihe für ganz Niederlande** von Jun-21 bis Aug-26, nach drei Leistungsklassen
— **ohne jede Gebietsangabe**. Die Gemeindeauswertungen existieren, werden aber
ausschließlich als **JPEG-Karten** veröffentlicht („Aantal zon opwekinstallaties per
gemeente", „Percentage aansluitingen met zonnepanelen per gemeente", Stand 01.09.2026) —
`GEPRÜFT`. **Für einen Datenimport ist das unbrauchbar.**

**Eine Lizenzangabe gibt es auf der ganzen Seite nicht** (`GEPRÜFT` — gezielt nach
„licentie", „hergebruik", „voorwaarden", „bron", „copyright" gesucht, kein Treffer). Statt
einer Lizenz steht dort ein Genauigkeitsvorbehalt (`GEPRÜFT`):

> „De registratie van een installatie kan later plaatsvinden dan het installeren zelf.
> Hierdoor zullen de cijfers achterlopen op de werkelijk geïnstalleerde installaties.
> Daarnaast kunnen er registraties missen, waardoor de gegevens niet compleet zijn."

Und ein Hinweis, der für jede Leistungsangabe zählt (`GEPRÜFT`):

> „Het geïnstalleerde vermogen dat gerapporteerd wordt is het **AC- of uitgangsvermogen van
> de omvormer** in kilowatt. Het wattpiekvermogen is gemiddeld 5 % hoger."

Die Zahl ist also **Wechselrichterleistung, nicht kWp** — wer sie neben deutsche
kWp-Angaben stellt, vergleicht zwei verschiedene Größen.

Was es darüber hinaus gibt, in absteigender Brauchbarkeit:

**a) CBS StatLine 85005NED** — *Zonnestroom; vermogen en vermogensklasse, bedrijven en
woningen, regio*
<https://opendata.cbs.nl/ODataApi/odata/85005NED/> (`GEPRÜFT`, HTTP 200)

**b) Liander** — *Decentrale opwek Zon Kleinverbruik*, je CBS-Nachbarschaft
<https://www.liander.nl/over-ons/open-data> (`GEPRÜFT`)

**c) Stedin / Klimaatmonitor** — Gemeindeaggregate, nicht im Einzelnen geprüft (`UNGEPRÜFT`)

### 2. Granularität

**CBS 85005NED** (`GEPRÜFT` — Struktur und Zeilen über die OData-Schnittstelle gelesen):

- Regionen: **361 Gemeinden** (`GM…`), dazu 13 Provinzen, 41 ET-, 31 ES-Regionen,
  4 Landesteile, Gesamt-Niederlande
- Perioden: **2019–2025**, Jahreswerte
- Kennzahlen: `Installaties` (Anzahl), `OpgesteldVermogenVanZonnepanelen` (kWp),
  `OpgesteldVermogenOmvormers` (kW), `ProductieVanZonnestroom` (Mio. kWh)
- Aufgliederung nach Sektor (Betriebe / Wohnungen) und Leistungsklasse
  (**≤ 15 kWp / > 15 kWp**, letztere weiter in Dach / Freifläche)

Wörtlich aus der Tabellenbeschreibung (`GEPRÜFT`):

> „De cijfers kunnen ook worden uitgesplitst naar gemeente, provincie, landsdeel, RES-regio
> en subRES-regio […]. De productie van zonnestroom kan niet naar gemeenteniveau"

— die **Stromproduktion** ist also nicht auf Gemeindeebene verfügbar, Anzahl und Leistung
schon. Beispielzeile (`GEPRÜFT`): Gemeinde `GM1680`, 2019: 2.922 Installationen,
20.968 kWp; 2021 bereits 4.392 Installationen / 33.382 kWp.

**Kein Inbetriebnahmedatum.** Es sind Jahresbestände; Zubau ist nur als Differenz zweier
Jahre ableitbar.

**Liander** (`GEPRÜFT` — CSV heruntergeladen, 1.193.601 Bytes, 7.491 Zeilen):

```
PEILDATUM;NETBEHEERDER;PROVINCIE;GEMEENTE;PLAATS;CBS_BUURTCODE_2023;
CBS_BUURTNAAM_2023;AANTAL_AANSLUITINGEN_MET_PV;TOTAAL_AANTAL_AANSLUITINGEN;OPGESTELD_VERMOGEN_KW
```

Das ist **Nachbarschaftsebene** — feiner als Gemeinde —, aber nur ein Stichtag
(`PEILDATUM 20240409`), kein Inbetriebnahmejahr, und nur das Netzgebiet von Liander.
Datenschutz-Untergrenze laut Beschreibung (`GEPRÜFT`):

> „Zijn er in een buurt minder dan 5 opwekinstallaties? Dan worden die in een 'restpost' per
> gemeente opgeteld om de privacy van de bewoners te waarborgen."

### 3. Zugang

**CBS: offene OData-API, kostenlos, kein Schlüssel** (`GEPRÜFT`, alle Abfragen HTTP 200).
**Liander: direkte CSV-Downloads** (`GEPRÜFT`, HTTP 200).

### 4. Lizenz

**CBS: CC BY 4.0.** Von <https://www.cbs.nl/nl-nl/over-ons/website/copyright> (`GEPRÜFT`),
wörtlich:

> „Hergebruik van de inhoud van deze website is naamsvermelding verplicht. Dit betekent dat
> u verplicht bent te vermelden dat de gegevens afkomstig zijn van CBS."

Kommerzielle Nutzung und Weiterverbreitung erlaubt, Quellenangabe Pflicht. Ausgenommen sind
Logo/Marke und Fotos Dritter; bei Weiterverarbeitung darf nicht der Eindruck entstehen, das
CBS befürworte die Interpretation.

**Liander: CC BY 4.0** (`GEPRÜFT`, aus den CKAN-Metadaten von data.overheid.nl:
`license_id: http://creativecommons.org/licenses/by/4.0/deed.nl`, `license_title: CC-BY (4.0)`).

### 5. Aktualität

**CBS**: Frequenz `Tweemaalperjaar` (zweimal jährlich), `Modified` = **12.06.2026**,
abgedeckte Perioden 2019–2025 (`GEPRÜFT`).

**Liander**: Die jüngste Solar-Datei auf der Open-Data-Seite ist
`liander_decentrale_opwek_kv_zon_20240409.csv`, also **Stand April 2024** — das Datenportal
data.overheid.nl verweist sogar noch auf eine Fassung von 2022, deren URL inzwischen HTTP
403 liefert (`GEPRÜFT`). Der Solar-Datensatz wird also **nicht zuverlässig gepflegt**.
Laufend gepflegt ist dagegen die Einspeise-Datei `terugleverdata-kv-2026.csv` (`GEPRÜFT`,
7.276.516 Bytes, 147.770 Zeilen, Seitenstand 10.06.2026) — sie führt Postleitzahlbereiche
mit Anschlusszahlen, aber **keine Anlagenleistung**.

### 6. Kleinanlagen

**Aufdach-PV: ja**, CBS weist die Klasse ≤ 15 kWp gesondert aus und trennt Wohnungen von
Betrieben (`GEPRÜFT`). **Balkonkraftwerke: nicht als eigene Kategorie**; die CBS-Methodik
stützt sich unter anderem auf Umsatzsteuer-Rückforderungen von Haushalten
(`UNGEPRÜFT` — steht in der Suchergebnis-Zusammenfassung zur CBS-Methodenseite, nicht am
Methodendokument nachgelesen). Die CERES-Abdeckung wird mit rund 90 % der Anlagen
angegeben (`UNGEPRÜFT`, gleiche Herkunft).

---

## Italien — Register vorhanden, aber weder offen noch kommerziell nutzbar

### 1. Register mit Einzelanlagen?

**Ja, es existiert — aber nicht öffentlich.** Das italienische Pendant zum MaStR ist
**GAUDÌ** (*Gestione Anagrafica Unica Degli Impianti*), betrieben von Terna: die
Zwangsregistrierung jeder Erzeugungsanlage, jede Anlage bekommt einen `CENSIMP`-Code.
<https://www.terna.it/it/sistema-elettrico/gaudi>. Eine Websuche nach öffentlichem
Download, Download-Center oder Regional-/Provinzfilter brachte **keinen Beleg für einen
öffentlichen Zugang** — GAUDÌ ist ein Portal für Anlagenbetreiber mit Konto (`UNGEPRÜFT` in
dem Sinne, dass nur Sekundärquellen und Terna-Handbuch-PDFs in den Treffern auftauchten;
das Portal selbst wurde nicht angesteuert. **Kein Beleg für „gibt es nicht", sondern
keiner für „ist offen".**).

Öffentlich zugänglich sind stattdessen zwei Dinge des **GSE** (Gestore dei Servizi
Energetici):

**a) Atlaimpianti** — der geografische Atlas.
<https://www.gse.it/dati-e-scenari/atlaimpianti> (`GEPRÜFT`). Die Seite sagt selbst, das
System sei derzeit **„in fase di aggiornamento"** und nicht verfügbar. Der in Sekundärquellen
genannte Einstieg `https://atla.gse.it/atlaimpianti/project/Atlaimpianti_Internet.html` ist
nicht erreichbar — **Abruf gescheitert, Grund: DNS, „Could not resolve host: atla.gse.it"**
(`GEPRÜFT`).

**b) GSE Open Data** — <https://opendata.gse.it/> (`GEPRÜFT`, HTTP 200 nach Weiterleitung
auf `SitePages/Home.aspx`). Das ist **keine Anlagendatenbank**, sondern die
Transparenz-Veröffentlichung der Förderempfänger: „Beneficiari incentivi Conto Energia,
anno 2025", „Beneficiari incentivi Fer Elettriche, anno 2025" usw. (`GEPRÜFT`, Titelliste
der Startseite). Die Seite „Informazioni" beschreibt den Zweck ausdrücklich als Erfüllung
der Transparenzpflichten für **Fördermittel**, nicht als Anlagenregister (`GEPRÜFT`).

### 2. Granularität

Für Atlaimpianti steht die Antwort wörtlich in den Nutzungsbedingungen (`GEPRÜFT`, PDF
heruntergeladen, 686 KB, und mit `pdftotext` ausgelesen):

> „Il GSE […] mette a disposizione degli utenti il sistema informativo geografico
> Atlaimpianti per consentire la consultazione dei dati e delle informazioni relativi agli
> impianti di produzione di energia elettrica e termica incentivati dal GSE, **organizzati
> in forma aggregata** per tipologia e potenza dell'impianto, meccanismo di incentivazione e
> area geografica (**Regione, Provincia e Comune**)."

Also: **Gemeindeaggregate, keine Einzelanlagen** — und beschränkt auf **vom GSE geförderte**
Anlagen. Das ist die zweite große Einschränkung: Die italienische Einspeisevergütung
(*Conto Energia*) endete 2013; moderne Aufdach-PV läuft überwiegend über *Scambio sul Posto*
oder Steuerabzüge und ist in einer Förderempfänger-Sicht nicht vollständig abgebildet
(`UNGEPRÜFT` — fachlich plausibel, aber in dieser Sitzung nicht an einer GSE-Quelle belegt).

### 3. Zugang

Atlaimpianti: **Web-Oberfläche**, derzeit nicht erreichbar. Einen Bulk-Download verlinkt die
GSE-Seite nicht; sie verweist auf Benutzerhandbuch und Nutzungsbedingungen (`GEPRÜFT`).
GSE Open Data: SharePoint-Seite mit jahresweisen Empfängerlisten; die Dateiliste ist
JavaScript-gerendert und wurde nicht einzeln geöffnet (`UNGEPRÜFT`).

Zusätzlich veröffentlicht GSE jährlich den *Rapporto statistico monografico sul Solare
fotovoltaico* samt Anhang (neuester Stand laut Statistikseite: **2024, veröffentlicht
19.09.2025**) — `GEPRÜFT` für die Existenz, `UNGEPRÜFT` für die Frage, ob der Anhang bis auf
Gemeindeebene geht; die Seite sagt dazu nur „dati di dettaglio e mappe".

### 4. Lizenz — **der Ausschlussgrund**

Aus den Atlaimpianti-Nutzungsbedingungen, wörtlich (`GEPRÜFT`):

> „È consentito riprodurre dati e analisi tecniche del GSE, messe a disposizione dal sito, a
> condizione che venga citata la fonte negli elaborati e nel rispetto delle presenti
> condizioni di utilizzo e della legge istitutiva della banca dati.
> Al di fuori degli usi consentiti dai presenti termini e delle modalità di riproduzione di
> cui sopra è vietata qualsiasi altra forma di utilizzo delle informazioni. **Non è in
> particolare consentito commercializzare oppure trasferire dati e immagini – o parti di
> esse – per fini di lucro.**"

Und, für einen automatisierten Abruf ebenso einschlägig (`GEPRÜFT`):

> „[…] è fatto espresso divieto di: […] c) porre in essere ogni condotta idonea a saturare
> risorse o degradare la regolare disponibilità del servizio. […] In tale ambito vengono
> comprese anche **operazioni di download e tile cache permanenti dei dati**."

Zusätzlich beruft sich GSE ausdrücklich auf das **Datenbankherstellerrecht**
(„banca dati istituita ai sensi dell'art. 1 L. 22 aprile 1941 n. 633, come modificata dal
D.lgs. 6 maggio 1999 n. 169") — `GEPRÜFT`.

Dieselbe Linie bei den Statistikberichten: Die GSE-Statistikseite trägt
**CC BY-NC-SA 3.0 IT** (`GEPRÜFT`, via WebFetch):

> „Quest'opera è distribuita con Licenza Creative Commons Attribuzione - Non commerciale -
> Condividi allo stesso modo 3.0 Italia"

**Ergebnis: Für ein kommerzielles Produkt ist keine der offenen italienischen Quellen
nutzbar.** „Non commerciale" schließt uns aus, „Condividi allo stesso modo" (Share-alike)
wäre selbst bei nicht-kommerzieller Nutzung ein zweites Problem, und das
Dauer-Download-Verbot trifft genau die Bauweise eines Datenimports.

### 5. Aktualität

Atlaimpianti: derzeit gar nicht (in Überarbeitung). GSE Open Data: jahresweise, jüngste
Einträge **13.07.2026** für das Berichtsjahr 2025 (`GEPRÜFT`, Startseite). Statistikbericht
Solar: Jahrgang **2024**, veröffentlicht 19.09.2025 (`GEPRÜFT`).

### 6. Kleinanlagen

Aus der Förderempfänger-Sicht heraus systematisch unvollständig; eine Leistungsschwelle
nennt keine der geprüften Quellen ausdrücklich (`GEPRÜFT` als Negativbefund). Für
Steckersolar gibt es keinen Beleg.

---

## Österreich — echtes Einzelanlagen-Register, aber ohne Datum, ohne Gemeinde und ohne Lizenz

### 1. Register mit Einzelanlagen?

**Ja — und es ist gesetzlich vorgeschrieben.** Herausgeber: **E-Control**. Datensatz:
*Anlagenregister*, <https://anlagenregister.at/> (`GEPRÜFT`, HTTP 200), Beschreibung unter
<https://www.e-control.at/anlagenregister>.

Wörtlich von der E-Control-Seite (`GEPRÜFT`):

> „Das Erneuerbaren Ausbau Gesetz (EAG) sieht in § 81 Abs 9 die Einrichtung eines
> öffentlich zugänglichen Anlagenregisters vor. In diesem müssen alle in unserer
> Herkunftsnachweisdatenbank registrierten Anlagen veröffentlicht werden. Neben der Angabe
> der Technologie der jeweiligen Anlage, sowie der Engpassleistung samt Jahreserzeugung, ist
> auch der Standort der Anlage ausgewiesen. Die Informationen lassen sich für Auswertungen
> auch als Datenfile herunterladen."

### 2. Granularität — **hier liegt das Problem**

**Einzelanlage, aber mit zwei Lücken, die genau das treffen, was wir brauchen** (`GEPRÜFT`,
Suche nach PLZ 6900 im Browser, 588 Datensätze). Spalten der Trefferliste:

```
Plz | Ort | Bundesland | Technologie | Engpassleistung (kW el)
    | Eingespeister Strom (kWh) 2026 | 2025 | 2024 | 2023 | 2022 | 2021
```

**Lücke 1 — kein Inbetriebnahmedatum.** Die Oberfläche hat keine solche Spalte. Die
dahinterliegende Schnittstelle **hat ein Feld `Inbetriebnahme`, und es ist `null`**
(`GEPRÜFT`, echte Antwort):

```json
{"ID":0,"AnlPlz":"8283","AnlOrt":"Bad Blumau","Bundesland":"ST",
 "Energietraeger":"geothermische Energie","Inbetriebnahme":null,
 "Anlagenbetreiber":null,"Engpassleistung":250.0,…}
```

**Ein Zubau nach Jahr ist daraus nicht ableitbar.** Behelfsweise ginge das erste Jahr mit
Einspeisung ≠ 0 — das ist eine Krücke, keine Messung, und für 2021 und früher gar nichts.

**Lücke 2 — kein Gemeindeschlüssel, nur Postleitzahl und Ortsname, und die PLZ ist nicht
die Gemeinde.** Gemessen: Unter PLZ 6900 stehen **Bregenz, Möggers und
Lochau-Tannenbach** — zwei Gemeinden plus ein Ortsteil (`GEPRÜFT`). Die Zuordnung
PLZ → Gemeinde muss selbst gebaut werden. Koordinaten fehlen ebenfalls.

### 3. Zugang

Web-Oberfläche mit **Excel-Export je Suchergebnis** — der Knopf ist vorhanden, der Export
läuft clientseitig (`infragistics.gridexcelexporter.js`), exportiert also die geladene
Trefferliste, **nicht die Gesamtdatenbank** (`GEPRÜFT`).

Daneben existiert eine **undokumentierte JSON-Schnittstelle**:
`POST https://anlagenregister.at/Home/SearchAnlagenregisterUebersicht` (`GEPRÜFT` — eine
Abfrage mit `Energietraeger: "11"` lieferte Treffer aus ganz Österreich, der PLZ-Filter
wurde dabei ignoriert). Ausgelesene Energieträger-Schlüssel: `9 = Sonnenenergie`,
`10 = Wasserkraft`, `11 = geothermische Energie`, `8 = Windenergie`,
`12 = feste/flüssige Biomasse`. **Ein Vollabzug für Sonnenenergie wäre damit theoretisch
ein Aufruf — praktisch liefen mehrere Versuche ins Zeitlimit** (bei rund einer halben
Million PV-Anlagen). **Nicht zu Ende geprüft.**

Kostenlos, kein Login, kein Antrag (`GEPRÜFT`). **Kein Eintrag auf data.gv.at**; was dort
zu PV liegt, ist ein niederösterreichischer Datensatz von 2021 mit Datenstand 2013, der
Gemeinden unter 5 Anlagen oder unter 30 kWp ausdrücklich weglässt (`GEPRÜFT`) — unbrauchbar.

### 4. Lizenz — **ungeregelt, und das ist der Ausschlussgrund bis zur Klärung**

**Auf anlagenregister.at steht keine Lizenz.** Nachgemessen (`GEPRÜFT`): Eine Suche im
ausgelieferten HTML nach „Urheberrecht", „Lizenz", „Vervielf", „Weiterverbreit",
„Creative Commons" und „Nutzungsbeding" ergibt **null Treffer**. Was dasteht, ist ein
Herkunfts- und Haftungshinweis plus „Impressum & Datenschutz".

Im E-Control-Impressum (<https://www.e-control.at/econtrol/links/impressum>) findet sich ein
Haftungsausschluss und „Copyright 2026 © E-Control", **aber keine Aussage zu
Vervielfältigung, Weiterverbreitung oder kommerzieller Nutzung** (`GEPRÜFT`).

**Kommerzielle Nutzung ist damit weder erlaubt noch verboten — sie ist ungeregelt.** Das ist
schlechter als ein „nein", weil man es nicht entscheiden kann. Vor einer Nutzung braucht es
eine Anfrage an E-Control (`hkn-support@e-control.at`) und eine eigene Prüfung, ob das
österreichische Informationsweiterverwendungsgesetz greift. **Außenkontakt, also eine
Entscheidung des Betreibers.**

### 5. Aktualität

**Laufend.** Die Seite trägt „Datum: Mittwoch, 23. September 2026" und die Trefferliste hat
eine gefüllte Spalte „Eingespeister Strom (kWh) 2026" (`GEPRÜFT`). Die Netzbetreiber melden
Stammdaten **monatlich**, zwischen Inbetriebnahme und Registrierung liegen „üblicherweise
1-2 Monate" — aus dem E-Control-Infoblatt zur Anlagenregistrierung, Stand 11/2023
(`GEPRÜFT`, PDF gelesen).

### 6. Kleinanlagen

**Aufdach-PV von Privathaushalten: ja, eindeutig.** In der Stichprobe PLZ 6900 stehen
Anlagen mit **4,23 / 4,47 / 4,56 / 5,06 kW** (`GEPRÜFT`) — typische
Einfamilienhaus-Anlagen. Eine Leistungsschwelle gibt es nicht; aus dem E-Control-Infoblatt
(`GEPRÜFT`):

> „Einzelregistrierungen für Photovoltaikanlagen durch die AnlagenbetreiberInnen sind in der
> Praxis nicht vorgesehen. […] für jede ans Netz angeschlossene und in Betrieb gegangene
> Anlage werden uns nun monatlich automatisch vom Netzbetreiber die Anlagendaten
> übermittelt."

**Balkonkraftwerke: nicht geklärt** (`UNGEPRÜFT`). Im Register wurde keine Anlage unter
4 kW gesehen, aber auch nicht systematisch danach sortiert — die Suchschnittstelle lief bei
größeren Ergebnismengen ins Zeitlimit. Die Registrierung hängt faktisch an der
Stammdatenmeldung des Netzbetreibers; ob steckerfertige Kleinstanlagen dort ankommen, ist
offen.

---

## Portugal — kein Einzelanlagen-Register, aber die beste Aggregation nach der Schweiz

### 1. Register mit Einzelanlagen?

**Nein.** Die DGEG betreibt die Registrierungsportale (Portal do Autoconsumo e CER, Portal
das UPP), veröffentlicht daraus aber **keinen Registerauszug und keine Anlagenliste**
(`GEPRÜFT` — die DGEG-Seite zu „Produção Descentralizada" enthält keine solche Datei).

**Stattdessen liefert der Verteilnetzbetreiber E-REDES genau das, was Gemeindeseiten
brauchen.** Datensatz *Total production Units for Self-Consumption – Monthly*
(`8-total-upac-mensal`), <https://e-redes.opendatasoft.com/> — `GEPRÜFT`, selbst
nachgemessen: **518.067 Datensätze**, zuletzt geändert **16.09.2026**.

Aus der Beschreibung, wörtlich (`GEPRÜFT`):

> „This dataset presents the number of certified Self-Consumption Production Units (UPACs)
> connected to the E-REDES-operated grid and holding an active contract on the last day of
> the month under analysis. The data are organized by geographical location (district,
> municipality, parish, and postal code), installed capacity range, total installed
> capacity, voltage level, and technology type."

Zwei ergänzende Datensätze (`GEPRÜFT`): **`26-centrais`** — neue UPAC je Gemeinde und
Anschlussleistung, monatlich, 77.930 Datensätze, **das ist der Zubau**; und
**`25-plr-producao-renovavel`** — neue Netzanschlüsse über 1 MW je Gemeinde, 253 Datensätze.

### 2. Granularität

**Keine Einzelanlagen, aber vier Ortsebenen gleichzeitig.** Felder (`GEPRÜFT`, selbst
abgerufen):

```
data, ano, mes, distrito, concelho, freguesia, codigo_postal,
tipo_de_tecnologia, nivel_de_tensao, escalao_de_potencia_instalada,
numero_de_instalacoes, potencia_instalada_upac_kw,
coddistrito, codconcelho, codfreguesia, cpes,
relacao_instalacoes_por_cpe, relacao_potencia_por_cpe
```

Beispielzeile (`GEPRÜFT`):

```json
{"data":"2026-08","distrito":"Aveiro","concelho":"Águeda","freguesia":"Aguada de Cima",
 "codigo_postal":"3750","tipo_de_tecnologia":"Solar","nivel_de_tensao":"BTN",
 "escalao_de_potencia_instalada":"]0, 4]","numero_de_instalacoes":159,
 "potencia_instalada_upac_kw":259.77,"codconcelho":"0101","codfreguesia":"010103"}
```

- **Amtliche Schlüssel:** `codconcelho` (Gemeinde, 4-stellig), `codfreguesia` (Ortsteil,
  6-stellig), dazu 4-stellige Postleitzahl. 275 verschiedene Gemeindeschlüssel (`GEPRÜFT`).
- **Kein Inbetriebnahmedatum je Anlage** — dafür eine **Monatszeitreihe des Bestands** von
  `2023-01` bis `2026-08` (`GEPRÜFT`). Der Zubau je Monat und Gemeinde ist daraus als
  Differenz ableitbar, und `26-centrais` liefert ihn zusätzlich direkt.
- Keine Koordinaten.
- **Lücke: nur das Festland.** 18 Distrikte, **Azoren und Madeira fehlen** (`GEPRÜFT`) —
  dort sind EDA bzw. EEM Netzbetreiber, nicht E-REDES.

### 3. Zugang

**Offene API ohne Schlüssel plus Bulk-CSV-Export, kostenlos** (`GEPRÜFT` — alle Abfragen
über `https://e-redes.opendatasoft.com/api/explore/v2.1/…` mit HTTP 200, serverseitige
Aggregation über `select=sum(…)` und `group_by` funktioniert).

Die DGEG bietet daneben nur Publikationen: „Estatísticas rápidas das renováveis", monatlich
als PDF und XLSX, jüngste Ausgabe **Juli 2026** (`GEPRÜFT`). Sie deckt Festland **und**
Azoren/Madeira ab, aber **nur national und regional, keine Gemeindeebene**. Auf
dados.gov.pt gibt es nichts: Suche nach „autoconsumo" und „UPAC" über die CKAN-API ergab
jeweils **0 Treffer** (`GEPRÜFT`).

### 4. Lizenz

Aus den Metadaten, wörtlich (`GEPRÜFT`, selbst nachgeprüft):

> `license: "CC BY 4.0"`
> `license_url: "https://creativecommons.org/licenses/by/4.0/"`
> `publisher: "E-REDES"`

**Kommerzielle Nutzung erlaubt, Weiterverbreitung erlaubt, Namensnennung Pflicht.** Gilt für
alle drei genannten Datensätze.

Dazu gehört ein Genauigkeitsvorbehalt aus der Beschreibung, der mitzitiert werden sollte
(`GEPRÜFT`):

> „The information made available by E-REDES constitutes an approximation to the values taken
> from the system and is based on the moment in which it is collected […] the information
> made available may be subject to subsequent changes and updates."

**Die DGEG-Seite ist dagegen nicht nutzbar ohne Klärung:** Unter „Termos e Condições" steht
keine Weiterverwendungsregel, nur „Copyright 2026. All Rights Reserved" (`GEPRÜFT`). Für ein
kommerzielles Produkt sind die E-REDES-Daten auch rechtlich der bessere Weg.

### 5. Aktualität

**Monatlich.** Zuletzt geändert **16.09.2026**, jüngster Datenmonat **August 2026**
(`GEPRÜFT`); `26-centrais` zuletzt 03.09.2026.

### 6. Kleinanlagen

**Ja, bis ganz unten.** Leistungsklassen, selbst nachgemessen (`GEPRÜFT`):

| Klasse | Zeilen |
|---|---|
| `]0, 4]` kW | 174.693 |
| `]4, 20.7]` kW | 156.577 |
| `]20.7, 30]` kW | 85.836 |
| `]30, 1000]` kW | 100.103 |
| `>1000` kW | 834 |
| `ND` | 24 |

Die unterste Klasse **beginnt bei 0 kW**, es gibt also keine Untergrenze; die Spannungsebene
`BTN` ist Haushalts-Niederspannung. **Balkonkraftwerke:** Erfasst ist, was als UPAC
zertifiziert ist und einen aktiven Vertrag hat — ob steckerfertige Kleinstanlagen darunter
fallen, ist damit **nicht belegt** (`UNGEPRÜFT`).

---

## Spanien — national zu, regional exzellent (Kurzfassung)

Spanien ist an anderer Stelle vollständig erfasst; hier die tragenden Befunde.

**National: nichts Brauchbares.** Die beiden Register **RAIPRE/PRETOR**
(<https://energia.serviciosmin.gob.es/Pretor/>) und **RADNE**
(<https://energia.serviciosmin.gob.es/Radne/RegistroPublico/Consulta>) antworten beide mit
HTTP 200 und stehen hinter derselben **CAPTCHA-Schranke** (`GEPRÜFT` — „repita los
caracteres de la imagen"; **Abruf gescheitert, Grund Bot-Prüfung**, nicht weitergeklickt).
Der datos.gob.es-Eintrag zu RADNE nennt ausdrücklich nur „datos **agregados** públicos"
(`GEPRÜFT`). Der einzige offene Bund-Download
(`…/Electra/descargarCSVProduccion.aspx`, 71.727 Zeilen) hat genau fünf Spalten —
**keine Leistung, kein Gemeindeschlüssel, kein Datum** (`GEPRÜFT`). Für Gemeindeseiten
wertlos.

**Regional: zwei Volltreffer.**

- **Katalonien**, Autoconsum-Register RAC (`2b4s-skfm`, Socrata): **138.769 Einzelanlagen**,
  1.815.702 kW, mit `codi_ine_municipi` und **tagesgenauem** `data_de_posada_en_servei`;
  kleinste Anlage 0,236 kW, 7.399 Anlagen ≤ 2 kW (`GEPRÜFT`). **Aber: steht seit 12/2025** —
  keine Zeile aus 2026, obwohl „monatlich" angekündigt. **Lizenz unscharf**
  (`SEE_TERMS_OF_USE` ohne URL, Terms-Seite antwortet 404) — vor Nutzung zu klären.
- **Comunitat Valenciana**: CSV mit **133.408 Zeilen** (69,7 MB), davon 133.378 Photovoltaik,
  542 Gemeindeschlüssel, **CC BY** ausdrücklich in den CKAN-Metadaten, **tagesaktuell**
  (jüngster Eintrag 22.09.2026) (`GEPRÜFT`).

**Alle übrigen 15 Regionen: nichts gefunden.** Der nationale Harvester datos.gob.es wurde
mit vier Titelsuchen durchgegangen, Andalusien und Aragón zusätzlich direkt über ihre
CKAN-APIs (`count: 0`) — `GEPRÜFT`. Madrid, Euskadi und Castilla y León antworteten nicht
auf die CKAN-API; **das ist kein Beleg für Nicht-Existenz**.

**Gemeindeauswertung für ganz Spanien:** Ein Forschungsdatensatz der UAM hat RADNE auf
Gemeindeebene aufbereitet, 2020–2024, XLSX und Shapefile, **CC BY 4.0**
(<https://zenodo.org/records/18434094>, `GEPRÜFT`, dass es ihn gibt). Er ist eine
**Sekundärquelle** und endet 2024. Die kursierende Zahl „alle 8.131 Gemeinden" wurde **nicht
nachgemessen** (`UNGEPRÜFT`) — wer sie verwenden will, zählt sie vorher selbst.

---

## Gesamttabelle

| Land | Einzelanlagen? | Standortbezug | Bulk-Download | Lizenz kommerziell OK? | Aktualität | Kleinanlagen drin? |
|---|---|---|---|---|---|---|
| **Schweiz** | **Ja**, 339.499 Anlagen (337.455 PV) | Adresse, PLZ, Gemeinde, Kanton, Gebäude-ID, Koordinaten; **taggenaues Inbetriebnahmedatum** | **Ja** — CSV/GPKG/Interlis/WMS/API, kostenlos | **Ja**, Quellenangabe Pflicht („Freie Nutzung. Quellenangabe ist Pflicht.") | **monatlich**, Datei vom 14.09.2026 | Aufdach ja (Median 12 kW); Balkon praktisch nein (Schwelle 2 kW) |
| **Frankreich** | **Ab 36 kW ja** (98.110 Solar-Einzelanlagen); darunter 1 Zeile je Gemeinde | INSEE-Gemeindeschlüssel, IRIS, EPCI, Departement; Inbetriebnahmedatum je Einzelanlage | **Ja** — offene API + Export, kostenlos | **Ja**, Licence Ouverte 2.0 Etalab, Quellenangabe Pflicht | Stichtag 31.07.2026, verarbeitet 10.09.2026; 11 Jahresarchive | Nur als Gemeindesumme, **ohne Zubaujahr** |
| **Belgien / Flandern** | **Ja**, 1.110.420 PV-Einzelanlagen (eine Zeile je Anlage) | Postleitzahl + **Inbetriebnahmejahr je Anlage**; keine Adresse, keine Koordinaten | **Ja** — offene API + Export, kostenlos | **Ja**, ausdrücklich („de informatie commercieel benutten"), Quellenangabe Pflicht | **täglich ersetzt** (22./23.09.2026), Stichtag 07/2026, keine Historie | **Ja, beide** — „Plug & Play PV" als eigene Kategorie (2.196) |
| **Belgien / Wallonien** | Nein, Jahresbestände je Ortschaft | PLZ, Gemeinde, Ortschaft, Koordinate, Gemeindeumriss | **Ja** — offene API, kostenlos | **Ja**, CC0 (Lizenz-Link zeigt widersprüchlich auf CC BY) | jährlich, zuletzt 2025; geändert 03/2026 bzw. 08/2026 | Aufdach ja (`P ≤ 10 kVA`, 8.679 Zeilen); Balkon nicht getrennt |
| **Belgien / Brüssel** | Nein, Gemeindeaggregate | Gemeinde, Technologie, Leistungsklasse | Excel-Download | **offen** — keine Lizenzangabe gefunden | nicht angegeben | nicht bestimmbar |
| **Italien** | Register GAUDÌ existiert, **nicht öffentlich**; GSE-Atlas nur Gemeindeaggregate und derzeit offline | Region/Provinz/Gemeinde | Nein | **NEIN** — „Non è […] consentito commercializzare […] per fini di lucro"; Berichte CC BY-**NC**-SA 3.0 IT | Atlas offline; Statistik 2024 | nur geförderte Anlagen |
| **Niederlande** | **Nein** — CERES existiert, offen ist davon nur eine bundesweite Monatsreihe | CBS: 361 Gemeinden; Liander: CBS-Nachbarschaft; CERES-CSV: **gar keiner** | **Ja** — CBS-OData + Liander-CSV + CERES-CSV, kostenlos | CBS und Liander **ja**, CC BY 4.0; CERES **ohne jede Lizenzangabe** | CBS zweimal jährlich (12.06.2026, Perioden 2019–2025); CERES monatlich (01.09.2026); Liander-Solardatei veraltet (04/2024) | Aufdach ja (CBS ≤ 15 kWp, CERES < 5 kW); Balkon nicht getrennt |
| **Österreich** | **Ja** (§ 81 Abs 9 EAG, E-Control) | **nur PLZ + Ortsname** — kein Gemeindeschlüssel, **kein Inbetriebnahmedatum** (Feld vorhanden, `null`), keine Koordinaten | Excel-Export je Suche; undokumentierte JSON-Schnittstelle (funktioniert, läuft bei großen Mengen ins Zeitlimit) | **UNGEREGELT** — keine Lizenzangabe, nur Copyright + Haftungsausschluss | laufend, Einspeisewerte bis 2026; Netzbetreiber melden monatlich | Aufdach ja (4–5 kW belegt), keine Schwelle; Balkon ungeklärt |
| **Portugal** | Nein — Monatsaggregate je Gemeinde, **Ortsteil** und PLZ (518.067 Zeilen) | `codconcelho`, `codfreguesia`, PLZ; kein Datum je Anlage, dafür Bestandsreihe 01/2023–08/2026 | **Ja** — offene API + CSV-Export, kostenlos | **Ja**, CC BY 4.0 ausdrücklich, Namensnennung Pflicht | **monatlich**, geändert 16.09.2026, Stand 08/2026 | Ja, unterste Klasse `]0, 4]` kW (174.693 Zeilen); **Festland only, Azoren/Madeira fehlen** |
| **Spanien** | National **nein** (CAPTCHA + nur Aggregate); regional **ja** (Katalonien 138.769, Valencia 133.408 Einzelanlagen) | INE-Gemeindeschlüssel + PLZ; Katalonien **tagesgenaues** Inbetriebnahmedatum | Ja, regional (Socrata-API, CSV 69,7 MB); national nur ein 5-Spalten-Dump ohne Leistung/Ort | Valencia **ja** (CC BY); Katalonien **unscharf** (`SEE_TERMS_OF_USE`, Terms-Seite 404) | Valencia tagesaktuell (22.09.2026); Katalonien **steht seit 12/2025** | Ja, ab 0,236 kW; 7.399 Anlagen ≤ 2 kW in Katalonien |

---

## Was daraus folgt

1. **Die Schweiz ist die einzige direkte Übertragung.** Einzelanlagen mit Adresse,
   Gebäude-ID, Koordinaten und taggenauem Inbetriebnahmedatum, monatlich, kommerziell frei
   gegen Quellenangabe. Alles, was der Solar-Atlas aus dem MaStR macht, ginge dort
   unverändert — inklusive Zubau je Monat und Gemeinde. Zusätzlich liegen **Neigung und
   Ausrichtung** je Anlage vor, was das MaStR so nicht hergibt.

2. **Flandern ist der zweite echte Treffer, und er wäre beinahe übersehen worden.** 1,11 Mio.
   PV-**Einzelanlagen**, jede mit Postleitzahl, Inbetriebnahmejahr und Leistung, täglich
   aktualisiert, kommerziell ausdrücklich erlaubt — und als einziger Bestand im Ländersatz
   mit Steckersolar („Plug & Play PV") als eigener Kategorie. Es fehlen nur Adresse,
   Koordinaten und der Monat. **Das Feld `counter` sieht dabei wie eine Stückzahl aus und
   ist eine laufende Nummer** — wer es aufsummiert, bekommt 617 Milliarden Anlagen. Der
   Befund steht erst nach der Gegenprobe über die Leistungssumme gegen den zweiten
   Datensatz fest.

3. **Frankreich ist groß, aber am entscheidenden Punkt stumpf.** Unterhalb von 36 kW —
   also bei praktisch jeder privaten Aufdachanlage — gibt es genau eine Zeile je Gemeinde
   ohne Zeitachse. Ein „Zubau 2025 in Ihrer Gemeinde" ist aus dem laufenden Datensatz
   **nicht** ableitbar, nur über die Differenz zweier Jahresschnappschüsse.

4. **Italien ist rechtlich zu, nicht technisch.** Das Register existiert (GAUDÌ), ist aber
   nicht offen; was offen ist, verbietet kommerzielle Nutzung wörtlich und untersagt
   zusätzlich den dauerhaften Download. Hier ist nichts zu holen, ohne vorher mit GSE oder
   Terna zu sprechen.

5. **Portugal ist der dritte Markt, in dem man sofort loslegen könnte.** Keine
   Einzelanlagen, aber Gemeinde *und* Ortsteil, Bestand als Monatsreihe seit 01/2023, Zubau
   als eigener Datensatz, CC BY 4.0 ausdrücklich, ein CSV-Abruf. Die Azoren-/Madeira-Lücke
   ist benennbar und betrifft rund 5 % der Bevölkerung.

6. **Österreich hat die besten Rohdaten und die zwei teuersten Lücken.** Das Register ist
   gesetzlich vorgeschrieben und enthält jede einzelne Anlage — aber **ohne
   Inbetriebnahmedatum gibt es keinen Zubau**, und ohne Gemeindeschlüssel muss die
   PLZ→Gemeinde-Zuordnung selbst gebaut werden (PLZ 6900 verteilt sich auf mindestens zwei
   Gemeinden und einen Ortsteil — gemessen). Dazu die ungeklärte Lizenz. **Ungeregelt ist
   schlechter als verboten**, weil man es nicht entscheiden kann.

7. **Spanien geht nur regional.** Katalonien und Valencia zusammen sind über 270.000
   Einzelanlagen mit Gemeindeschlüssel und tagesgenauem Datum — technisch sogar besser als
   das MaStR. Aber es sind zwei von siebzehn Regionen, Katalonien steht seit Dezember 2025
   still, und seine Lizenzlage ist unscharf.

8. **Die Niederlande liefern saubere Lizenzen und zu grobe Daten.** CBS: CC BY 4.0, offene
   API, 361 Gemeinden — aber Jahresbestände ohne Inbetriebnahmedatum. Der feinere
   Liander-Datensatz wird seit April 2024 nicht mehr gepflegt. Das eigentliche Register
   CERES rechnet monatlich und je Gemeinde aus — **veröffentlicht die Gemeindesicht aber
   nur als JPEG-Karte**, und ohne Lizenzangabe. Dort läge der Hebel, und er ist eine Mail
   weit.

## Offene Punkte

- **Wallonien ist nicht flächendeckend**: RESA (Region Lüttich) und die kleinen Betreiber
  fehlen auf ODWB. Wo die veröffentlichen, wurde nicht geprüft.
- **Brüssel: Lizenz ungeklärt.** Die Excel-Daten existieren, eine Datenlizenz wurde nicht
  gefunden.
- **Italien/GAUDÌ**: Es gibt keinen Beleg für einen öffentlichen Zugang, aber auch keinen
  geprüften Beleg für dessen Fehlen. Wer das weiterverfolgt, steuert das Portal selbst an.
- **Frankreich, Licence Ouverte 2.0**: Belegt ist, dass der Datensatz sie trägt; der
  Lizenztext selbst wurde nicht im Original gelesen.
- **Österreich, Lizenz**: Vor jeder Nutzung eine Anfrage an E-Control
  (`hkn-support@e-control.at`) plus eine Prüfung, ob das Informationsweiterverwendungsgesetz
  greift. Außenkontakt — **Entscheidung des Betreibers.**
- **Österreich, Vollabzug**: Die JSON-Schnittstelle antwortet, lief aber bei großen
  Ergebnismengen mehrfach ins Zeitlimit. Ob ein Vollabzug für Sonnenenergie praktisch
  machbar ist, ist **nicht zu Ende geprüft**.
- **Österreich/Portugal, Balkonkraftwerke**: In beiden Beständen nicht belegt — weder dafür
  noch dagegen.
- **Portugal, Inselregionen**: Azoren (EDA) und Madeira (EEM) fehlen bei E-REDES; ob diese
  Netzbetreiber eigene offene Daten haben, wurde nicht geprüft.
- **Spanien, Katalonien**: Lizenz (`SEE_TERMS_OF_USE`, Terms-Seite antwortet 404) und der
  Stillstand seit 12/2025 sind beide offen.
- **Spanien, drei Regionen**: Madrid, Euskadi und Castilla y León antworteten nicht auf ihre
  CKAN-APIs. **Abruf gescheitert — kein Beleg, dass dort nichts liegt.**
- **Niederlande, CERES/energieleveren.nl**: Der Download existiert und ist erreichbar, aber
  **ohne jede Lizenzangabe**. Die Gemeindedaten werden dort nur als Bilder veröffentlicht.
  Wer sie als Daten braucht, fragt `servicedesk@edsn.nl` — das ist die einzige auf der
  Seite genannte Adresse und Außenkontakt, also eine Entscheidung des Betreibers.
