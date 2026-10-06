# Nachprüfung Polen · Slowakei · Tschechien

Auftrag: Die drei Länder, bei denen die Erstrecherche (`eu-weite-quellen.md`) eine Spur
unverfolgt gelassen hatte oder an einer Sperre gescheitert war, nachfassen. Gesucht ist je
Land die Quelle mit der **größten Datentiefe** für einen Solar-Atlas nach deutschem Muster
(Einzelanlage > Gemeinde > Kreis > Region).

**Alle Abrufe am 23.09.2026**, sofern nicht anders vermerkt. Jede Aussage ist als
**GEPRÜFT** (Seite selbst aufgerufen, Datei selbst heruntergeladen, Zeilen selbst gezählt)
oder **UNGEPRÜFT** markiert. Technischer Hinweis: Mehrere Amtsseiten (PGE, Tauron,
czystepowietrze.gov.pl) liefern eine unvollständige Zertifikatskette; der erste Abrufweg
scheitert daran und sieht aus wie ein Bot-Schutz. Mit `curl -k` und Browser-Kennung kamen
alle durch — **der gescheiterte Abruf der Erstrecherche war ein Zertifikatsproblem, keine
Sperre.**

---

## Kurzfassung

| Land | Beste Quelle | Ebene | Zeitachse | Kleinanlagen | Lizenz | Aktualität |
|---|---|---|---|---|---|---|
| **PL** | URE-Register ≥50 kW (unverändert) · **neu:** DSO-Listen nach Art. 7 Abs. 8l PE | Gemeinde (URE) · Umspannwerk (DSO) | URE nein · DSO ja (Antrag/Vertrag/Netzanschluss) | **nein** (1,64 Mio. Dachanlagen bleiben unsichtbar) | keine Angabe | URE laufend · DSO quartalsweise |
| **SK** | ÚRSO „Potvrdenia o výrobe elektriny v lokálnom zdroji" | Gemeinde (Sitz des Antragstellers) | ja (Bescheiddatum) | nein | keine Angabe | fortlaufend |
| **CZ** | ERÚ-Lizenzregister (XML, monatlich) | **Gemeinde + Flurstück** | ja (`DateBegin`) | teilweise | keine Angabe | monatlich |

Urteil: **Tschechien bleibt mit Abstand die beste Quelle der Region** und ist besser als
bisher angenommen. **Polen bekommt eine neue, ernstzunehmende Quelle** für Anlagen über
1 kV, aber die 1,64 Mio. Dachanlagen bleiben ohne Ortsbezug. **Die Slowakei bleibt für
Gemeindeseiten unbedienbar**, aber die Begründung ist jetzt belegt statt vermutet.

---

# POLEN

## 1. PGE Dystrybucja (604.000 Prosumenten) — GEPRÜFT

Der Abruf der Erstrecherche scheiterte an der Zertifikatskette, nicht an einem Bot-Schutz.
Mit `curl -k` antwortet `pgedystrybucja.pl` normal.

### 1a. „Informacja o łącznej dostępnej mocy przyłączeniowej" — GEPRÜFT, für uns wertlos

PDF, 12 Seiten, Stand 31.08.2026, selbst heruntergeladen (1,18 MB).
Inhalt: **freie Anschlusskapazität** je Gruppe kohärenter Netzknoten im 110-kV-Netz,
dargestellt als Netzschema mit Kürzeln (GNL, XGZ115, RED …). Keine Gemeinde, keine
installierte Leistung, keine Anlagen. Rechtsgrundlage im Dokument wörtlich zitiert:

> „przedsiębiorstwo energetyczne zajmujące się przesyłaniem lub dystrybucją energii
> elektrycznej jest obowiązane sporządzić informację dotyczącą: wartości łącznej dostępnej
> mocy przyłączeniowej dla źródeł … **dla całej sieci przedsiębiorstwa o napięciu znamionowym
> powyżej 1 kV z podziałem na stacje elektroenergetyczne lub ich grupy** wchodzące w skład
> sieci o napięciu znamionowym 110 kV i wyższym"
> (Art. 7 Abs. 8l Prawo energetyczne, zitiert in: PGE Dystrybucja, *Informacja o łącznej
> dostępnej mocy przyłączeniowej … III kwartał 2026*, S. 2)

**Damit ist Frage 6 beantwortet** (siehe Abschnitt 6).

### 1b. „Informacja o podmiotach ubiegających się o przyłączenie" — GEPRÜFT, der eigentliche Fund

PDF, **316 Seiten, 10,6 MB, aus Excel erzeugt, Stand 31.08.2026**, selbst heruntergeladen
und ausgezählt. Das ist eine **Einzelanlagen-Liste**, kein Aggregat.

Gezählt: **7.228 Zeilen**. Technik-Spalte:

| Kürzel | Bedeutung | Zeilen |
|---|---|---|
| ODB | reiner Verbrauchsanschluss | 3.532 |
| **PV** | **Photovoltaik** | **2.095** |
| MEE | Speicher | 481 |
| MIX | gemischt | 452 |
| BG/BGP | Biogas | 197 |
| SG | Sonstige | 93 |
| FW | Wind | 26 |

Status: 4.685 mit Anschlussvertrag, 1.705 mit erteilten Anschlussbedingungen, 772 im
Antragsverfahren, 99 Ablehnungen.

