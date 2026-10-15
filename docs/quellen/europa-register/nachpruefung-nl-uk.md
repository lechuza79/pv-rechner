# Nachprüfung Niederlande und Vereinigtes Königreich

**Erhoben am 23.09.2026.** Jede Aussage ist als `GEPRÜFT` (Seite selbst aufgerufen, Datei
selbst heruntergeladen, Zeilen selbst gezählt) oder `UNGEPRÜFT` gekennzeichnet. Ein
gescheiterter Abruf steht mit seinem Grund da und gilt **nicht** als Beleg dafür, dass es
die Quelle nicht gibt.

## Warum diese Nachprüfung nötig war

Die Vorrecherche (`west-sued.md`, `nord-ost-uk.md`) hat für beide Länder „nein" geurteilt.
Sie hat dabei eine **andere Frage** beantwortet als die, auf die es ankommt:

| Gestellte Frage | Beantwortete Frage |
|---|---|
| Lässt sich je Gemeinde sagen, wie viele Solaranlagen dort stehen, wie viel Leistung, und wie sich das entwickelt hat? | Gibt es ein öffentliches Register mit **Einzelanlagen**? |

Für Portugal galt eine reine Gemeinde-Aggregatstatistik als ausreichend. Nach demselben
Maßstab kippt das Urteil für die Niederlande vollständig und für das Vereinigte Königreich
teilweise.

**Die Vorrecherche hatte die entscheidende niederländische Quelle sogar schon in der Hand**
(CBS 85005NED) und sie unter „Nein — CERES existiert, offen ist davon nur eine bundesweite
Monatsreihe" abgelegt. Das ist die Antwort auf die Registerfrage, nicht auf die Gemeindefrage.

---

# NIEDERLANDE

## Urteil: Gemeindeseiten machbar — JA

Die beste Quelle ist das Statistikamt selbst, nicht ein Netzbetreiber und nicht das Register.

## 1. CBS StatLine 85005NED — die tragende Quelle

*Zonnestroom; vermogen en vermogensklasse, bedrijven en woningen, regio*
<https://opendata.cbs.nl/ODataApi/odata/85005NED/> (`GEPRÜFT`, alle Abrufe HTTP 200)

### Was drinsteht

| Angabe | Wert | Beleg |
|---|---|---|
| Regionen gesamt | 452 | `GEPRÜFT`, `/RegioS` gezählt |
| davon **Gemeinden** (`GM…`) | **361** | `GEPRÜFT` |
| dazu | 13 Provinzen, 41 ET-, 31 ES-Regionen, 5 Landesteile, Gesamt-NL | `GEPRÜFT` |
| Perioden | **2019–2025**, Jahresstand je 31.12. | `GEPRÜFT`, `/Perioden` |
| Datenzeilen gesamt | **28.476** (4.068 je Jahr) | `GEPRÜFT`, jahrweise abgerufen |
| Kennzahlen | `Installaties` (Anzahl), `OpgesteldVermogenVanZonnepanelen` (**kWp**), `OpgesteldVermogenOmvormers` (kW), `ProductieVanZonnestroom` (Mio. kWh) | `GEPRÜFT`, `/DataProperties` |

Die 361 Gemeinden sind die **Vereinigung über alle sieben Jahre** — die Niederlande hatten
2025 exakt 342 Gemeinden, und die Tabellenbeschreibung sagt dazu wörtlich (`GEPRÜFT`):

> „De regionale indeling is gebaseerd op de gemeentelijke indeling van het betreffende jaar."

Das ist dieselbe Lage wie bei den deutschen Gemeindeschlüsseln nach einer Fusion und mit
demselben Mittel zu lösen (Nachfolgerzuordnung), nur in kleinerem Maßstab.

### Neun Kategorien je Gemeinde und Jahr (`GEPRÜFT`, `/SectorEnVermogensklasse`)

`Alle economische activiteit en woningen` · **`Woningen`** · `A-U Alle economische
activiteiten` · `A Landbouw` · `D Energievoorziening` · **`Paneelvermogen: klein (t/m
15 kWp)`** · `Paneelvermogen: groot (>15 kWp)` · `groot op veld` · **`groot op dak`**

Also: **Wohnungen getrennt von Betrieben, Kleinanlagen getrennt von Großanlagen, und bei
den Großen Dach getrennt von Freifläche** — alles auf Gemeindeebene.

### Abdeckung — selbst nachgezählt

| Jahr | Gemeindezeilen | davon mit Anzahl **und** kWp |
|---|---|---|
| 2019 | 360 | 355 |
| 2022 | 360 | 345 |
| 2025 | 360 | **342 — also alle, die es 2025 gab** |

`GEPRÜFT`, über alle 22.680 Gemeindezeilen gerechnet. **Keine Unterdrückung kleiner Werte.**
Die kleinste Gemeinde der Niederlande, Schiermonnikoog (rund 950 Einwohner), steht 2025 mit
**313 Anlagen und 3.214 kWp** in der Tabelle. Ebenso Vlieland (402 / 3.415), Rozendaal
(439 / 2.635).

### Summenprobe gegen den Landeswert (`GEPRÜFT`, 2025, Kategorie „alles")

- **Anlagen:** Summe der Gemeinden 3.312.895 gegen Landeswert 3.313.355 → **99,99 %**
- **Leistung:** 28.980.590 kWp gegen 29.426.451 kWp → **98,48 %**

Der fehlende Rest steckt in der Zeile „Gemeenten; niet in te delen".

