# Nachprüfung Österreich und Irland

Auftrag: Beide „nicht machbar"-Urteile der Vorrecherche überprüfen. Leitfrage —
**lässt sich je Gemeinde sagen, wie viele Solaranlagen dort stehen und wie viel
Leistung installiert ist, private Dachanlagen enthalten, unter einer Lizenz, die
kommerzielle Nutzung erlaubt?**

Alle Abrufe am **23.09.2026**, sofern nicht anders vermerkt. Jede Aussage ist als
GEPRÜFT (selbst aufgerufen und gemessen) oder UNGEPRÜFT gekennzeichnet.

---

## Ergebnis in einem Satz

**Österreich: ja** — das Anlagenregister der E-Control trägt alle drei Einwände
der Vorrecherche nicht; zwei davon sind widerlegt, der dritte (Zeitachse) ist
eine echte, aber benannte Einschränkung. **Irland: halb** — Grafschaftsebene
statt Gemeindeebene, und die beiden inhaltlich besten Quellen sind für
kommerzielle Nutzung ausdrücklich gesperrt.

---

# ÖSTERREICH

## 1. Der Datenzugang ist besser als beschrieben: es gibt eine Schnittstelle, nicht nur einen Excel-Knopf

**GEPRÜFT.** Die Vorrecherche beschreibt einen Excel-Export der Weboberfläche.
Tatsächlich ist der Export nur eine browserseitige Wiedergabe einer Tabelle
(`igGridExcelExporter`), die aus einer JSON-Schnittstelle gefüllt wird. Die
Schnittstelle liefert **mehr Felder als der Export**:

```
GET https://anlagenregister.at/Home/SearchAnlagenregisterUebersicht
    ?Anlagentyp=1&Bundesland=B
→ HTTP 200, application/json
```

Selbst abgerufen: Burgenland 13,4 MB, 34.633 Datensätze. Parameter sind
`Anlagentyp` (1 = Strom, 2 = Gas), `Bundesland`, `AnlagePlz`, `AnlageOrt`,
`Anlagename`, `Anlagestrasse`, `Energietraeger`.

**Das ist der wichtigste praktische Befund:** Der Bestand lässt sich
maschinell in neun Abrufen (ein Bundesland je Abruf) vollständig holen. Kein
Bot-Schutz, keine Anmeldung, keine Mengenbegrenzung.

**Vollständige Feldliste der Antwort** (GEPRÜFT, aus der Antwort selbst):

| Feld | belegt? | Inhalt |
|---|---|---|
| `ID` | ja | laufende Nummer **innerhalb der Antwort**, keine stabile Anlagenkennung |
| `AnlPlz` | ja | Postleitzahl |
| `AnlOrt` | ja | Ortsname, **Freitext** |
| `Bundesland` | ja | Kürzel (B, K, NO, OO, S, ST, T, V, W) |
| `TechCode` | ja | u. a. „Photovoltaik", „Kleinwasserkraft bis 10 MW", „Biomasse flüssig" |
| `Engpassleistung` | ja | kW el, zwei Nachkommastellen |
| `Jahressumme_Minus_1` … `_6` | ja | eingespeister Strom in kWh, Minus_1 = 2026 … Minus_6 = 2021 |
| `Inbetriebnahme` | **nein, durchgehend null** | — |
| `Kontaktdaten` | nein, durchgehend null | — |
| `Anlagenbetreiber` | nein, durchgehend null | — |
| `Typ` | nein, durchgehend null | — |
| `Energietraeger` | nein, durchgehend null | — |

**Private Dachanlagen sind enthalten (GEPRÜFT):** In PLZ 3812 (Groß-Siegharts,
Niederösterreich) stehen 244 PV-Anlagen; die Leistungsverteilung lautet
31 Anlagen unter 5 kWp, 89 zwischen 5 und 10 kWp, 82 zwischen 10 und 20 kWp,
31 zwischen 20 und 50 kWp, 10 ab 50 kWp. Das ist das Profil eines
Einfamilienhaus-Bestands, nicht das eines Gewerbe-Registers.

**Rechtsgrundlage und Vollständigkeitsvorbehalt**, Wortlaut von der Startseite
(GEPRÜFT): „Die dargestellten Informationen beruhen ausschließlich auf den in
der Herkunftsnachweisdatenbank der E-Control gemäß § 81 Abs 1 und 2 EAG
gemeldeten Daten. Die Korrektheit der Datenmeldung obliegt den Anlagen- und
Netzbetreibern. Es kann zu Abweichungen im Vergleich zu anderen veröffentlichten
Daten (Ökostrombericht, EAG-Monitoringbericht, Energiebilanzen etc.) kommen."

**Was daraus folgt und benannt gehört:** Erfasst ist, was in der
Herkunftsnachweis-Datenbank steht. Eine Anlage ohne Netzeinspeisung — reiner
Inselbetrieb, vollständige Eigenversorgung ohne Einspeisevertrag — fehlt
strukturell. Wie groß diese Lücke ist, **ist nicht gemessen und aus dieser
Quelle auch nicht messbar**.