Spalten je Zeile: Objekt-ID · Name des Antragstellers (bei Privatpersonen anonymisiert als
„osoba fizyczna") · **Lokalizacja miejsca przyłączenia** · Spannungsebene · Technik ·
eingespeiste und entnommene Leistung in MW · Status · Antragsdatum · Datum der
Anschlussbedingungen · **Datum des Anschlussvertrags** · **Datum des Beginns der
Energielieferung**.

- **Ortsbezug: Umspannwerk, nicht Gemeinde.** Beispielzeile: „linia 15 kV Kamionka z pola
  nr 9 w stacji 110/20 kV Filipów". Die Umspannwerksnamen SIND Ortsnamen (Milejczyce,
  Łomża, Węgorzewo) — eine Zuordnung auf die Gemeinde wäre also machbar, aber sie wäre
  **geraten, nicht belegt**: Ein Umspannwerk versorgt mehrere Gemeinden, und die Anlage kann
  an jedem Punkt der genannten Mittelspannungsleitung hängen.
- **Kleinanlagen: nein.** Nur Anschlüsse über 1 kV. Die kleinste PV-Zeile liegt bei 0,25 MW,
  der Normalfall bei 0,5–1 MW.
- **Zeitachse: ja, und eine gute** — vier Datumsspalten je Anlage, inklusive „Beginn der
  Energielieferung". Das ist mehr, als das deutsche Register liefert.
- Lizenz: **keine Angabe** auf der Seite oder im Dokument.

### 1c. Dasselbe bei den anderen Netzbetreibern — GEPRÜFT (Enea), TEILWEISE (Energa, Tauron, Stoen)

- **Enea Operator**: veröffentlicht dieselbe Liste in zwei PDFs (Teil 1: 57 Seiten, 22 MB,
  selbst heruntergeladen). Schema identisch, zusätzlich eine Spalte mit der **Anschrift des
  Antragstellers** (Postleitzahl + Stadt + Straße — aber das ist der Firmensitz, nicht die
  Anlage). Ortsbezug der Anlage wieder nur über das Umspannwerk („Górzyca Pole SN").
- **Energa-Operator**: hat eine eigene Seite dafür (`/przylaczenie-do-sieci/informacje-o-stanie-przylaczen/podmioty-ubiegajace-sie`).
  **UNGEPRÜFT** — die Seite baut ihren Inhalt erst im Browser auf, ein einfacher Abruf
  liefert 404 bzw. eine leere Hülle. Dass die Liste existiert, ist über die Suchmaschine
  belegt, ihr Schema nicht.
- **Tauron / Stoen**: nicht einzeln geprüft, die Pflicht gilt ihnen aber gleichermaßen.

**Bewertung:** Diese Listen sind zusammen ein landesweites, gesetzlich erzwungenes
Einzelanlagen-Register für Erzeugung über 1 kV — mit Technik, Leistung und vier Daten je
Anlage. Für einen **Solar-Atlas nach Gemeinden taugt es nicht** (der Ortsbezug ist das
Umspannwerk), für eine Zubau-Auswertung nach Region und Jahr wäre es brauchbar.

## 2. Netzkapazitäts-Karten der Netzbetreiber — GEPRÜFT (Tauron), TEILWEISE

### Tauron: `dostepnemoce.pl` — GEPRÜFT, mit zwei Datenschnittstellen

Die Karte liegt als WordPress-Erweiterung vor und liest drei offene Endpunkte unter
`dostepnemoce.tauron-dystrybucja.pl/wp-json/tauron/v1/`. Selbst abgerufen:

- **`/oze`** — 1.946 Zeilen, davon **1.306 `fotowoltaika`**, Summe **2.023 MW**.
  Felder: Name, Typ, `moc_wytworcza`, **`lat`/`lng`** (1.665 Zeilen mit Koordinaten),
  Umspannwerk-Code und -Name, Betriebsbereich. **Die Felder `gmina` und `powiat` existieren
  im Schema, sind aber in ALLEN 1.946 Zeilen leer.**
  Die Zeilen sind je Umspannwerk aggregiert (292 verschiedene Umspannwerks-Codes), nicht
  je Anlage. Über die Koordinaten wäre eine Gemeindezuordnung per Punkt-in-Polygon möglich.
- **`/przylaczenia`** — 103 Zeilen, eine **je Landkreis (powiat)**, mit Koordinaten und je
  zwei JSON-Blöcken (Anschlussgruppe 2 und 3), die Anträge „in Bearbeitung" und „geplant"
  nach Technik in MW aufschlüsseln — `FV` ist Photovoltaik. Also: **Photovoltaik-Pipeline
  je Landkreis.**
- **`/points`** — Flexibilitätsbedarf je Umspannwerk.
- Dazu liegen `gminy_tauron_100m.geojson`, `powiaty_tauron_200m.geojson` und
  `tauron_zasieg_100m.geojson` im Uploads-Verzeichnis: **Gemeindegrenzen sind da, Daten je
  Gemeinde nicht.**

Abdeckung: nur das Tauron-Gebiet (Dolnośląskie, Opolskie, Śląskie, Małopolskie).
Zeitachse: keine. Kleinanlagen: nein. Lizenz: keine Angabe.

### PGE, Enea, Energa, Stoen

- **PGE** bietet neben dem PDF eine „Mapa dostępnych mocy" als Anwendung an — **UNGEPRÜFT**,
  nicht geöffnet; das PDF daneben zeigt, worum es geht (freie Kapazität je Netzknoten).
- Eine private Sammelkarte (`transakcjeoze.pl`) führt die freien Kapazitäten aller fünf
  Netzbetreiber zusammen — **UNGEPRÜFT** und für uns ohnehin nur ein Hinweisgeber, keine
  Quelle (dieselbe Regel wie bei den fremden Förderlisten).

**Keine dieser Karten zeigt installierte Anlagen.** Sie zeigen, was noch angeschlossen
werden kann und was beantragt ist.

## 3. Mikroinstallationen je Netzbetreiber — GEPRÜFT, Ergebnis negativ

- **Energa-Operator** hat eine eigene Seite „Mikroinstalacje OZE – aktualny stan" (Stand
  31.08.2026). Der Text kündigt ausdrücklich an, zu zeigen, „jak wygląda ich **rozkład
  geograficzny**". **Geliefert werden zwei PNG-Bilder** (Anschlüsse je Monat; Anzahl und
  Leistung). Kein Datenfile, keine Tabelle, keine Gemeinde, kein Landkreis. Selbst
  nachgesehen: im ausgelieferten HTML stehen genau diese zwei Bild-Adressen und sonst nichts.