### Beispielzeile Amsterdam (`GEPRÜFT`, 63 Zeilen abgerufen)

| Jahr | alle Anlagen | alle kWp | davon Wohnungen | davon ≤ 15 kWp |
|---|---|---|---|---|
| 2019 | 14.872 | 89.583 | 13.115 / 38.027 kWp | 14.350 / 35.466 kWp |
| 2022 | 33.257 | 208.180 | 30.657 / 88.849 kWp | 32.155 / 81.940 kWp |
| 2025 | 51.617 | 339.795 | 46.616 / 142.068 kWp | 49.863 / 136.355 kWp |

### Zubau

**Kein Inbetriebnahmedatum.** Es sind Jahresbestände; der Zubau ergibt sich als Differenz
zweier Jahre, also für **2020–2025**. Für eine Zubau-Zeitleiste wie im deutschen Atlas
reicht das, für „welche Anlage kam wann" nicht.

### Was auf Gemeindeebene fehlt

Die **Stromproduktion**. Wörtlich (`GEPRÜFT`):

> „De productie van zonnestroom kan niet naar gemeenteniveau worden uitgesplitst. Bij
> productie is subRES-regio dus het laagste regionale schaalniveau."

Im Abruf bestätigt: `ProductieVanZonnestroom_4` ist in **allen** Gemeindezeilen `null`,
im Landeswert dagegen gefüllt (2019: 5.399 Mio. kWh).

### Aufdachanlagen von Privathaushalten enthalten?

**Ja, und ausdrücklich getrennt ausgewiesen** (`GEPRÜFT`): Kategorie `Woningen` und
Kategorie `≤ 15 kWp` stehen je Gemeinde und Jahr da. Balkonkraftwerke sind **keine eigene
Kategorie** (`GEPRÜFT` — in der Kategorienliste nicht vorhanden).

### Aktualität (`GEPRÜFT`, aus `/TableInfos`)

- `Modified`: **12.06.2026** · `Frequency`: `Tweemaalperjaar` · `Period`: 2019–2025
- Statusangabe: 2019–2023 endgültig, 2024 und 2025 „nader voorlopig"
- Angekündigt: „Medio november 2026 worden er voorlopige cijfers over de eerste helft van
  2026 toegevoegd."

### Lizenz

Der Lizenzsatz steht **in der Antwort der Schnittstelle selbst**, am Ende der
Tabellenbeschreibung (`GEPRÜFT`, wörtlich):

> „Copyright © Centraal Bureau voor de Statistiek, Bonaire/Den Haag/Heerlen
> Verveelvoudiging is toegestaan, mits het CBS als bron wordt vermeld."

Und auf der Copyright-Seite <https://www.cbs.nl/nl-nl/over-ons/website/copyright>
(`GEPRÜFT`, aus der Vorrecherche übernommen und hier nicht erneut aufgerufen —
`UNGEPRÜFT` in dieser Sitzung):

> „Hergebruik van de inhoud van deze website is naamsvermelding verplicht."

Kommerzielle Nutzung erlaubt, Quellenangabe Pflicht, kein Schlüssel, keine Anmeldung.

### Zugang

Offene OData-Schnittstelle, kein Schlüssel. **Zwei Fallen, beide selbst getroffen:**

1. `RegioS` ist auf **sechs Zeichen aufgefüllt** (`"NL01  "`). Ein Filter mit
   `RegioS eq 'GM0363 '` liefert **null Zeilen ohne Fehlermeldung** — die stille Sorte.
2. Der Endpunkt `/ODataApi/` unterstützt **kein `$skip`** (HTTP 500 mit ausdrücklichem
   Hinweis auf `ODataFeed`), und ein Abruf des ganzen Datensatzes ohne Filter endet
   ebenfalls in HTTP 500. Jahrweise filtern funktioniert (7 Abrufe, je 4.068 Zeilen).

---

## 2. Klimaatmonitor — dieselben Zahlen, schlechtere Lizenz

<https://klimaatmonitor.databank.nl/> (`GEPRÜFT`, HTTP 200), betrieben von ABF Research
im Auftrag des Wirtschaftsministeriums, Portal verwaltet von der RVO.

- **Solardaten je Gemeinde vorhanden** (`GEPRÜFT`): Meldung vom 01.09.2026 „Zonnestroom
  'achter de meter' 2025", aufgeteilt in Wohnungen / übrige Dachanlagen / Freiflächen.
  Die Aufteilung ist **dieselbe wie beim CBS**, und der Zeitpunkt passt zum CBS-Zyklus.
  Dass CBS die Quelle ist, ist **naheliegend, aber nicht belegt** (`UNGEPRÜFT` — die
  Quellenseite ist ein Skript-Dashboard und gab den Quellennachweis nicht her).
- **Zugang: Schnittstelle mit Schlüssel auf Antrag** (`GEPRÜFT`, API-Seite im Wortlaut):
  Name, Organisation, Mailadresse; die Mailadresse wandert auf den Newsletter-Verteiler;
  der Schlüssel darf nicht weitergegeben werden.