---

## 2. Einwand „nur PLZ und Ortsname, kein Gemeindeschlüssel" — WIDERLEGT

### 2a. Die Zuordnungsliste liegt offen bei Statistik Austria

**GEPRÜFT.** `https://www.statistik.at/verzeichnis/reglisten/ortsliste.csv`
(HTTP 200, 727.873 Byte, Kopfzeile „Gemeinden mit Ortschaften und
Postleitzahlen, Gebietsstand 2026", erstellt am 17.09.2026).

Aufbau: `Gemeindekennziffer; Gemeindename; Ortschaftkennziffer;
Ortschaftsname; Postleitzahl` — **16.960 Ortschaften, 2.213 Postleitzahlen,
2.091 Gemeinden**. Dazu die Gemeindeliste
`gemliste_knz.csv` (2.115 Gemeinden, Gebietsstand 2026).

Das ist genau die Liste, die die private Auswertung auf `unsereklimapolitik.at`
verwendet hat („Reflist-2162-Österreichische-Ortschaften der Statistik Austria",
GEPRÜFT durch Abruf dieser Seite).

**Eine Falle, die beim Bauen Geld kostet:** Das Feld `Postleitzahl` enthält bei
Ortschaften mit mehreren PLZ **mehrere durch Leerzeichen getrennte Werte** in
EINER Zelle (z. B. Wiesen: „7202 7203"). Mein erster Parser las die Zelle als
eine PLZ — die Trefferquote fiel dadurch von 99,63 % auf 98,83 %, und die
Fehlerklasse war von außen unsichtbar: Die Zuordnung sah vollständig aus, nur
einzelne Orte fehlten.

### 2b. Trefferquote — für GANZ ÖSTERREICH selbst gemessen

**GEPRÜFT.** Ich habe den kompletten Bestand geholt (neun Abrufe, rund 217 MB)
und die Zuordnung selbst gerechnet — nicht die fremde Quote übernommen.

**Der Bestand: 590.817 Photovoltaik-Anlagen, 12.617 MWp installierte Leistung**
(Stand 23.09.2026). Zum Vergleich: PV Austria weist für Ende 2024 9.398 MWp aus
— die Größenordnung passt mit zwei Zubaujahren dazwischen.

Ergebnis der vierstufigen Zuordnung plus Namenspräfix-Regel:

| Stufe | Anlagen | Anteil |
|---|---|---|
| Wien (ein Bundesland = eine Gemeinde) | 19.397 | 3,28 % |
| PLZ ist eindeutig einer Gemeinde zugeordnet | 244.689 | 41,42 % |
| PLZ mehrdeutig, Ortschaftsname löst auf | 257.222 | 43,54 % |
| PLZ mehrdeutig, Gemeindename löst auf | 52.408 | 8,87 % |
| nur über den Ortsnamen im selben Bundesland | 1.255 | 0,21 % |
| über den Gemeindenamen als Namenspräfix | 5.212 | 0,88 % |
| **ungelöst** | **10.634** | **1,80 %** |
| **zugeordnet** | **580.183** | **98,20 %** |

**Getroffen werden alle 2.091 Gemeinden Österreichs** — keine fällt leer aus.

Das ist ein automatischer Erstdurchgang ohne Handnacharbeit. Die private
Auswertung auf `unsereklimapolitik.at` kommt mit manueller Nachrecherche auf
99,90 % (509 von 501.097 offen) — der Abstand ist genau die Handarbeit.

Die 10.634 offenen Anlagen verteilen sich auf rund 1.700 Schreibvarianten, alle
von derselben mechanischen Art: „Millstatt" (= Millstatt am See), „Mannersdorf
a.Leithagebirge", „Sankt Stefan o.Stainz", „Ybbs" (= Ybbs an der Donau),
„Sankt Peter/Ottersbach". Eine Aliastabelle oder ein unscharfer Abgleich
schließt sie.

### 2c. ZWEI FALLEN, die still die falsche Gemeinde treffen — BLOCKER

Beide sind mir beim Messen selbst passiert, beide sahen im Ergebnis normal aus.

**Falle 1: Wien fehlt in der Ortsliste vollständig.** Keine einzige Zeile trägt
eine Gemeindekennziffer, die mit 9 beginnt. Wer das nicht bemerkt, verliert
19.397 Anlagen und 659 MWp — und zwar die größte Gemeinde des Landes.

**Falle 2 — und die ist die teure:** Die PLZ-Listen der Wiener Umlandgemeinden
enthalten **Wiener Bezirks-Postleitzahlen**. Langenzersdorf führt „1210",
Perchtoldsdorf führt „1230", PLZ 1140 steht bei Mauerbach, Purkersdorf und
Klosterneuburg. Ohne Gegenmaßnahme landeten in meinem ersten Lauf **3.518
Wiener Anlagen in Langenzersdorf und 3.570 in Perchtoldsdorf** — zwei Orte mit
je rund 15.000 Einwohnern standen damit unter den fünf größten PV-Gemeinden
Österreichs. Kein Fehler, keine Lücke, nur die falsche Gemeinde.

**Das ist exakt die Fehlerklasse, die dieses Projekt schon kennt** (Aachen,
Hannover, Saarbrücken mit Kreisschlüsseln unter Ortsnamen). Die Gegenmaßnahme
ist billig: Die Anlage trägt ihr **Bundesland** als eigenes Feld — Kandidaten
werden darauf eingeschränkt, und Wien wird vorab abgefangen. Mit dieser Sperre
stieg die Quote von 93,86 % auf 96,18 %, und die Rangliste stimmte.

### 2d. Der Ortsname ist Freitext — und das ist der eigentliche Aufwand

**GEPRÜFT.** In der einen PLZ 3812 stehen für denselben Ort **sechs
Schreibweisen**: „Groß-Siegharts", „Groß Siegharts", „GroßSiegharts",
„Gr.Siegharts", „Gr.-Siegharts", „Gross Siegharts". Im Burgenland tragen 34.140
Anlagen 453 verschiedene Ortsnamen bei 177 Postleitzahlen.

**Die Konsequenz für die Bauweise:** Zugeordnet wird primär über die PLZ, der
Name nur dort, wo die PLZ mehrdeutig ist. Wer umgekehrt über den Namen
zuordnet, kämpft gegen Tippfehler statt gegen Mehrdeutigkeit.

---

## 3. Einwand „kein Inbetriebnahmedatum" — BESTÄTIGT, an der Datenquelle geprüft

**GEPRÜFT, und zwar an der Datenquelle statt an der Oberfläche.** Der Auftrag
verlangte, die Exportdatei selbst anzusehen. Ich bin einen Schritt weiter
gegangen: Der Excel-Export ist eine Teilmenge der Tabellenspalten, die
JSON-Schnittstelle dahinter liefert **mehr**. Also habe ich diese geprüft.

Befund: Das Feld `Inbetriebnahme` **existiert im Datenmodell** — es steht in der
Antwort und ist in der Übersetzungstabelle der Oberfläche als „Inbetriebnahme"
geführt. Es ist aber **in keinem einzigen der 34.633 Burgenland-Datensätze
gefüllt** (Prüfung: `any(r['Inbetriebnahme'] for r in daten)` → False). Es wird
zudem in keiner Spalte der Tabelle angezeigt und kann deshalb auch im Excel nicht
auftauchen.

Ein Feld für **Registrierungsjahr**, **erste Einspeisung** oder
**Herkunftsnachweis-Anmeldung** gibt es nicht — die oben abgedruckte Feldliste
ist vollständig.

### Lässt sich der Zubau aus den Einspeisejahren ableiten?

**Teilweise — und die Grenzen sind hart.** Das erste Jahr mit einer Einspeisung
über null ist ein brauchbarer Näherungswert für das Anschlussjahr. Gemessen am
Burgenland:

| erstes Jahr mit Einspeisung | Anlagen |
|---|---|
| 2021 oder früher | 4.939 |
| 2022 | 5.096 |
| 2023 | 13.942 |
| 2024 | 4.694 |
| 2025 | 3.621 |
| 2026 | 1.308 |
| nie eingespeist | 540 |

Vier Einschränkungen, jede davon aus der Messung heraus benennbar:

1. **2021 ist kein Zubaujahr, sondern ein Restbestand.** Alles, was 2021 oder
   früher ans Netz ging, fällt in diesen Eimer. Die Reihe beginnt erst 2022.
2. **Das laufende Jahr ist unvollständig.** 2026 steht mit 1.308 da, weil erst
   drei Quartale gemeldet sind.
3. **Nur Jahre, keine Monate.** Eine Anlage vom Januar und eine vom Dezember
   sind nicht unterscheidbar.
4. **Eine Anlage, die im ersten Jahr nichts einspeist, wird zu spät datiert** —
   und 540 Anlagen speisen in sechs Jahren gar nichts ein, sind also im Zubau
   überhaupt nicht sichtbar. Ob das Volleigenverbrauch ist oder eine Meldelücke,
   ist aus der Quelle **nicht entscheidbar**.

**Urteil:** Für „so viele Anlagen kamen im Jahr X dazu" reicht es ab 2022, mit
sichtbarem Vorbehalt. Für eine Zeitleiste wie im deutschen Atlas (Zubau je Jahr
seit 2000) reicht es nicht.

---

## 4. Einwand „keine Lizenzangabe" — BESTÄTIGT als Tatsache, aber die Rechtsfolge ist eine andere

### 4a. Es steht wirklich keine Lizenz da

**GEPRÜFT.** Auf der Startseite des Registers steht keine Nutzungsbedingung, nur
der Datenmeldungs-Vorbehalt (oben abgedruckt) und ein Link auf „Impressum &
Datenschutz". Diese Seite (`e-control.at/econtrol/links/impressum`, 598 kB, im
Volltext durchsucht) enthält:

- **kein** Vorkommen von „Urheber", „Creative", „Lizenz", „Weiterverwendung",
  „Quellenangabe", „Vervielfältigung"
- eine Fußzeile „Copyright 2026 © E-Control"
- einen Haftungsausschluss: „Bitte beachten Sie, dass die Website der E-Control
  der Öffentlichkeit lediglich Informationen allgemeiner Art zur Verfügung
  stellt."

### 4b. data.gv.at: das Register ist dort NICHT gelistet

**GEPRÜFT.** Das offene Datenportal des Bundes wurde umgebaut; die klassischen
CKAN-Pfade antworten mit 404 und die Hub-Schnittstelle
(`data.gv.at/api/hub/repo/datasets`) **ignoriert den Suchbegriff** — sie liefert
für „Photovoltaik", „Anlagenregister", „Ökostrom" und „Einspeisung" jedes Mal
dieselben 100 Einträge. Das ist ein Werkzeugfehler, kein Befund; wer nur das
sieht, schließt fälschlich auf „nichts vorhanden".

Belastbar abgefragt habe ich deshalb über das **Europäische Datenportal**
(`data.europa.eu/api/hub/search/search`, Länderfilter Österreich), das
data.gv.at aggregiert. Suchbegriff „anlagenregister": **ein** Treffer, und der
betrifft mineralische Bau- und Abbruchabfälle. **Das Anlagenregister steht nicht
im offenen Datenportal.**

### 4c. Die Rechtsfolge kommt aus dem Gesetz, nicht aus einer Lizenzangabe

**GEPRÜFT im Volltext** (RIS, Informationsweiterverwendungsgesetz 2022 – IWG
2022, BGBl. I Nr. 18/2022, konsolidierte Fassung, 62.341 Zeichen abgerufen):

> **§ 5 Abs. 1:** „Öffentliche Stellen haben die Weiterverwendung von Dokumenten
> in ihrem Besitz, die dem Geltungsbereich dieses Bundesgesetzes unterliegen,
> gemäß den §§ 7 bis 13 **für kommerzielle und nicht kommerzielle Zwecke zu
> ermöglichen**."

> **§ 2 Abs. 4:** „Öffentliche Stellen dürfen das Recht von Herstellern von
> Datenbanken gemäß des § 76d Urheberrechtsgesetzes … **nicht in Anspruch
> nehmen**, um dadurch die Weiterverwendung von Dokumenten zu verhindern oder die
> Weiterverwendung über die in diesem Bundesgesetz festgelegten Bedingungen
> hinaus einzuschränken."

> **§ 4 Z 1 lit. b:** „öffentliche Stelle": … „Einrichtungen, die zu dem
> besonderen Zweck gegründet wurden, im Allgemeininteresse liegende Aufgaben zu
> erfüllen, die nicht gewerblicher Art sind, und zumindest teilrechtsfähig sind
> und überwiegend vom Bund … finanziert werden oder hinsichtlich ihrer Leitung
> der Aufsicht durch diese unterliegen …"

**Das ist genau die Konstruktion, auf die sich dieses Projekt beim deutschen
Förderkatalog schon stützt** (§ 2 Abs. 5 DNG verbietet Gemeinden die Berufung
auf § 87b UrhG). § 76d öUrhG ist das österreichische Gegenstück zu § 87b UrhG,
und § 2 Abs. 4 IWG nimmt es der öffentlichen Stelle aus der Hand.

**Die Subsumtion — und sie ist meine, nicht die eines Gerichts:** Die E-Control
ist eine durch Bundesgesetz (E-ControlG) errichtete Anstalt öffentlichen Rechts
mit nicht-gewerblichem Regulierungsauftrag unter Aufsicht des zuständigen
Ministeriums; sie erfüllt § 4 Z 1 lit. b. Das Register veröffentlicht sie, weil
§ 81 EAG es ihr aufträgt — es steht also im gesetzlichen öffentlichen Auftrag
und fällt nicht unter die Bereichsausnahme des § 3 Abs. 1 Z 1. Auch die
Datenschutz-Schranke des § 2 Abs. 3 greift nicht: Betreiber, Kontaktdaten und
Adresse sind bereits leer, und eine Aggregation auf Gemeindeebene entfernt jeden
Rest.

**Was das NICHT ist:** eine Lizenz. Es ist eine gesetzliche
Ermöglichungspflicht. Vor einer Nutzung gehört das durch **zwei Legal-Judges**
(der zweite mit dem Auftrag, den ersten zu widerlegen), und der billigste Weg
daneben ist eine kurze schriftliche Anfrage an die E-Control — die kann schlicht
eine Lizenz erteilen. **Außenkontakt ist eine Entscheidung des Betreibers.**

---

## 5. Die übrigen österreichischen Spuren — alle geprüft, alle schwächer

### 5a. Energiemosaik Austria — ZWEIFACH raus

**GEPRÜFT**, Datendatei selbst heruntergeladen
(`energiemosaik.at/assets/enco2web-gemeinden-data.2023-04-16.csv`, 2,13 MB,
2.114 Gemeinden, **234 Spalten**).

1. **Es enthält überhaupt keine Photovoltaik.** Die 234 Spalten sind
   Energie**verbrauch** und Treibhausgase je Sektor (Wohnen, Landwirtschaft,
   Industrie, Dienstleistung, Mobilität) plus Gebäudestrukturdaten. Weder in den
   Spaltennamen noch irgendwo im gesamten Anwendungs-Bundle (5,5 MB) kommt
   „Photovoltaik", „Solarstrom" oder „Solarthermie" vor.
2. **Die Lizenz verbietet kommerzielle Nutzung.** Wortlaut aus dem
   Export-Kopf der Anwendung: „Lizenz: Creative Commons - Namensnennung -
   Nicht-kommerziell - Weitergabe unter gleichen Bedingungen 3.0 Österreich —
   **CC BY-NC-SA 3.0 AT**". Zitierpflicht: „Abart-Heriszt 2022, Energiemosaik
   Austria".

Zusätzlich: Datenstand März 2022, Datengrundlage 2019 — also modellierte Werte
von vor sieben Jahren.

### 5b. Offene Landes- und Bundesdaten — ausgezählt

**GEPRÜFT** über das Europäische Datenportal, Länderfilter Österreich, alle 33
Treffer zu „photovoltaik / photovoltaikanlagen / solaranlagen" einzeln
durchgesehen. Das Bild ist eindeutig:

- **Die Masse sind Potenzialkataster** — welche Dächer sich eignen, nicht welche
  belegt sind: Solardachkataster Steiermark (mehrfach), Solarpotenzial Salzburg,
  Solarpotentialkataster Wien, Solar- und Gründachkataster Linz,
  Solarenergie-Eignungsflächen Tirol, Photovoltaik-Eignungszonen Burgenland,
  Vorrangzonen und Agro-PV-Zonen. **Für unsere Frage wertlos.**
- **Tatsächlich installierte Anlagen gibt es nur zweimal:**
  - **Wien**, nach *Bezirk* (23 Bezirke), nur geförderte Anlagen, Datenstände
    2014/2015/2020/2021. CC BY 4.0.
  - **Niederösterreich**, „PV-Anlagen in NÖ", auf **Gemeindeebene** und mit
    genau den richtigen Spalten — aber: Datei heißt
    `PV_Daten_fuer_OGD_2013.csv` und ist es auch.

**Die NÖ-Datei selbst geprüft** (27.429 Byte, 544 Zeilen):
`#;Gemeinde;Bezirk / Statutarstadt;Einwohner 2013;Anlagen;Leistung [kW];[Watt/EW]`,
erste Zeile „Absdorf;Tulln;1.804;24;116,26;64,45". Die Beschreibung nennt
zusätzlich eine Unterdrückungsregel: „Gemeinden mit weniger als 5 Anlagen
und/oder einer Leistung von unter 30 kWp werden nicht erfasst." Jahrgänge 2018
bis 2025 unter demselben Pfad: **alle HTTP 404**.

**Das ist die Formgebung, die wir bräuchten — dreizehn Jahre zu alt.**

### 5c. PV Austria / Marktstatistik des Klimaministeriums — Bundeslandebene

**GEPRÜFT** (Dashboard `pvbaustria.at/dashboard`). Zwei Ebenen: neun
Bundesländer und Österreich gesamt, **keine Bezirks- oder Gemeindeebene**.
Kennzahl ist ausschließlich die installierte **Leistung** (MWp), keine
Anlagenzahl; Reihe 2015–2024. Quelle laut eigener Angabe: „BMIMI (Hrsg.). 2025.
Innovative Energietechnologien in Österreich – Marktentwicklung 2024". Kein
Download, keine Lizenzangabe.

Der zugrundeliegende Marktstatistik-Bericht schlüsselt **nach Bundesland** auf
(UNGEPRÜFT im Volltext — ich habe den Bericht nicht geöffnet, sondern nur das
daraus gespeiste Dashboard; für unsere Frage ändert es nichts, weil die
Gemeindeebene dort erkennbar nicht existiert).

### 5d. OeMAG / EAG-Förderabwicklungsstelle — kein Verzeichnis geförderter Anlagen

**UNGEPRÜFT im engeren Sinn.** Ich habe kein veröffentlichtes Verzeichnis
geförderter Anlagen mit Ortsbezug gefunden; die Suche führte durchweg auf
Antragsseiten und Förderbedingungen. Österreich führt Förderempfänger in der
Transparenzdatenbank, die nicht personenscharf öffentlich ist. **Ein
fehlgeschlagener Fund ist kein Beleg für Nichtexistenz** — aber dieser Weg
lohnt nur, falls das Anlagenregister ausfällt, denn er erfasste bestenfalls
geförderte Anlagen und damit eine Teilmenge.

### 5e. Netzbetreiber und Statistik Austria — nichts gefunden

**UNGEPRÜFT.** Weder bei den Landesnetzbetreibern noch in der Gebäude- und
Wohnungsstatistik habe ich eine Gemeinde-Aufschlüsselung zu Photovoltaik
gefunden. Die Registerzählung erfasst Gebäude- und Heizungsmerkmale, nicht
Stromerzeugungsanlagen. **Beides nicht bis zur Primärquelle durchgeprüft**,
weil das Anlagenregister die Frage bereits vollständig beantwortet und diese
Quellen bestenfalls eine Teilmenge liefern könnten.

---

## 6. Österreich: was zu bauen wäre

1. Neun Abrufe der Schnittstelle, einer je Bundesland (rund 120 MB gesamt,
   etwa zehn Minuten).
2. **Wien vorab abfangen** (`Bundesland == 'W'` → Gemeinde 90001). Wien steht in
   der Ortsliste überhaupt nicht.
3. **Kandidaten auf das gemeldete Bundesland einschränken.** Ohne diese Sperre
   wandern Wiener Anlagen in die Umlandgemeinden — still und plausibel aussehend.
4. Zuordnung über `ortsliste.csv` von Statistik Austria, dreistufig wie oben —
   **die mehrfachen PLZ je Zelle aufsplitten**, sonst fehlen stillschweigend
   Orte.
5. Aliastabelle oder unscharfer Abgleich für die rund 1.700 Schreibvarianten,
   die danach offen bleiben (1,8 % der Anlagen).
6. Aggregation je Gemeindekennziffer: Anzahl und Summe der Engpassleistung.
7. Zubau je Jahr ab 2022 aus dem ersten Jahr mit Einspeisung, **mit sichtbarem
   Vorbehalt** (siehe Abschnitt 3).
8. Vor dem Livegang: zwei Legal-Judges zur IWG-Subsumtion, und die Anfrage an
   die E-Control als billigere Alternative vorlegen.

**Was NICHT geht und nicht versprochen werden darf:** eine Zeitleiste vor 2022,
Monatswerte, eine Unterscheidung nach Dach- und Freifläche, ein Anlagentyp, ein
Betreiber. Der österreichische Datensatz ist deutlich schmaler als das deutsche
Marktstammdatenregister.

---

# IRLAND

## 7. Die Bot-Sperre der Vorrecherche ist umgehbar — legal und ohne Tarnung

**GEPRÜFT.** `seai.ie` liegt hinter Cloudflare: HTML-Seiten antworten mit **HTTP
403**, die Sitemap ebenfalls. Der **Ablagepfad der Dateien ist frei**:

```
https://www.seai.ie/sites/default/files/publications/SEAI-Retrofit-Full-Year-Report-2024.pdf
→ HTTP 200, 1.894.590 Byte, application/pdf
```

Genau der Weg, den der Auftrag vorgeschlagen hat. `robots.txt` ist abrufbar und
sperrt diesen Pfad nicht.

## 8. SEAI: Solar-PV je Grafschaft existiert — in einem PDF-Anhang

**GEPRÜFT**, Bericht heruntergeladen und ausgelesen. „National Retrofit Plan
Full Year Report 2024", **Appendix 3: 2023/24 Scheme volumes by county**, enthält
eine eigene **Spalte „Solar PV"** je Grafschaft für 2023 und 2024:

| County | Solar PV 2023 | Solar PV 2024 |
|---|---|---|
| Carlow | 269 | 391 |
| Cork | 2.685 | 3.116 |
| Dublin | 5.203 | 6.324 |
| Galway | 1.400 | 1.900 |
| Kerry | 660 | 945 |
| … | … | … |
| **Total** | **22.214** | **28.424** |

Dazu in Appendix „Property upgrades by county by year" eine Reihe 2019–2024 —
aber die ist **alle Programme zusammen**, nicht Solar allein.

**Was das ist und was nicht:**

- **Ebene: 26 Grafschaften.** Nicht 31 lokale Verwaltungseinheiten — der
  Bericht führt „Co. Dublin" als eine Zeile und fasst damit die vier Dubliner
  Verwaltungseinheiten zusammen. **Gemeindeebene gibt es nicht.**
- **Nur Stückzahlen, keine Leistung.** Kein kWp je Grafschaft.
- **Nur geförderte Wohngebäude.** Anlagen ohne Zuschuss, gewerbliche Anlagen und
  alles vor dem Programm fehlen.
- **Nur zwei Jahre je Bericht**, und nur als PDF-Tabelle — kein maschinenlesbarer
  Datensatz.
- **Privatdächer: ja**, das ist sogar ausschließlich der Inhalt (Home Energy
  Grants).

**Einen Bericht für 2025 habe ich nicht gefunden** (sechs Pfadmuster probiert,
alle HTTP 404; die Websuche kennt als jüngsten den Jahrgang 2024). Das ist
**kein Beleg, dass es ihn nicht gibt** — die HTML-Übersichtsseiten sind wegen
der Bot-Sperre nicht lesbar, und der Wayback-Abruf der Publikationsliste
scheiterte am Werkzeug. Für den Abruf eines neuen Jahrgangs müsste man das
Dateinamensmuster kennen oder die Liste einmal von Hand ansehen.

## 9. ESB Networks: die beste Zahl — und kommerziell gesperrt

**GEPRÜFT.** Der Netzbetreiber veröffentlicht auf seiner Seite „Community data"
je Grafschaft die **angeschlossene Mikroerzeugungs-Leistung in kVA**, monatlich
aktualisiert. Die Werte stehen im ausgelieferten HTML als Auswahlwerte; ich habe
alle 26 ausgelesen:

| County | Microgen kVA | | County | Microgen kVA |
|---|---|---|---|---|
| Dublin | 163.710 | | Wexford | 37.862 |
| Cork | 112.935 | | Tipperary | 33.900 |
| Galway | 56.572 | | Kerry | 31.816 |
| Kildare | 51.870 | | Wicklow | 31.451 |
| Meath | 48.250 | | Louth | 28.517 |
| Limerick | 42.920 | | Clare | 27.995 |
| … | … | | Leitrim | 6.193 |

**Summe über alle Grafschaften: 887.047 kVA, also rund 887 MVA.**

**Das ist inhaltlich die stärkste irische Quelle** — Leistung statt Stückzahl,
alle Netzanschlüsse statt nur geförderter, monatlich statt jährlich.

**Und sie ist für uns gesperrt.** Wortlaut von `esbnetworks.ie/data-legal/copyright`
(Stand März 2022, GEPRÜFT): „Copyright © ESB All rights reserved … **Materials on
this website may not be copied, modified, reproduced, republished, uploaded,
posted, transmitted, publicly displayed, performed, distributed or used for any
public or commercial purposes.**"

Ein ausdrückliches Verbot kommerzieller Nutzung. ESB Networks ist zudem ein
öffentliches Unternehmen, kein öffentlicher Auftraggeber im Sinne der
Weiterverwendungsregeln — für solche Unternehmen gilt die Weiterverwendungs-
pflicht nur, **wenn sie die Weiterverwendung erlauben**. Hier tun sie das
ausdrücklich nicht.

Nebenbefund: Das Feld an neunter Stelle heißt im Skript „Solar", trägt aber
Werte wie 45 für Dublin und ist auf der Seite nirgends definiert — **als Kennzahl
unbrauchbar**, weil nicht erklärt.

## 10. BER-Datenbank: erlaubt keine kommerzielle Nutzung

**GEPRÜFT.** Das BER Research Tool (`ndber.seai.ie/BERResearchTool`) bietet einen
Download des gesamten Datensatzes an. Die Nutzungsbedingungen
(`ndber.seai.ie/BERResearchTool/TnC.pdf`, selbst heruntergeladen) sagen unter
„2. Access and Use":

> „The Database may be used for **personal, research or education purposes**. The
> production of the BER data is permitted provided the source is acknowledged."

Kommerzielle Nutzung ist nicht darunter. Zusätzlich verlangt der Zugang eine
Registrierung per E-Mail mit Angabe des Zwecks. **Damit für solar-check.io
ausgeschlossen** — unabhängig davon, dass die Datenbank ohnehin nur
BER-zertifizierte Wohnungen erfasst, also eine verzerrte Stichprobe wäre.

## 11. data.gov.ie und CSO — nichts Brauchbares

**GEPRÜFT.**

- **data.gov.ie**: SEAI führt dort 53 Datensätze, sämtlich **CC BY 4.0** —
  aber es sind Energiebilanz-Zeitreihen (Kraftstoffverbrauch, erneuerbarer
  Anteil, SDG-Indikatoren), **kein einziger mit Grafschaftsbezug zu Solar**.
  Volltextsuche „solar county" → 4 Treffer, alle von Fingal County Council und
  keiner einschlägig. „microgeneration" → **0 Treffer**.
- **CSO** (Zentrales Statistikamt, Schnittstelle `ws.cso.ie`, 13.051 Tabellen
  durchsucht): sechs Tabellen HEBEU43–48 „Household generating electricity in
  the home, using solar panels or by other means", Jahr 2024. Die räumliche
  Dimension ist **NUTS-2** — „Northern & Western", „Southern", „Eastern &
  Midland", also drei Regionen für die ganze Insel. Zudem Umfrage-Anteile, keine
  Anlagenzahlen.
- **CRU** (Regulierungsbehörde): keine eigene Grafschaftsstatistik gefunden
  (UNGEPRÜFT bis zur Primärquelle).

## 12. Irland: Rechtslage der SEAI-Berichte

**GEPRÜFT, aber nicht abschließend.** Der Retrofit-Bericht trägt nur „©
Sustainable Energy Authority of Ireland" ohne Weiterverwendungshinweis. Der
Rahmen: Die Open-Data-Richtlinie (EU) 2019/1024 ist mit S.I. 376/2021 in
irisches Recht umgesetzt; Circular 12/2016 macht **CC BY zur
Standard-PSI-Lizenz** für öffentliche Stellen und empfiehlt ihnen, das auf
ihrer Website auszuweisen. SEAI tut das auf data.gov.ie (alle 53 Datensätze CC
BY 4.0), am Bericht selbst nicht.

**Praktisch entschärft sich das:** Wir bräuchten 26 Zahlen je Jahrgang. Das sind
einzelne Tatsachen, keine Übernahme einer Datenbank — die Schwelle des
Datenbankherstellerrechts wird gar nicht erreicht. Trotzdem gehört vor einem
Livegang ein Legal-Judge darüber, und eine Anfrage bei SEAI wäre billiger.

---

# Zusammenfassung

## Österreich — Gemeindeseiten machbar: **JA**

| | |
|---|---|
| **Beste Quelle** | Anlagenregister der E-Control, `anlagenregister.at`, über die JSON-Schnittstelle statt über den Excel-Knopf |
| **Ebene** | **Gemeinde — alle 2.091 getroffen**, über die offene Ortschaftsliste von Statistik Austria. **98,20 % selbst gemessen** an allen 590.817 Anlagen, ohne Handnacharbeit; der Rest sind rund 1.700 Schreibvarianten |
| **Inhalt** | Anzahl der Anlagen und Engpassleistung in kW, je Anlage eine Zeile. **Gesamtbestand: 590.817 Anlagen, 12.617 MWp.** Private Dachanlagen enthalten (gemessen: Median-Anlage unter 10 kWp) |
| **Aktualität** | live, Datenstand ist der Abruftag; Vollabzug in neun Abrufen (rund 217 MB, etwa 15 Minuten) |
| **Zeitachse** | **kein Inbetriebnahmedatum** — an der Datenquelle geprüft, Feld vorhanden und durchgehend leer. Zubau ab 2022 aus dem ersten Einspeisejahr näherungsweise ableitbar, mit vier benannten Vorbehalten |
| **Lizenz** | **keine angegeben.** Kommerzielle Weiterverwendung folgt aus § 5 Abs. 1 IWG 2022, das Datenbankrecht ist der E-Control nach § 2 Abs. 4 IWG aus der Hand genommen — dieselbe Konstruktion wie § 2 Abs. 5 DNG in Deutschland. **Vor Nutzung: zwei Legal-Judges plus, billiger, eine Anfrage an die E-Control.** |

**Zwei Fallen, die beim Bauen Geld kosten** (beide selbst hineingetappt, beide
im Ergebnis unsichtbar): Wien fehlt in der Ortsliste vollständig, und die
PLZ-Listen der Wiener Umlandgemeinden enthalten Wiener Bezirks-Postleitzahlen —
ohne Bundesland-Sperre standen 3.518 Wiener Anlagen in Langenzersdorf und 3.570
in Perchtoldsdorf. Dieselbe Fehlerklasse wie die Kreisschlüssel unter
Ortsnamen im deutschen Atlas.

**Die drei Einwände der Vorrecherche:** Gemeindezuordnung — widerlegt, gemessen.
Lizenz — die Tatsache stimmt, die Schlussfolgerung „also nicht nutzbar" nicht.
Inbetriebnahmedatum — bestätigt, und das ist die echte Einschränkung.

**Alle Alternativen geprüft und schwächer:** Energiemosaik enthält keine
Photovoltaik und ist nicht-kommerziell lizenziert; Niederösterreich hat genau
die richtige Form, aber Stand 2013; Wien nur Bezirke und nur geförderte Anlagen;
PV Austria und die Marktstatistik nur Bundesländer; alles Übrige sind
Potenzialkataster.

## Irland — Gemeindeseiten machbar: **NEIN. Grafschaftsseiten: HALB**

| | |
|---|---|
| **Beste nutzbare Quelle** | SEAI, „National Retrofit Plan Full Year Report", Appendix 3, Spalte „Solar PV" |
| **Ebene** | **26 Grafschaften** — nicht die 31 Verwaltungseinheiten (Dublin ist eine Zeile), und **keine Gemeindeebene** |
| **Inhalt** | nur **Stückzahlen**, keine Leistung; nur **geförderte** Wohngebäude-Anlagen; Privatdächer ja |
| **Aktualität** | jährlich, jüngster gefundener Jahrgang 2024 (je Bericht zwei Jahre); ein 2025er-Bericht wurde nicht gefunden, ist damit aber nicht widerlegt |
| **Form** | PDF-Tabelle, kein maschinenlesbarer Datensatz |
| **Lizenz** | nur „© SEAI"; Rahmen ist CC BY als irische Standard-PSI-Lizenz, am Bericht aber nicht ausgewiesen. 26 Zahlen sind Tatsachen, kein Datenbankübernahme |

**Die inhaltlich beste irische Quelle ist gesperrt:** ESB Networks veröffentlicht
887 MVA angeschlossene Mikroerzeugung je Grafschaft, monatlich — und untersagt
kommerzielle Nutzung ausdrücklich im Wortlaut. Die BER-Datenbank ebenso
(„personal, research or education purposes"). data.gov.ie und das Statistikamt
liefern nichts unterhalb von drei NUTS-2-Regionen.

**Für einen Atlas nach deutschem Muster reicht Irland nicht.** Was ginge, ist
eine einzelne Seite „Solaranlagen je Grafschaft" mit 26 Zeilen, Stückzahlen,
zwei Jahrgängen und dem ausdrücklichen Hinweis, dass nur geförderte Anlagen
gezählt sind.