- **Stoen Operator** (Warschau): Zahlen nur in Pressemitteilungen — 17.568 Mikroanlagen mit
  168,19 MW Ende 2024. Weil Stoen praktisch nur Warschau versorgt, ist das faktisch ein
  Gemeindewert — aber für eine einzige Gemeinde und ohne Zeitreihe zum Abrufen. **UNGEPRÜFT**
  (aus der Suchmaschine, Pressemitteilung nicht im Original geöffnet).
- **PGE, Tauron, Enea**: keine entsprechende Seite gefunden.

## 4. Mój Prąd — GEPRÜFT, Ergebnis negativ

Die Erstrecherche hatte eine undokumentierte Schnittstelle mit 16 Woiwodschafts-Zeilen
gefunden. Feiner geht es nicht:

- Das polnische offene Datenportal (`api.dane.gov.pl`) liefert auf „fotowoltaika",
  „mikroinstalacje", „prosument" und „Mój Prąd" **keinen einzigen einschlägigen Datensatz**
  (selbst abgefragt; Treffer waren Wohnungspreise, ein Elektroenergetik-Jahrbuch bis 2017
  und Listen der „sprzedawcy zobowiązani").
- Antrags- oder Bewilligungslisten mit Gemeindeangabe werden nicht veröffentlicht. Anträge
  laufen ausschließlich über das GWD-Portal des Umweltfonds.

## 5. Czyste Powietrze und andere Programme — GEPRÜFT, für PV untauglich

- `czystepowietrze.gov.pl/partnerzy/gminy/ranking-gmin` selbst geöffnet: die Seite verweist
  auf zwei Ranglisten (NFOŚiGW und Polski Alarm Smogowy), **stellt aber selbst keine
  Datei bereit** (kein XLSX/CSV im ausgelieferten HTML).
- Die regionalen Umweltfonds veröffentlichen Gemeindetabellen — belegt für WFOŚiGW Poznań
  (XLSX, 0,22 MB, Stand 31.03.2026) — **UNGEPRÜFT**, Datei nicht geöffnet.
- **Entscheidend ist aber etwas anderes:** Czyste Powietrze ist ein Heizungs- und
  Sanierungsprogramm. Die Gemeindezahlen sind Anträge und Beträge je Gemeinde, **nicht nach
  Technik aufgeschlüsselt**. Eine Photovoltaik-Zahl je Gemeinde lässt sich daraus nicht
  ableiten. Die Rangliste normiert zudem auf „Anträge je 1.000 Einfamilienhäuser" — das ist
  eine Aktivitätskennzahl der Verwaltung, keine Anlagenzahl.

## 6. Rechtsgrundlage: Gibt es eine Pflicht, feiner als das Gesamtgebiet zu veröffentlichen? — GEPRÜFT

**Ja, aber die vorgeschriebene Einheit ist das Umspannwerk, nicht die Gemeinde.**

Art. 7 Abs. 8l Prawo energetyczne verpflichtet jeden Übertragungs- und Verteilnetzbetreiber
zu zwei Veröffentlichungen:

1. die freie Anschlusskapazität **„z podziałem na stacje elektroenergetyczne lub ich grupy"**
   — aufgeteilt nach Umspannwerken oder deren Gruppen (Wortlaut oben zitiert), quartalsweise;
2. die Liste der Anschlusswerber, gestellten Anträge und erteilten Ablehnungen für Anschlüsse
   über 1 kV (Enea benennt diese Pflicht auf ihrer Seite ausdrücklich als „art. 7 ust. 8l
   pkt 1)"; PGE trägt den Vermerk „Informacje publikowane zgodnie z Art. 7 ust. 8l ustawy PE"
   in der Kopfzeile jeder Seite ihrer Liste).

**Für Mikroinstallationen unter 1 kV gibt es keine solche Pflicht.** Die einzige
gesetzlich erzwungene Veröffentlichung dazu ist der Jahresbericht der Regulierungsbehörde,
und der ist je „sprzedawca zobowiązany" gegliedert — die sieben Zeilen, die die
Erstrecherche gefunden hat.

**Nicht geprüft und bewusst offen gelassen:** Ob der Gesetzestext seit der letzten Novelle
in dieser Fassung gilt. Zitiert ist er hier aus einem amtlichen Dokument des Netzbetreibers
vom 31.08.2026, nicht aus ISAP. Wer sich darauf stützen will, holt die Fundstelle im
Gesetzblatt.

## 7. GUS / Statistikamt — GEPRÜFT, Ergebnis negativ

Die Datenbank der lokalen Daten (BDL) des Statistikamts über ihre eigene Schnittstelle
abgefragt: Die Suche nach „OZE", „odnawialne" und „słoneczna" liefert **null Themen**.
Der einzige Treffer zu „moc zainstalowana" ist „Moc zainstalowana i osiągalna w
elektrowniach" auf **Ebene 3 = Woiwodschaft**. Zu Elektrizität gibt es auf Landkreisebene
nur Haushaltsverbrauch. **Photovoltaik kommt in BDL unterhalb der Woiwodschaft nicht vor.**