- **Die Nutzungsbedingungen erlauben ausdrücklich nur Behörden** (`GEPRÜFT`, wörtlich aus
  <https://klimaatmonitor.databank.nl/content/ods-gebruiksvoorwaarden>):

  > „We staan **(decentrale) overheden** toe de beschikbaar gestelde webservices vrij te
  > gebruiken, zolang u de applicatie niet zo zwaar belast dat andere gebruikers daar
  > hinder van ondervinden."

  Eine Weiterverwendungs-Lizenz (CC, offene Daten) steht **nirgends** auf der Seite
  (`GEPRÜFT` — gezielt gesucht). Dazu: „Het is niet de bedoeling dat u uw applicatie direct
  koppelt aan de Klimaatmonitor Open Data Service."

**Folge: kein Grund, sie zu nehmen.** Sie liefert vermutlich dieselben Zahlen wie das CBS
unter einer Erlaubnis, die uns nicht meint.

---

## 3. PDOK und das Nationaal Georegister — nichts Brauchbares

Über die Katalogschnittstelle des Georegisters gesucht (`GEPRÜFT`, CSW-Abfrage HTTP 200):

- Suchwort `zonnepanelen`: **16 Treffer** — ausschließlich **Solarparks** (Freifläche),
  Potenzialkarten („Zonpotentie zonnevelden", „Potentiele lokaties voor zonnepanelen op
  gebouwen") und Historienstände.
- Suchwort `zonnestroom`: **3 Treffer**, alle Solarparks bzw. Historie.

**Kein Geodatensatz zum Bestand an Dachanlagen.** Für unsere Frage wertlos.

---

## 4. Netzbetreiber

### Stedin — ein unerwarteter Fund: Zeitreihe 2011–2025 je Gemeinde

<https://www.stedin.net/zakelijk/open-data/opgesteld-vermogen> → `pir-per-gemeente.xlsx`
(`GEPRÜFT`, HTTP 200, 163.463 Byte, selbst gelesen)

- **17 Blätter**: „Totaal" plus ein Blatt je Jahr 2011–2025
- Stichtage im Totaal-Blatt: **31.12.2011 bis 31.12.2025**, dazu 30.06.2024 (`GEPRÜFT`,
  Excel-Seriennummern entschlüsselt)
- Spalten: `AANTAL_PRODUCTIE_INSTALLATIES`, `AANTAL_AANSLUITINGEN`,
  `OPGESTELD_VERMOGEN_CERES_MW`, Kategorie **„Kleiner dan 15 kW" / „Vanaf 15 kW"**
- Die Zelle „Op basis van **photovoltaic_nominal_p_value**" belegt, dass es **Solar** ist
  und nicht alle Erzeugungsanlagen (`GEPRÜFT`)
- **97 Gemeindezeilen** inkl. „TOTAAL" und historischer, inzwischen fusionierter Gemeinden

**Beispiel Alblasserdam, „Kleiner dan 15 kW"** (`GEPRÜFT`): 2011: 23 Anlagen / 0,04 MW →
2019: 629 / 2,33 MW → 2025: 2.516 / 9,99 MW.

**Lizenz** (`GEPRÜFT`, wörtlich aus <https://www.stedin.net/zakelijk/open-data/disclaimer>):

> „De gegevens mogen worden gekopieerd, verspreid, doorgegeven of hergebruikt, mits de naam
> van Stedin wordt vermeld: 'Stedin' gevolgd door het jaartal van publicatie."

Kommerzielle Nutzung ist damit gedeckt. **Ein Vorbehalt steht daneben, den man kennen muss**
(`GEPRÜFT`, wörtlich): „Zonder voorafgaande schriftelijke toestemming van Stedin is het niet
toegestaan links naar sites van Stedin aan te bieden." — ein Verlinkungsverbot in derselben
Erklärung, die eine Quellenangabe verlangt. Praktisch kaum durchsetzbar, aber vor einer
Nutzung zu klären.

**Grenze: nur das Stedin-Netzgebiet** (Utrecht, Südholland, Zeeland), also ein knappes
Fünftel der Niederlande. Als Ergänzung für eine längere Zeitreihe brauchbar, als
Landesquelle nicht.

### Liander — Nachbarschaftsebene, aber nicht gepflegt

Aus der Vorrecherche übernommen und hier **nicht erneut geprüft** (`UNGEPRÜFT` in dieser
Sitzung): CSV je CBS-Nachbarschaft, Stichtag 09.04.2024, CC BY 4.0, Untergrenze 5 Anlagen
je Nachbarschaft. In dieser Sitzung geprüft (`GEPRÜFT`): Die Open-Data-Seite führt neun
CSV/ZIP-Links, darunter **keinen aktuelleren Solar-Datensatz**.

### Enexis — nur auf Anfrage

<https://www.enexis.nl/over-ons/waar-staan-wij-voor/open-data> (`GEPRÜFT`, HTTP 200)

Der Datensatz **„Opwekdata kleinverbruikaansluitingen"** existiert, ist aber **kein
Download**: „Wilt u 1 of meer van deze datasets ontvangen? Vraag ze dan aan via onderstaande
knop. U ontvangt de dataset daarna direct in uw mailbox." Dazu: „Standaard bieden wij
datasets aan die tot maximaal **3 jaar** teruggaan." (beides `GEPRÜFT`, wörtlich)

---

## 5. CERES / energieleveren.nl — bestätigt, was die Vorrecherche fand

Nicht erneut abgerufen (`UNGEPRÜFT` in dieser Sitzung). Die Vorrecherche hat belegt: offene
CSV-Datei mit **96 Zeilen**, bundesweite Monatsreihe Jun-21 bis Aug-26 nach drei
Leistungsklassen, **ohne jede Gebietsangabe**; die Gemeindeauswertungen erscheinen nur als
JPEG-Karten; **keine Lizenzangabe** auf der ganzen Seite; die Leistungsangabe ist
**Wechselrichterleistung, nicht kWp** (rund 5 % unter dem Wattpeak-Wert).

**Für Gemeindeseiten unbrauchbar — und dank CBS auch nicht nötig.**

---

## Niederlande — Zusammenfassung

| Quelle | Ebene | Jahre | Anzahl | Leistung | Haushalts-Dach getrennt | Lizenz | Urteil |
|---|---|---|---|---|---|---|---|
| **CBS 85005NED** | **342 Gemeinden** | **2019–2025** | ja | ja (kWp) | **ja** | Quellenangabe, kommerziell frei | **tragend** |
| Stedin PIR | 97 Gem. (ein Netzgebiet) | 2011–2025 | ja | ja (MW) | nur ≤/> 15 kW | Quellenangabe | Ergänzung |
| Liander | Nachbarschaft | ein Stichtag 2024 | ja | ja (kW) | nein | CC BY 4.0 | veraltet |
| Klimaatmonitor | Gemeinde | wie CBS | ja | ja | ja | **nur Behörden** | fällt aus |
| Enexis | Postleitzahl | 3 Jahre | ja | ? | ? | auf Anfrage | fällt aus |
| CERES | **keine** | monatlich | ja | AC-kW | nein | **keine** | fällt aus |
| PDOK / Georegister | — | — | — | — | — | — | nichts vorhanden |

---

# VEREINIGTES KÖNIGREICH

## Urteil: Gemeindeseiten machbar — HALB

Es gibt eine ausgezeichnete, offen lizenzierte, elfjährige Zeitreihe mit Anzahl **und**
Leistung **und** Erzeugung je Gebietskörperschaft, in der Kleinanlagen und private
Dachanlagen enthalten sind. Sie war in der Vorrecherche gar nicht geprüft.

**Der Haken ist nicht die Datenlage, sondern der Zuschnitt der Gebietskörperschaften.**

## 1. DESNZ Regional Renewable Statistics — der Hauptbefund

<https://www.gov.uk/government/statistics/regional-renewable-statistics> (`GEPRÜFT`)
Datei: `Renewable_electricity_by_local_authority_2014_-_2024.xlsx`
(`GEPRÜFT`, HTTP 200, 3.687.163 Byte, selbst gelesen)

### Aufbau

**36 Blätter** (`GEPRÜFT`): Deckblatt, Inhalt, Notizen, dann je Jahr 2014–2024 ein Blatt
für **Sites** (Anlagenzahl), **Capacity** (MW) und **Generation** (GWh) — also 11 Jahre ×
3 Kennzahlen.

Spalten je Zeile (`GEPRÜFT`): `Local Authority Code` (amtlicher ONS-Code), `Local Authority
Name`, `Region`, `Country`, `Estimated number of households`, dann **je Technologie eine
Spalte**, darunter **`Photovoltaics`**.

### Abdeckung — selbst nachgezählt

| Jahr | Gebietskörperschaften | PV-Anlagen (Summe LA) | UK-Gesamtwert | zugeordnet |
|---|---|---|---|---|
| 2014 | 380 | 592.219 | 650.660 | 91,0 % |
| 2019 | 374 | 989.930 | 1.014.639 | 97,6 % |
| 2022 | 361 | 1.306.641 | 1.309.113 | 99,8 % |
| **2024** | **361** | **1.688.163** | **1.696.872** | **99,5 %** |

2024 nach Ländern (`GEPRÜFT`): England 294, Schottland 32, Wales 22, **Nordirland 11** —
das ganze Vereinigte Königreich. Nordirland fehlt in den Jahren vor 2014/2019, 2014 sind
nur England, Schottland und Wales als ONS-codierte Zeilen geführt.

**Unzugeordnet 2024: 54,8 MW von 18.279,9 MW = 0,3 %** (`GEPRÜFT`, Summenprobe:
17.611 MW in 359 sauber codierten Zeilen + Cumberland 78,9 + Somerset 534,8 + unallocated
54,8 = 18.279,9 = „Grand Total (UK)").

Die beiden Ausreißer sind ein Formatierungsfehler in der Datei (führendes Tabulatorzeichen
bzw. abweichende Codelänge), keine Datenlücke.

### Sind Kleinanlagen und private Dachanlagen enthalten?

**Ja — und das ist belegt, nicht geschlossen.**

Aus dem Methodikpapier `Renewables_methodology_note.pdf` (`GEPRÜFT`, selbst
heruntergeladen, wörtlich):

> „From 2010 to March 2019, it is assumed all new solar installations area captured in the
> current (listed) data sources. Since the closure of FiT in March 2019, only new solar
> installations which are registered with the **Microgeneration Certification Scheme (MCS)**
> are now captured in the data."

Aus dem Notizblatt der Tabelle selbst (`GEPRÜFT`, wörtlich):

> „Note 9 | For the first time in the 2021 survey of 2020, a **District Level breakdown of
> the MCS** (Microgeneration Certification Scheme) data have been included in the analysis
> for 2019 and 2020."

Aus dem Begleitartikel (`GEPRÜFT`, wörtlich):

> „in 2024, strong growth was observed in **small-scale and domestic solar installations**
> across each region of the UK."

> „North Yorkshire has the third highest number of sites and Aberdeenshire the fifth.
> However, they have significantly lower capacities and generation due to the **high
> proportion of small-scale domestic solar** in these local authorities."

**Die Behauptung „private Dachanlagen enden 2019" ist damit widerlegt.** Was 2019 endete,
ist die Einspeisevergütung als *Erfassungsweg*; seitdem trägt MCS, und MCS ist seit dem
Jahrgang 2019/2020 **auf Bezirksebene** in diese Tabelle eingearbeitet. Die gemessene
Wirkung: von 989.930 zugeordneten Anlagen (2019) auf 1.688.163 (2024), **plus 698.000 in
fünf Jahren**.

**Die echte Lücke, die bleibt:** Eine Dachanlage ohne MCS-Zertifizierung taucht seit
März 2019 nirgends auf. Wie groß dieser Anteil ist, sagt keine der geprüften Quellen
(`UNGEPRÜFT` — nicht ermittelbar aus den hier gelesenen Unterlagen).

### Mittlere Anlagengröße als Plausibilitätsprobe (`GEPRÜFT`, selbst gerechnet)

2014: 8,9 kW je Anlage · 2017: 15,1 · 2020: 12,9 · **2024: 10,8 kW**. Der Wert sinkt seit
2017 stetig — genau das Bild, das entsteht, wenn der Zubau überwiegend aus kleinen
Hausdächern kommt.

### Aktualität

- Zuletzt veröffentlicht: **30.09.2025**, Datenstand **2024** (`GEPRÜFT`)
- Nächste Veröffentlichung: „The next publication will be in September 2026" (`GEPRÜFT`,
  Deckblatt) — zum Zeitpunkt dieser Erhebung also unmittelbar fällig
- Erhebungsrhythmus: jährlich
- Revisionen für 2022 und 2023 im letzten Lauf (`GEPRÜFT`)

### Lizenz

**Open Government Licence v3.0** (`GEPRÜFT`, Fußzeile der Veröffentlichungsseite, wörtlich):

> „All content is available under the Open Government Licence v3.0, except where otherwise
> stated"

Kommerzielle Nutzung ausdrücklich erlaubt, Quellenangabe Pflicht.

### Der Haken: was eine „local authority" ist

**Median 60.500 Haushalte je Gebietskörperschaft** (`GEPRÜFT`, aus der Haushaltsspalte der
Datei gerechnet; Spanne 900 bis 423.500). Das sind grob 140.000 Einwohner im Mittel.

Zum Vergleich: die deutsche Gemeinde hat einen Median um 1.800 Einwohner, die
niederländische um 35.000. **Eine britische „local authority" entspricht damit eher einem
deutschen Landkreis als einer Gemeinde.**

361 Seiten für 68 Millionen Menschen sind kein Gemeinde-Atlas. Sie sind ein Kreis-Atlas —
und die Projektentscheidung, **keine** Landkreisseiten zu bauen, weil auf Kreisebene
praktisch nicht gesucht wird, gilt für diesen Zuschnitt genauso. Die Datenlage ist
hervorragend; die Frage, ob jemand danach sucht, ist damit nicht beantwortet.

---

## 2. Gibt es etwas Feineres für die Zeit nach 2019?

Vier Spuren geprüft. **Keine liefert flächendeckend eine feinere Ebene.**

### a) MCS-Datendashboard — kostenlos, aber nur mit Konto

<https://datadashboard.mcscertified.com/> (`GEPRÜFT`, im Browser gerendert)

Die Startseite sagt wörtlich (`GEPRÜFT`):

> „The MCS Data Dashboard is divided into two sections: Installation Insights and Installer
> Insights. Both can be filtered by year, **location**, technology type and installation
> type. **Image and data exports are also available for download** from each visualisation.
> The system will be updated every 24 hours as new installation data becomes available in
> the MID."

> „To access the MCS Data Dashboard for the first time, please **create an account** by
> providing your email address, your current role and choose a password."

**Gebietsebene: local authority** — belegt nicht aus der Oberfläche, sondern aus dem
Kartenskript der Anwendung (`GEPRÜFT`, `js/installation-uptake-map.js` selbst gelesen): es
lädt `mapsdata/local_authorities_february_2024-v3.json`, daneben Regionen und Länder.
**Also dieselbe Ebene wie DESNZ, nicht feiner.**

Die Anwendung ist eine Blazor-WebAssembly-Oberfläche; **eine offene Schnittstelle gibt es
nicht** (`GEPRÜFT`: sechs Pfade unter `/api/` probiert, alle liefern die HTML-Hülle;
öffentlich abrufbar ist allein die Geometriedatei mit 914.093 Byte). Eine Lizenzangabe zu
den Exporten habe ich nicht gefunden.

**Nicht weiter verfolgt, weil ein Konto anzulegen nicht in Frage kommt** — und weil die
Ebene ohnehin dieselbe wäre. Für Daten über das Dashboard hinaus gilt weiter der Befund
der Vorrecherche: „Any data provided that exists beyond The MCS Data Dashboard may incur a
charge."

### b) Energieausweise (EPC) — die stärkste Spur, und sie trägt trotzdem nicht

Das Portal ist umgezogen: `epc.opendatacommunities.org` leitet auf
<https://get-energy-performance-data.communities.gov.uk/> (`GEPRÜFT`, HTTP 200).

**Was drinsteht** (`GEPRÜFT`, Datenwörterbuch selbst heruntergeladen, 91 Felder):

| Feld | Bedeutung laut Wörterbuch, wörtlich |
|---|---|
| `PHOTO_SUPPLY` | „Whether the property generates electricity from solar panels. The proportion of the roof area (%) covered by solar panels is assessed. 0% means that the property does not have solar panels." |
| `LOCAL_AUTHORITY` | „The local authority the building is in. Uses the official ONS code for that local area." |
| `CONSTITUENCY` | ONS-Code des Wahlkreises |
| `INSPECTION_DATE`, `LODGEMENT_DATE` | Begehung bzw. Eintragung |
| `SOLAR_WATER_HEATING_FLAG` | Solarthermie, ja/nein |

**Die Lizenzlage ist günstiger als erwartet** (`GEPRÜFT`, wörtlich von
`/guidance/licensing-restrictions`):

> „**All data fields other than the address and postcode data** (address, address 1,
> address 2, address 3, postcode) available via this website are licensed under the
> **Open Government Licence v3.0**, which includes Ordnance Survey UPRNs."

Für Adresse und Postleitzahl gilt dagegen ein enger Zweckkatalog von Ordnance Survey und
Royal Mail. **Das trifft uns nicht:** `LOCAL_AUTHORITY` ist kein Adressfeld, eine Auszählung
je Gebietskörperschaft käme also vollständig aus OGL-lizenzierten Feldern.

**Woran es trotzdem scheitert — und das ist strukturell, nicht behebbar:**

1. **Der Bestand ist eine Stichprobe, kein Register.** Wörtlich (`GEPRÜFT`,
   `/guidance/how-the-data-is-produced`): „Buildings must have an EPC when **constructed,
   sold or let**". Und (`GEPRÜFT`, `/guidance/data-limitations`): „The register does not
   hold data for every domestic and non-domestic building […] **This data should not be
   interpreted as a true representation of the whole of the building stock** in England and
   Wales." Wer seine Anlage nach dem letzten Verkauf gebaut hat, steht mit ihr nicht drin —
   und das ist der Normalfall.
2. **Keine Leistung.** `PHOTO_SUPPLY` ist ein Prozentsatz der Dachfläche, keine kWp-Zahl.
   Eine Leistungsangabe lässt sich daraus nicht gewinnen, nur schätzen.
3. **Nur England und Wales.** Schottland hat ein eigenes Register, Nordirland ebenfalls.
4. **Widerspruchsrecht:** ausgenommen ist alles, wo „the owner or tenant of a building has
   requested that their data is opted out of public disclosure" (`GEPRÜFT`).
5. **Bulk-Download und Schnittstelle verlangen ein GOV.UK-One-Login-Konto** (`GEPRÜFT` —
   die Schnittstelle ohne Anmeldung liefert HTTP 301 auf die Anmeldeseite). Ein Konto
   anzulegen kommt nicht in Frage, deshalb konnte ich die Zahl der Datensätze mit
   Photovoltaik **nicht selbst auszählen** (`UNGEPRÜFT`, Grund: Anmeldepflicht).

**Fazit EPC:** als Zusatzmerkmal („wie viele verkaufte Häuser hatten Solar") interessant,
als Antwort auf „wie viele Dachanlagen stehen hier" untauglich. Die Quelle beantwortet eine
andere Frage, und ihre eigene Dokumentation sagt das ausdrücklich.

**Schottland:** das eigene Register verweist für Massendaten auf
<https://statistics.gov.scot/> (`GEPRÜFT`, Verweisseite gelesen: vier Extrakte, quartalsweise
aktualisiert). **Nicht erreicht** — die TLS-Verbindung kommt zustande, der Server
antwortet aber innerhalb von 25 bzw. 60 Sekunden mit gar nichts (`curl`-Abbruch 52, leere
Antwort). Das ist ein gescheiterter Abruf, **kein Beleg für Nichtexistenz**.

### c) Smart Export Guarantee — nur Regionen, kein Ortsbezug

Ofgem-Jahresbericht Jahr 5 (April 2024 bis März 2025), veröffentlicht 03.12.2025
(`GEPRÜFT`, PDF selbst heruntergeladen und gelesen).

Die geografische Auswertung (Abbildung 3.8) hat **genau elf Zeilen** (`GEPRÜFT`, im
Wortlaut gelesen): neun englische Regionen plus Schottland plus Wales. South East 48.584
Registrierungen / 273,29 MW, North East 6.489 / 38,76 MW.

**Keine Gebietskörperschaft, keine Postleitzahl, kein Nordirland.** Dazu der ausdrückliche
Vorbehalt (`GEPRÜFT`, wörtlich): „as Ofgem receives **anonymised** data from SEG licensees
they are unable to identify unique installations" — wer den Tarif wechselt, wird doppelt
gezählt.

**Für Ortsseiten unbrauchbar.**

### d) Netzbetreiber — feiner als die Gebietskörperschaft, aber nur streifenweise

Die Kataloge von vier der sechs Verteilnetzbetreiber sind über eine einheitliche
Schnittstelle abfragbar (`GEPRÜFT`).

| Netzbetreiber | Datensatz | Ebene | Zeilen | Stand | Lizenz | Zugang |
|---|---|---|---|---|---|---|
| **Northern Powergrid** | LCT Datasets Postal Sectors | **Postleitsektor** | 1.254 | 19.11.2025 | NPG Open Data Licence v1.0 | **offen** |
| Northern Powergrid | LCT Datasets Postal Districts | Postleitbezirk | 354 | 19.11.2025 | dto. | **offen** |
| UK Power Networks | LCT Connected by **LSOA** | **LSOA** (≈1.500 Einw.) | 36.624 | 18.09.2026 | CC BY 4.0 | **gesperrt** |
| UK Power Networks | LCT Connected (gesamt / Secondary) | Ortsnetzstation | 3.173 / 27.268 | 18.09.2026 | CC BY 4.0 | **gesperrt** |
| Electricity North West | **LCT – MCS Data** | Ortsnetzstation | 14.245 | 24.07.2026 | CC BY 4.0 | **nur mit Konto** |
| SP Energy Networks | LCT Connections SPD/SPM | ? | 397 / 337 | 30.06.2026 | **keine Angabe** | **gesperrt** |
| SP Energy Networks | DFES LCT by Local Authority | Gebietskörperschaft | 9.500 / 10.260 | 2026 | CC BY 4.0 | **gesperrt**, und **Prognose**, kein Bestand |

**Northern Powergrid selbst ausgewertet** (`GEPRÜFT`, 1.254 Zeilen als CSV exportiert):
Felder `number_of_pvs`, `customer_numbers`, `la_name`, dazu Geometrie. Ergebnis:
**156.260 Solaranlagen** über **34 Gebietskörperschaften** und 1.254 Postleitsektoren;
44 Sektoren tragen keinen Gebietsnamen.

**Die Gegenprobe zeigt, warum das DESNZ nicht ersetzt** (`GEPRÜFT`, gegen die
DESNZ-Anlagenzahlen 2024 gerechnet):

| Gebietskörperschaft | Northern Powergrid | DESNZ 2024 | Deckung |
|---|---|---|---|
| North Yorkshire | 13.204 | 22.983 | 57 % |
| Leeds | 9.704 | 13.417 | 72 % |
| Doncaster | 8.666 | 9.593 | 90 % |
| Northumberland | 8.149 | 12.908 | 63 % |

Der Grund ist die **Netzgrenze**, nicht die Datenqualität: ein Netzgebiet deckt sich nicht
mit einer Gebietskörperschaft. Wer diese Zahlen als Ortsbestand ausweist, weist für die
Hälfte der Orte einen Teilbestand als Gesamtbestand aus — eine falsche Zahl, die im Bild
nicht auffällt.

**Lizenz Northern Powergrid** (`GEPRÜFT`, im Browser im Wortlaut gelesen): eigene Lizenz
v1.0, ausdrücklich „Exploit the Information **commercially** and non-commercially",
Quellenangabe „Supported by Northern Powergrid Open Data". Nach eigener Aussage „based on
version 3.0 of the Open Government Licence and these terms are compatible with the Creative
Commons Attribution License 4.0".

**Electricity North West** (`GEPRÜFT`, Informationsseite im Browser gelesen): CC BY 4.0,
monatlich, Quelle ausdrücklich die MCS-Installationsdatenbank, aggregiert je
Ortsnetzstation, „Only those ENWL Substations feeding 5 or more customers are included".
Aber: „**Actual dataset content is available to registered users only**".

**Kein Netzbetreiber liefert eine Zeitreihe** — alle sind Momentaufnahmen ohne Jahresachse
(`GEPRÜFT`, Feldlisten geprüft: kein Datumsfeld).

**Nicht erreicht:**
- **National Grid Electricity Distribution** (`connecteddata.nationalgrid.co.uk`): HTTP 403
  über die Schnittstelle, im Browser eine Bot-Prüfung („Sicherheitsüberprüfung wird
  durchgeführt"). Nach Projektregel werden Bot-Prüfungen nicht weggeklickt. **Kein Befund,
  weder positiv noch negativ.**
- **SSEN** (`data-api.ssen.co.uk`): HTTP 403 mit dem Wortlaut „**Access restricted to UK for
  this endpoint**" (`GEPRÜFT`). Die Portalseite ist erreichbar und beschreibt den
  LCT-Datensatz als **Szenario-Prognose** bis 2050 („LCT uptake scenario projections […] to
  secondary substation and feeder level"), nicht als Bestand. Ein zweiter, bestandsbezogener
  Datensatz („aggregated to primary substations") wird in Suchergebnissen genannt, war von
  hier aus aber nicht abrufbar (`UNGEPRÜFT`, Grund: Geosperre).

### e) Schottland, Wales, Nordirland — nichts Feineres

**Schottland:** Der Energy Statistics Hub (<https://scotland.shinyapps.io/Energy/>) ist
erreichbar und trägt einen eigenen Hinweis (`GEPRÜFT`, im Browser gelesen):

> „We are currently experiencing technical difficulties in updating the Scottish Energy
> Statistics Hub. The latest data and analysis is currently provided through the quarterly
> energy statistics Scotland bulletins."

Die dort gezeigte Reihe endet bei **2022** (`GEPRÜFT`, Bildunterschrift „Scotland,
2000 – 2022"). Der Bereich „Local Energy" behandelt **gemeinschaftlich und lokal
betriebene** Anlagen, nicht den Gesamtbestand. **Schottland liefert nichts, was DESNZ nicht
schon hat**, und seine 32 Councils sind ohnehin die gröbsten Einheiten des Landes.

**Wales (22) und Nordirland (11)** sind in der DESNZ-Tabelle vollständig enthalten
(`GEPRÜFT`). Eine feinere eigene Quelle habe ich für beide **nicht gesucht** (`UNGEPRÜFT`) —
bei 11 bzw. 22 Einheiten wäre auch eine feinere Quelle kein Gemeinde-Atlas.

---

## Vereinigtes Königreich — Zusammenfassung

| Quelle | Ebene | Einheiten | Jahre | Anzahl | Leistung | Haushalts-Dach | Lizenz | Zugang |
|---|---|---|---|---|---|---|---|---|
| **DESNZ Regional Renewable Statistics** | Gebietskörperschaft | **361** | **2014–2024** | ja | ja (MW) | **ja, ab 2019 über MCS** | **OGL v3.0** | **offen** |
| MCS-Dashboard | Gebietskörperschaft | ≈361 | ab 2010 | ja | ja | ja | keine Angabe | **Konto** |
| EPC England/Wales | Gebietskörperschaft | — | ab 2012 | nur Stichprobe | nein | ja, aber unvollständig | OGL v3.0 für alles außer Adresse | **Konto** |
| Ofgem SEG | **Region** | **11** | jährlich | ja | ja | ja | OGL | offen |
| Northern Powergrid | **Postleitsektor** | 1.254 | **Momentaufnahme** | ja | nein | ja | NPG v1.0, kommerziell frei | offen |
| UKPN | **LSOA** | 36.624 | Momentaufnahme | ja | ja | ja | CC BY 4.0 | **gesperrt** |
| Electricity North West | Ortsnetzstation | 14.245 | Momentaufnahme | ja | ? | ja (MCS) | CC BY 4.0 | **Konto** |
| Schottischer Hub | Land | 1 | bis 2022 | — | ja | — | OGL | offen, veraltet |

---

# Antwort auf die Leitfrage

**„Wie viele Dachanlagen stehen heute in dieser Gemeinde?"**

- **Niederlande:** beantwortbar, für alle 342 Gemeinden, für 2019 bis 2025, mit Anzahl und
  kWp, mit Wohnungen und Kleinanlagen getrennt, kostenlos und kommerziell nutzbar. Der
  einzige Verlust gegenüber Deutschland ist das fehlende Inbetriebnahmedatum — Zubau nur
  als Jahresdifferenz.
- **Vereinigtes Königreich:** beantwortbar für **361 Gebietskörperschaften**, für 2014 bis
  2024, mit Anzahl, Leistung und Erzeugung, Kleinanlagen und private Dachanlagen enthalten,
  unter der offenen Regierungslizenz. **Aber:** eine britische Gebietskörperschaft ist im
  Median so groß wie ein deutscher Landkreis. Eine Ebene darunter gibt es flächendeckend
  und offen **nicht** — belegt durch: Ofgem nur elf Regionen, MCS und EPC nur mit Konto,
  Netzbetreiber nur streifenweise und ohne Zeitreihe, und bei den vier geprüften
  Netzbetreibern sind die feinsten Datensätze (LSOA, Ortsnetzstation) gesperrt oder
  kontenpflichtig.

**Die beste feine Spur, falls das je verfolgt wird:** UK Power Networks führt 36.624 Zeilen
auf LSOA-Ebene unter CC BY 4.0 — rechtlich also nutzbar. Sie sind nur nicht ohne
Zugangsantrag herauszubekommen, und sie decken allein Südostengland ab.

---

# Was nicht erreicht wurde

| Quelle | Grund | Was das heißt |
|---|---|---|
| `statistics.gov.scot` (schottische EPC-Extrakte) | TLS-Verbindung steht, Server antwortet nicht (leere Antwort nach 25 und 60 s) | **Ungeklärt**, nicht widerlegt |
| National Grid Electricity Distribution | HTTP 403; im Browser Bot-Prüfung | **Ungeklärt**; Bot-Prüfungen werden nicht weggeklickt |
| SSEN Daten-Schnittstelle | HTTP 403, „Access restricted to UK for this endpoint" | **Ungeklärt**; von einem britischen Server aus vermutlich erreichbar |
| MCS-Dashboard-Inhalte | Kontopflicht | Nicht gezählt; Ebene aber aus dem Kartenskript belegt |
| EPC-Massendaten (England/Wales) | GOV.UK-One-Login-Pflicht | Anzahl der Solar-Datensätze **nicht gezählt** |
| UKPN / ENWL / SPEN LCT-Daten | Zugangsantrag bzw. Kontopflicht | Zeilenzahl und Lizenz aus den Metadaten belegt, Inhalt nicht |
| Klimaatmonitor-Zahlen | Schlüssel auf Antrag | Nicht nötig — CBS ist besser lizenziert |
| Herkunft der Klimaatmonitor-Solardaten | Quellenseite ist ein Skript-Dashboard | CBS **naheliegend, nicht belegt** |

---

# Zwei Lehren für die nächste Länderrunde

1. **Der Maßstab muss vor der Recherche feststehen, nicht nach ihr.** Beide Länder waren
   mit „nein" abgelegt, weil ein Einzelanlagen-Register fehlt. Für Portugal galt dieselbe
   Lage als „ja". Ein Maßstab, der je Land anders angelegt wird, erzeugt keine Fehler, die
   auffallen — er erzeugt Länder, die grundlos fehlen.
2. **Ein Statistikamt schlägt ein Register.** In beiden Ländern liegt die brauchbare Quelle
   nicht bei den Netzbetreibern und nicht im nationalen Anlagenregister, sondern beim
   Statistikamt bzw. Ministerium: offen lizenziert, flächendeckend, mit Zeitreihe. Bei den
   Netzbetreibern liegt die feinere Auflösung — und der Zugang, der sie unbrauchbar macht.