## Polen: ändert sich das Urteil?

**Teilweise ja.** Die Erstrecherche war richtig darin, dass die 1,64 Mio. Dachanlagen
(13,9 GW) ohne Ortsbezug bleiben — das ist jetzt nicht mehr nur behauptet, sondern gegen
Gesetz, Netzbetreiber-Veröffentlichungen, das offene Datenportal und die amtliche Statistik
geprüft. Neu ist, dass für Anlagen **über 1 kV** ein Einzelanlagen-Datensatz mit Technik,
Leistung und vier Datumsangaben landesweit veröffentlicht wird — besser als gedacht, aber
mit Umspannwerk statt Gemeinde als Ort. Für Gemeindeseiten bleibt es beim URE-Register
ab 50 kW.

---

# SLOWAKEI

## 1. SIEA / Zelená domácnostiam: die Liste der Installationen — GEPRÜFT, und sie existiert

Das war die eine unverfolgte Spur. Sie führt zu etwas — aber nicht weit genug.

Die Datei ist auf der aktuellen Programmseite nicht mehr verlinkt; gefunden über das
Adressverzeichnis des Internet-Archivs, heruntergeladen von der Archivseite des Programms
(`2015-2023.zelenadomacnostiam.sk`), **19,5 MB, 375 Seiten PDF, Stand 11.11.2022**.

Titel: *„Zoznam inštalácií podporených v rámci národného projektu Zelená domácnostiam II"*.
Einleitung wörtlich:

> „V zozname sú uvedené len inštalácie, ktoré boli zrealizované a ku ktorým už boli preplatené
> poukážky. Podrobnejšie informácie o konkrétnych inštaláciách sú uvedené v zmluvách o
> poskytnutí príspevku a užívaní zariadenia, ktoré sú zverejnené v Centrálnom registri zmlúv."

**Vier Spalten: Gutscheinnummer · Gerät · Zuschusshöhe in € · Kraj inštalácie.**
Selbst ausgezählt: **23.208 Zeilen**, davon

| Gerät | Zeilen |
|---|---|
| tepelné čerpadlo (Wärmepumpe) | 8.577 |
| slnečný kolektor (Solarthermie) | 6.192 |
| **fotovoltický panel** | **4.825** |
| kotol na biomasu | 3.614 |

Photovoltaik je Region: Žilinský 1.010 · Trenčiansky 824 · Trnavský 816 · Nitriansky 780 ·
Prešovský 548 · Banskobystrický 438 · Košický 409. **Bratislavský kraj fehlt vollständig** —
das Programm lief über den Operationellen Fonds und schloss die Hauptstadtregion aus.

Bewertung:
- **Ebene: Region (kraj), 8 Einheiten** — keine Gemeinde, kein Bezirk.
- **Keine Leistungsangabe in kW.** Nur der Zuschussbetrag, und der ist gedeckelt.
- **Keine Zeitachse.** Kein Datum je Zeile, nur der Stand der Datei.
- **Format: PDF.** Kein XLSX, kein CSV.
- **Fortführung: nein.** Die Liste endet mit dem Vorgängerprogramm. Für das laufende
  Programm (Zelená domácnostiam 2023–2026 / Zelená solidarita) gibt es keine öffentliche
  Fassung: Die Seite „Stav čerpania" zeigt nur zwei Budgetbalken (Bratislavská región
  3,8 Mio. € gegen übriges Slowakei 24,6 Mio. €), und die Seite „Tabulky ZD a ZS" ist
  **passwortgeschützt** (selbst aufgerufen: „Obsah je chránený heslom").
- Das Archiv nennt als Gesamtergebnis 2015–2023: **16.998 geförderte Photovoltaik-Anlagen**
  von 59.275 Installationen insgesamt — ohne jede räumliche Aufschlüsselung.

**Der Hinweis auf das zentrale Vertragsregister ist der einzige Weg zu Adressen** — dort
liegt je Gutschein ein Vertrag zwischen Agentur und Haushalt, und darin steht die Anschrift
der Installation. Das wären zehntausende Einzeldokumente mit personenbezogenen Daten. **Als
Datenquelle für eine öffentliche Ortsseite scheidet das aus** — nicht an der Technik,
sondern daran, dass wir damit Anlagen einzelnen Haushalten zuordnen würden. Nicht weiter
verfolgt.

## 2. ÚRSO-Jahresbericht — GEPRÜFT, Ergebnis negativ

Die Erstrecherche hatte das PDF nicht geöffnet. Jetzt geöffnet: *Výročná správa úradu za
rok 2024*, 3,0 MB, aus dem Original heruntergeladen und vollständig in Text gewandelt
(4.313 Zeilen).

- **Kein einziges Vorkommen von „okres".** „Kraj" kommt fast nur im Sinne von „Land/Staat"
  vor (Nachbarländer, Marktkopplung).
- Die **einzige** regionale Aufschlüsselung im ganzen Bericht betrifft **Wärmepreise nach
  kraj** — nicht Strom, nicht Photovoltaik.
- „fotovolt" kommt zweimal vor: im Abkürzungsverzeichnis und in einem Nebensatz über eine
  Anlage auf einer Verdichterstation.

**Ein Fund gibt es doch**, an anderer Stelle: eine Tabelle der ausgestellten
*potvrdenia o splnení oznamovacej povinnosti* für Erzeugung bis 1 MW, 2024:
**„zo slnečnej energie: 885 ausgestellte Bestätigungen, davon 767 neue Anlagen"** — und der
Bericht ergänzt, dass 728 der 767 auf Bestätigungen über die Erzeugung „v lokálnom zdroji"
nach § 4b Abs. 7 Gesetz 309/2009 beruhen. Das ist eine Jahreszahl ohne Ortsbezug, führt
aber zum nächsten Fund.

## 3. ÚRSO-Register — GEPRÜFT, der beste slowakische Fund

Die Regulierungsbehörde führt mehrere öffentliche Register. Zwei davon selbst geöffnet:

### „Potvrdenia o výrobe elektriny v lokálnom zdroji"

Eine fortlaufende HTML-Tabelle, 20 Zeilen je Seite. Umfang per Binärsuche selbst
festgestellt: **bis Seite 177 gefüllt, ab Seite 178 leer → rund 3.560 Einträge**, zeitlich
von Oktober 2022 bis 17.09.2026.

Spalten: **Subjekt · Anschrift (Straße + Gemeinde) · Bescheidnummer · Datum**.
Beispielzeilen: „Obec Zemianske Kostoľany, Ul. 4.apríla 60/28, Zemianske Kostoľany,
0572/2026/E-LZ, 17.09.2026" · „MVDr. Michal Andrejco, Zalužice 104, Zalužice,
0560/2026/E-LZ, 14.09.2026".

- **Ebene: Gemeinde** — aber es ist die Anschrift des Antragstellers, nicht zwingend der
  Anlagenstandort. Bei Gemeinden, Schulen und Handwerksbetrieben fallen beide meist
  zusammen, bei einer Handelskette („COOP Jednota Nitra", viermal in einer Woche) nicht.
- **Zeitachse: ja** (Bescheiddatum je Zeile).
- **Keine Leistung, keine Technik.** Ob eine Zeile Photovoltaik ist, steht nicht darin —
  faktisch ist „lokálny zdroj" fast immer PV, aber das wäre eine Annahme, keine Angabe.
- **Keine Kleinanlagen:** Haushaltsanlagen bis 10,8 kW sind „malý zdroj" und brauchen diese
  Bestätigung nicht. Die Einträge sind Gewerbe, Gemeinden, Schulen.
- Format: HTML mit Seitenblättern, kein Export.

### „Potvrdenia o splnení oznamovacej povinnosti" (Erzeugung bis 1 MW)

Hier liegen vier PDFs, alle selbst heruntergeladen — und alle sind **Archive und
Abgangslisten**, nicht der aktuelle Bestand:
- *Archív potvrdení ku 01.02.2013* (71 Seiten): Spalten Bestätigungsnummer · Name · IČO ·
  **Sitz** · Tätigkeitscode · **Anlagenbezeichnung** · **Leistung in MW** · Ausstellungsdatum.
  Das wäre das richtige Schema — aber der Stand ist 2013.
- *Potvrdenia o ukončení činnosti … k 16.01.2017* (7 Seiten) und
  *Potvrdenia, ktoré nie sú platné k 26.01.2017* (1 Seite): beendete bzw. ungültige
  Bestätigungen, ebenfalls mit Anlage und Leistung (dort tauchen auch einzelne
  „Fotovoltaický systém, 0,0138 MW" auf).

**Der aktuelle Bestand dieser Bestätigungen wird nicht als Liste veröffentlicht**, nur über
eine Einzelsuche nach Firma oder IČO. Damit ist die einzige slowakische Quelle mit
Anlagenbezeichnung UND Leistung UND Ort dreizehn Jahre alt.

### „Osvedčenia" (Energiegemeinschaften)

Nebenbefund: dieselbe Tabellenform, Stand 07.07.2026, rund zwei Dutzend Einträge —
Energiegemeinschaften mit Sitzgemeinde. Für einen Solar-Atlas ohne Wert, als Beleg für die
Dynamik der slowakischen Bürgerenergie interessant.

### Was NICHT trägt

Die Liste „Zoznam výrobcov elektriny podľa § 3b ods. 6 a 7" (20 XLSX-Dateien auf der Seite)
selbst heruntergeladen und geöffnet: Es ist die **Schuldnerliste** — Regulierungssubjekt,
IČO, Schuldner von/bis, Kasse. Kein Ort, keine Anlage, keine Leistung.

## 4. OKTE und die drei Verteilnetzbetreiber — TEILWEISE GEPRÜFT

- **ZSD (Západoslovenská distribučná)**: Seite „Voľná kapacita" selbst geöffnet. Sie
  erklärt das Verfahren für „malé zdroje do 10,8 kW", „lokálne zdroje" und „komerčné
  zdroje" — **stellt aber keine einzige Datei bereit** (kein XLSX, kein CSV, kein KML im
  ausgelieferten HTML). Daneben gibt es eine „Mapa pripojiteľnosti", die pro **EIC-Code
  einer Entnahmestelle** auskunftet, wie viel Leistung dort anschließbar wäre. Das ist eine
  Einzelfallauskunft, kein Datenbestand — **UNGEPRÜFT** im Detail, aber schon der Bauart
  nach für einen Atlas untauglich.
- **VSD und SSD**: haben laut Fachpresse dieselbe Art Karte, VSD zusätzlich KML-Dateien mit
  der „indikativen anschließbaren Leistung". **UNGEPRÜFT** — Dateien nicht geöffnet. Auch
  hier gilt: Kapazität, nicht Bestand.
- Eine Branchenmeldung nennt **über 21.000 kleine und lokale Quellen mit 250 MW** über alle
  drei Netzbetreiber — **UNGEPRÜFT** (Sekundärquelle), und ohnehin ein Landeswert.
- **OKTE**: betreibt Registrierung und Abrechnung der geförderten und nicht geförderten
  Erzeugungsquellen. Die öffentlich zugänglichen Seiten sind Anleitungen zur Registrierung;
  **eine öffentliche Anlagenliste mit Ortsbezug wurde nicht gefunden** — UNGEPRÜFT, ob es
  sie hinter dem Zugang gibt.

## 5. data.slovensko.sk und Statistikamt — GEPRÜFT, Ergebnis negativ

- Das slowakische offene Datenportal ist eine reine Browser-Anwendung; seine Schnittstelle
  liegt hinter einem Wissensgraph-Dienst, der auf direkte Abfragen nicht antwortet
  (drei Endpunkte probiert, alle liefern die Anwendungshülle statt Daten).
- Über die Suchmaschine auf die beiden Portale eingegrenzt: Treffer sind der
  Landschaftsatlas (NO2- und SO2-Quellen), Agrar-Datensatzlisten und eine
  Gesamtenergiebilanz erneuerbarer Energien — **nichts mit Photovoltaik unterhalb der
  Landesebene**.

## Slowakei: ändert sich das Urteil?

**Nein, aber es ist jetzt begründet statt vermutet.** Es gibt kein Anlagenregister. Was es
gibt:
- eine Förderliste mit **Region** und ohne Leistung, als PDF, seit November 2022 nicht
  fortgeführt und für das laufende Programm passwortgeschützt;
- ein laufendes Bescheid-Register mit **Gemeinde** (Antragstellersitz), aber ohne Technik
  und ohne Leistung;
- ein Register mit Anlage, Leistung und Ort, dessen Veröffentlichung **2013** endet.

**Für Gemeindeseiten weiterhin nicht bedienbar.** Der einzige Weg, der technisch zu Adressen
führt — das zentrale Vertragsregister — ist wegen des Personenbezugs keiner.

---

# TSCHECHIEN

## 1. Lizenz — GEPRÜFT, und das Ergebnis ist ein sauberes „es gibt keine"

Systematisch abgesucht, alles selbst geöffnet:

**a) Die Seite, auf der die Daten liegen** (`eru.gov.cz/zpristupnena-data`), sagt wörtlich:

> „**Na základě zákona o svobodném přístupu k informacím** níže naleznete seznamy dat pro
> hromadné strojové zpracování informací pomocí programů pro zpracování databází. Seznamy
> obsahují data o držitelích licencí a technologických energetických zařízeních, tj.
> výrobnách a distribučních územích elektřiny, plynu a tepla a zásobnících plynu."

**b) Die Pflichtangaben nach § 5 Abs. 1 Buchst. i)** (`eru.gov.cz/povinne-informace`,
Gliederung nach Verordnung 515/2020 Sb.) enthalten Punkt 13 „Licenční smlouvy" mit zwei
Unterpunkten:
- **13.1 „Vzory licenčních smluv"** → verweist auf `eru.gov.cz/licence`. Das ist die falsche
  Bedeutung von „Lizenz": Die verlinkte Seite handelt von energierechtlichen
  Betriebsgenehmigungen, nicht von Nutzungsrechten an Daten. Dort steht **kein einziger
  Satz zur Weiterverwendung**.
- **13.2 „Výhradní licence"** → „Pro tento bod nejsou položky, které by bylo možné uvést."
  (keine Einträge). Das ist immerhin eine belastbare Aussage: **Es wurden keine
  ausschließlichen Lizenzen vergeben.**

**c) Der Seitenfuß jeder ERÚ-Seite**, wörtlich:

> „2026 © Energetický regulační úřad • Informace jsou poskytovány v souladu se zákonem
> č. 106/1999 Sb., o svobodném přístupu k informacím."

**d) Das nationale offene Datenportal** (`data.gov.cz`): ERÚ ist dort mit **zwei**
Datensätzen vertreten — einer Kennzahl zu Fernwärmesystemen und dem elektronischen
Amtsblatt. **Das Anlagenregister ist im nationalen Katalog nicht angemeldet**, es ist also
formal kein „otevřená data" im Sinne des Gesetzes.

**e) Das ERÚ-„Dataportál"**, das im Seitenfuß verlinkt ist, selbst geöffnet: Es ist kein
offenes Datenportal, sondern das Meldeportal, über das regulierte Unternehmen ihre Daten
an die Behörde liefern (die einzigen Schnittstellen darin heißen `registration/licenceHolder`,
`tickets/reports-to-fill`). Für uns ohne Inhalt.

**Ergebnis:** Das Urteil der Erstrecherche bleibt — **keine Lizenzangabe, nur der Verweis
auf das Informationsfreiheitsgesetz**. Neu belegt ist, dass die Behörde ausdrücklich keine
ausschließlichen Lizenzen vergeben hat und dass die Daten nicht als offene Daten registriert
sind. Wer die Daten verwenden will, hat damit eine freundliche, aber keine
Nutzungsrechts-Zusage. **Vor einer Verwendung gehört eine Anfrage an das Amt** — dasselbe
Vorgehen wie bei jeder anderen Quelle ohne Lizenzfeld.

## 2. Das Register selbst — GEPRÜFT und ausgezählt, besser als gedacht

Monatlicher Datensatz „Výrobny elektřiny sk. 11", XML, **56,5 MB**, Stand 01.09.2026, selbst
heruntergeladen und geparst.

**37.958 Anlagen insgesamt**, davon nach Typ:

| Typ | Anlagen |
|---|---|
| **solární** | **34.433** |
| plynová a spalovací | 1.677 |
| vodní | 1.605 |
| větrná | 124 |
| parní | 108 |
| übrige | 11 |

Photovoltaik im Detail, alles selbst gezählt:
- **Installierte Leistung: 3.534,5 MW**
- **Gemeinde (`City`) gefüllt: 34.424 von 34.433** — 4.087 verschiedene Gemeinden
- **Bezirk (`County`) gefüllt: 33.987** — 80 Bezirke
- **Postleitzahl: 34.433 von 34.433**
- dazu je Anlage das **Katastergebiet mit Flurstücksnummern** (`CadasterName`,
  `CadasterNote`, z. B. „757/5, 286, 289/4")
- **Zeitachse: `DateBegin`** — 2007: 148 · 2019: 423 · 2020: 608 · 2021: 559 · 2022: 932 ·
  2023: 1.648 · 2024: 1.954 · 2025: 1.837 · 2026 (bis August): 781
- **Größenverteilung: Median 9,88 kW.** 18.158 Anlagen ≤ 10 kW, 27.478 ≤ 30 kW,
  30.820 ≤ 100 kW. **Das Register ist von Hausdachanlagen dominiert**, nicht von Freiflächen.
- **Kein Name des Lizenzinhabers im maschinenlesbaren Datensatz** — die Felder sind
  Lizenz-ID, Anlagenname, Ort, Leistung, Typ, Daten. Personenbezug damit gering (seit 2018
  ist die Suche nach natürlichen Personen auch in der Weboberfläche gesperrt, mit
  ausdrücklichem Verweis auf die Datenschutz-Grundverordnung).

**Das ist näher am deutschen Register, als die Erstrecherche angenommen hat:** Gemeinde,
Flurstück, Leistung je Einheit, Inbetriebnahmedatum, monatlich, ohne Zugangsschranke.

## 3. Die Lücke seit August 2025 — GEPRÜFT, und sie ist kleiner als befürchtet

### Was die Novelle wirklich geändert hat

Zum **01.08.2025** hat Lex OZE III die Lizenzschwelle von 50 auf 100 kW angehoben.
Entscheidend ist aber die Bedingung, nicht die Zahl: **Lizenzfrei ist eine Anlage bis 100 kW
nur, wenn der Strom am Ort verbraucht oder unentgeltlich geteilt wird.** Wer einspeist und
dafür Geld bekommt, braucht weiterhin eine Lizenz — unabhängig von der Leistung.
(UNGEPRÜFT im Gesetzestext selbst; die Aussage stammt aus der Mitteilung der
Regulierungsbehörde und einer Fachmeldung, nicht aus dem Gesetzblatt.)

### Was in den Daten davon zu sehen ist — GEPRÜFT

Aus dem Register selbst gerechnet, Neueinträge je Monat mit Leistung:

| Zeitraum | Anlagen/Monat | MW/Monat |
|---|---|---|
| 2024 | 163 | 41,2 |
| 2025 (Jan–Jul, vor der Novelle) | 166 | 31,4 |
| 2025 (Aug–Dez, nach der Novelle) | 135 | 40,0 |
| 2026 (Jan–Aug) | 98 | 38,7 |

**Die Anzahl fällt um rund 40 %, die Leistung bleibt.** Genau das ist die erwartete Wirkung:
Die kleinen Anlagen fallen heraus, die großen bleiben. Die Lücke ist real, aber sie trifft
die Stückzahl, nicht die Kapazität.

### Wie groß die Lücke insgesamt ist — GEPRÜFT

Gegen den Jahresbericht der Regulierungsbehörde gerechnet (siehe Punkt 4): Landesweit
**4.740 MW** Photovoltaik Ende 2025, im Lizenzregister **3.534 MW**. Das Register erfasst
also **rund drei Viertel der Leistung**, aber bei den Kleinanlagen nur einen Bruchteil: Der
Bericht weist für die Klasse „bis 10 kW" **1.522 MW** aus, im Register stehen in dieser
Klasse rund 180 MW. **Das Register sieht etwa jede achte Haushaltsanlage.** Das war schon
vor der Novelle so und ist keine Folge von Lex OZE III — die meisten Haushalte hatten nie
eine Lizenz, weil sie den Strom selbst verbrauchen.

### Wer die Anlagen unter 100 kW jetzt führt — GEPRÜFT, mit einem offenen Rest

- **OTE (Marktbetreiber)**: führt die Registrierung der geförderten wie der nicht geförderten
  Erzeugungsquellen; der Jahresbericht der Regulierungsbehörde speist sich ausdrücklich aus
  OTE-Meldungen („Licencované výrobny nad 50 kW nevykázané u OTE" ist eine eigene
  Korrekturzeile darin). **Eine öffentliche Anlagenliste mit Ortsbezug veröffentlicht OTE
  nicht** — die öffentlich zugänglichen Seiten sind Registrierungsanleitungen. UNGEPRÜFT
  bleibt, was hinter dem Zugang für Marktteilnehmer liegt.
- **ČEZ Distribuce**: veröffentlicht Bestandszahlen nur in Pressemitteilungen
  (119.908 Photovoltaikanlagen, 2.219,1 MW; 52.109 Neuanschlüsse im Vorjahr mit 605,5 MW) —
  **UNGEPRÜFT**, aus der Suchmaschine. Als Daten gibt es die „Mapy dostupné kapacity" mit
  Ampelfarben je Spannungsebene: **anschließbare Kapazität, nicht Bestand.**
- **EG.D**: „Mapa připojitelnosti" beantwortet seit 2023, welche Leistung an einer konkreten
  Adresse anschließbar ist, und zeigt daneben Zahl der eingegangenen, bewilligten und
  abgelehnten Anschlussanträge je Ort. **UNGEPRÜFT** im Detail — dem Zweck nach wieder
  Kapazität und Pipeline, nicht Bestand.
- **PREdistribuce**: dasselbe Muster. UNGEPRÜFT.

**Kein tschechischer Netzbetreiber veröffentlicht den angeschlossenen Bestand als Datei mit
Ortsbezug.**

### Statistikamt und Ministerium — GEPRÜFT, Ergebnis negativ

- Der Bericht des Industrieministeriums *Obnovitelné zdroje energie v roce 2024* (51 Seiten,
  selbst heruntergeladen und durchsucht): **kein einziges Vorkommen von „kraj" oder „okres"**.
  Er sagt im Photovoltaik-Kapitel ausdrücklich: „Statistika fotovoltaických elektráren (FVE)
  je plně v kompetenci ERÚ" — die Zuständigkeit liegt bei der Regulierungsbehörde.
- Der Fachartikel des Statistikamts zu Photovoltaik nennt Landeswerte und **stützt sich auf
  Zahlen des Branchenverbands** („Podle dat zveřejněných Solární asociací"), nicht auf eine
  eigene Erhebung. Keine Aufschlüsselung nach Region, Bezirk oder Gemeinde.

## 4. Der Jahresbericht der Regulierungsbehörde — GEPRÜFT, der Lückenfüller

*Roční zpráva o provozu elektrizační soustavy ČR pro rok 2025*, **XLSX, 1,84 MB, 59
Tabellenblätter**, selbst heruntergeladen und ausgewertet. Rechtsgrundlage im Dokument:
§ 17 Abs. 7 Buchst. m) Energiegesetz 458/2000 Sb.

- **Blatt 6: installierte Leistung je kraj und Technologie.** Photovoltaik Ende 2025:
  Jihomoravský 752,8 MW · Středočeský 691,1 MW · Jihočeský 433,6 MW · Plzeňský 405,6 MW ·
  Ústecký 385,0 MW … Hlavní město Praha 110,3 MW. Summe **4.740,1 MW**.
- **Blätter 4.6.1–4.6.14: je ein Blatt pro kraj**, Zeitreihe 2016–2025 für installierte
  Leistung, Erzeugung und Verbrauch.
- **Blatt 5.6: Photovoltaik nach Größenklassen** (≤10 kW · 10–30 · 30–100 · 100 kW–1 MW ·
  1–5 MW · >5 MW), Zeitreihe 2016–2025, mit Leistung UND Erzeugung. Die Klasse ≤10 kW wächst
  von 97 MW (2016) auf **1.522 MW (2025)** — hier sind die Haushaltsanlagen drin.
- **Kleinanlagen: ja**, einschließlich der nicht lizenzierten (der Bericht führt
  „Licencované výrobny nevykázané u OTE" als eigene Korrekturzeile und schätzt die Erzeugung
  nicht lizenzierter Photovoltaik über Leistung und Durchschnittswerte „ve stejném kraji,
  měsíci a výkonové kategorii").
- **Ebene: kraj (14 Regionen).** Kein Bezirk, keine Gemeinde.
- Format XLSX und PDF, jährlich, Ende Juni für das Vorjahr.

**Die beiden Quellen ergänzen sich sauber:** Das Register liefert Gemeinde und Flurstück für
drei Viertel der Leistung, der Jahresbericht liefert die vollständige Summe je Region —
inklusive dessen, was das Register nicht sieht. Eine Gemeindeseite könnte die Registerzahl
zeigen und mit dem Regionalwert einordnen, **solange sie sagt, was sie misst**: gemeldete
lizenzierte Anlagen, nicht alle Anlagen. Diese Beschriftung ist hier keine Feinheit — der
Unterschied ist bei Hausdachanlagen der Faktor acht.

## Tschechien: ändert sich das Urteil?

**Ja, zu unseren Gunsten — und gleichzeitig mit einer neuen Warnung.**

- **Besser als angenommen:** Das Register ist nicht überwiegend Freifläche, sondern zu zwei
  Dritteln Hausdach (Median 9,88 kW). Es trägt Gemeinde, Bezirk, Postleitzahl, Flurstück,
  Leistung je Einheit und Inbetriebnahmedatum, kommt monatlich und enthält keine Namen.
- **Die Lücke seit August 2025 ist belegt und beziffert** — rund 40 % weniger Neueinträge
  pro Monat bei gleichbleibender Leistung.
- **Die eigentliche Warnung ist älter als die Novelle:** Das Register sah auch vorher nur
  etwa jede achte Haushaltsanlage. Wer aus ihm eine Gemeindezahl baut und sie „Solaranlagen
  in X" nennt, behauptet Vollständigkeit, die es nie gab.
- **Die Lizenzfrage bleibt offen** und lässt sich nicht aus den Seiten beantworten. Sie ist
  eine Anfrage an das Amt, keine weitere Recherche.

---

## Was nicht geprüft wurde (damit es niemand für geprüft hält)

- Polen: Energa-Operators Liste nach Art. 7 Abs. 8l (Seite baut sich erst im Browser auf);
  PGEs Karten-Anwendung; Tauron- und Stoen-Fassungen derselben Liste; die XLSX-Gemeindetabelle
  des Umweltfonds Poznań; der Gesetzestext im Gesetzblatt.
- Slowakei: VSDs KML-Dateien; SSDs Angebot; OKTE hinter dem Marktteilnehmer-Zugang; die
  Einzelverträge im zentralen Vertragsregister (bewusst nicht — Personenbezug).
- Tschechien: die Kartenanwendungen von ČEZ Distribuce, EG.D und PREdistribuce im Detail;
  der Gesetzestext von Lex OZE III.
