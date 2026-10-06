# Nachprüfung Ungarn · Rumänien · Griechenland

**Auftrag:** Die erste Recherche (`nord-ost-uk.md`, 23.09.2026 vormittags) hat für diese drei Länder
Urteile gefällt, bei denen jeweils etwas offen blieb. Diese Nachprüfung schließt die offenen Punkte.

**Stand aller Abrufe: 23.09.2026.** Jede Aussage ist als GEPRÜFT (selbst aufgerufen, Datei selbst
geladen, Zeilen selbst gezählt) oder UNGEPRÜFT gekennzeichnet.

**Das Ergebnis vorweg: Bei allen drei Ländern ändert sich das Urteil — bei Rumänien und Griechenland
grundlegend.** Beide haben ein Einzelanlagen-Register mit Ortsbezug; es lag nur nicht dort, wo die
erste Recherche gesucht hat. Nicht bei der Regulierungsbehörde, sondern beim Verteilnetzbetreiber.

---

## Warum die erste Recherche daneben lag — eine Lehre für die übrigen Länder

Die erste Runde hat in allen drei Ländern **die Regulierungsbehörde** gefragt. Die veröffentlicht
Auswertungen: Summen je Kreis, Jahresberichte, Genehmigungsregister. Was sie nicht veröffentlicht,
ist die Anlagenliste — die hat sie gar nicht selbst, sie bekommt sie gemeldet.

**Die Anlagenliste liegt beim Verteilnetzbetreiber**, und in Rumänien wie Griechenland ist ihre
Veröffentlichung **gesetzlich angeordnet**: in Rumänien durch die ANRE-Verordnung (Anexa 8.1), in
Griechenland durch die Veröffentlichungspflicht für Net-Metering-Anträge. Beide Male entsteht dabei
genau das, was ein Solar-Atlas braucht — und beide Male hat die erste Suche es nicht gefunden, weil
sie nach dem Wort „Register" statt nach dem Wort „Netzanschluss" gesucht hat.

**Für die noch offenen Länder gilt daher: Wenn die Regulierungsbehörde nur Summen liefert, ist die
Recherche nicht zu Ende — dann sind die Verteilnetzbetreiber einzeln durchzusehen.**

---

# UNGARN

## 1. Ist die Datei für 2025 erschienen?

**NEIN — GEPRÜFT 23.09.2026.**

Die Behördenseite ist eine im Browser aufgebaute Anwendung; ein einfacher Abruf liefert nur eine
18-kB-Hülle (GEPRÜFT, dreimal wiederholt — auch mit Browser-Kennung, auch über `/sitemap.xml`, das
dieselbe Hülle zurückgibt). **Mit einem echten Browser ist die Seite vollständig lesbar** — das war
der fehlende Schritt der ersten Recherche.

Vollständige Dateiliste der Seite
<https://mekh.hu/nem-engedelykoteles-kiseromuvek-es-haztartasi-meretu-kiseromuvek-adatai>
(GEPRÜFT 23.09.2026, aus dem aufgebauten Seitenbaum ausgelesen):

```
Háztartási méretű kiserőművek 2024. évi adatai     download/b/0c/a1000/HMKE_2024_Q1_Q4.xlsx
Háztartási méretű kiserőművek 2023. évi adatai     download/3/64/61000/HMKE_adatok_2023.xlsx
Háztartási méretű kiserőművek 2022. évi adatai     download/4/38/31000/HMKE_2022_fin.xlsx
Háztartási méretű kiserőművek 2021. évi adatai     download/f/a2/11000/2021_HMKE.xlsx
Háztartási méretű kiserőművek 2021 (Q1–Q3)         download/3/da/01000/2021_Q1_Q2_Q3_HMKE.xlsx
Háztartási méretű kiserőművek 2020. évi adatai     download/b/39/f0000/2020_HMKE.xlsx
Háztartási méretű kiserőművek 2019 + 2020 Q1–Q3    download/fix/2019_2020_Q1_Q2_HMKE
Nem engedélyköteles, nem HMKE 2022                 download/d/9a/31000/Nem_engedélyköteles_nem_HMKE_2022.xlsx
+ vier Quartalsberichte 2019 als PDF
```

**Neuester Jahrgang ist 2024.** Neun Monate nach Jahresende 2025 liegt noch nichts vor. Ein
Veröffentlichungsdatum lässt sich nicht bestimmen — die Dateiauslieferung sendet **kein**
`Last-Modified` (GEPRÜFT).

**Nebenbefund, der spätere Läufe billiger macht:** Die Anwendung hat eine offene Schnittstelle.
`https://www-wb.mekh.hu/api/v1/pages` gibt den vollständigen Seitenbaum als JSON heraus (GEPRÜFT:
HTTP 200, 725 kB, 2.728 Einträge). Damit ist die Seite **ohne Browser** überwachbar — ein Wächter
auf neue Jahrgänge braucht keinen Browser-Abruf.

## 2. Kreisebene (járás) — taugt sie für Regionalseiten?

**JA, und sie ist der stärkere Teil der Quelle — GEPRÜFT 23.09.2026** (Blatt
`HMKE PV területi bontásban` in `HMKE_2024_Q1_Q4.xlsx`, selbst geladen, 189.037 Byte).

| Eigenschaft | Befund |
|---|---|
| Einheiten | **174 járás + 23 Budapester Bezirke** = 197 Gebiete (GEPRÜFT, ausgezählt) |
| Felder | Gebietsname · installierte Leistung (kW) · Anlagenzahl (Stück) |
| Zeitachse | **2019 · 2020 · 2021 · 2022 · 2023 · 2024** — je Jahr beide Felder (GEPRÜFT) |
| Kleinanlagen | ja, ausschließlich — HMKE ist definitionsgemäß die Haushaltsanlage |

Gemessene Summen je Jahr (GEPRÜFT, selbst gerechnet):

```
Jahr   járás (174)              Budapest (23 Bez.)      zusammen
2019     441.342 kW /  54.112     37.881 kW /  4.994      479,2 MW /  59.106
2020     666.857 kW /  81.358     51.797 kW /  6.735      718,7 MW /  88.093
2021   1.041.126 kW / 123.802     83.606 kW / 10.647    1.124,7 MW / 134.449
2022   1.375.502 kW / 157.338    116.884 kW / 14.254    1.492,4 MW / 171.592
2023   2.125.109 kW / 233.413    204.380 kW / 23.058    2.329,5 MW / 256.471
2024   2.447.594 kW / 269.041    233.084 kW / 25.649    2.680,7 MW / 294.690
```

**Die Zeile 2023 trifft den Landeswert des Quartalsblatts auf die Stelle** (2.329,5 MW / 256.471 —
GEPRÜFT durch Vergleich mit Blatt `HMKE PV 24márc, jún, szept, dec`). Das Kreisblatt ist also
vollständig und in sich stimmig.

**Für Regionalseiten ist das die brauchbarste ungarische Quelle:** sechs Jahrgänge, beide Kennzahlen,
Budapest auf Bezirksebene. Der Nachteil ist die Größe der Einheit — ein járás umfasst im Schnitt
18 Gemeinden.

## 3. Der Zahlenwiderspruch (2.456 gegen 2.690 MW) — vollständig aufgelöst

**Die Lücke ist Budapest. Sie löst sich auf das Kilowatt genau auf — GEPRÜFT 23.09.2026.**

Das Gemeindeblatt (`HMKE PV települési bontásban`) führt **3.155 Zeilen**, also alle ungarischen
Gemeinden, mit Ortsname, kW und Stück (GEPRÜFT, ausgezählt; **keine doppelten Ortsnamen**, GEPRÜFT).
Summe: **2.456.458,7 kW / 270.569 Anlagen.** Der Landeswert derselben Datei: **2.690.000 kW /
296.231.**

```
Gemeindeblatt gesamt                    2.456.458,7 kW / 270.569
  = Kreisblatt ohne Budapest            2.447.593,8 kW / 269.041
  + Zeile „Budapest" im Gemeindeblatt       8.864,9 kW /   1.528
                                        ------------------------
                                        2.456.458,7 kW / 270.569   ✓ zeichengleich

Landeswert Q4/2024                      2.690.000,0 kW / 296.231
  − Kreisblatt gesamt inkl. Budapest    -2.680.677,4 kW / 294.690
                                        ------------------------
  ohne Gebietszuordnung                     9.322,6 kW /   1.541

Lücke Gemeindeblatt → Land                233.541,3 kW  (8,68 %)
  davon Budapest-Bezirke minus Bp-Zeile   224.218,7 kW
  davon ohne Gebietszuordnung               9.322,6 kW
                                        ------------------------
                                          233.541,3 kW   ✓ exakt
```

**Im Klartext: Das Gemeindeblatt führt Budapest als EINE Zeile mit 8,9 MW / 1.528 Anlagen. Das
Kreisblatt führt dieselbe Stadt in 23 Bezirken mit 233,1 MW / 25.649 Anlagen — dem Sechsundzwanzigfachen.**
Dazu kommen 9,3 MW / 1.541 Anlagen, die überhaupt keinem Gebiet zugeordnet sind.

**Folge für jede Nutzung — BLOCKER:** Wer das Gemeindeblatt ungeprüft verwendet, setzt auf eine
Budapester Ortsseite 4 % des wahren Bestands. Das ist genau die Fehlerklasse, die von außen
unsichtbar ist: Die Zahl sieht plausibel aus, die Datei ist amtlich, nichts schlägt an. **Budapest
muss aus dem Kreisblatt kommen, nicht aus dem Gemeindeblatt.**

**Was das Gemeindeblatt sonst NICHT kann:** Es trägt **keinen Gemeindeschlüssel**, nur den Namen.
Für die Zuordnung auf Geometrien müsste über Namen gematcht werden. Immerhin: Die 3.155 Namen sind
untereinander eindeutig (GEPRÜFT). Und es gibt **nur diesen einen Stichtag** — die Datei für 2023
enthält **kein** Gemeindeblatt (GEPRÜFT: Blätter sind `HMKE 2008-2023`, `HMKE 23dec`,
`HMKE PV 23dec`, `Ábra`, `HMKE PV területi bontásban`). Die Gemeindeebene gibt es erst ab dem
Jahrgang 2024, und damit **ohne Zeitachse**.

## 4. Andere Quellen

### 4a. NEU GEFUNDEN: die MEKH-Datenbank der Einspeise-Anschlüsse

**Diesen Bestand hatte die erste Recherche nicht — und er ist zwei Jahre aktueller als die
HMKE-Dateien.** Seite <https://mekh.hu/elerheto-a-betaplalasi-iranyu-csatlakozasokrol-szolo-mekh-adatbazis1>,
Datei `https://mekh.hu/download/fix/betaplalasi_iranyu_csatlakozasok` (GEPRÜFT 23.09.2026, HTTP 200,
426.324 Byte, `Content-Disposition: filename=betaplalasi_iranyu_csatlakozasok.pdf`, 21 Seiten).

| Eigenschaft | Befund (GEPRÜFT, selbst ausgezählt) |
|---|---|
| Rechtsgrundlage | **14/2025. (IX.3.) MEKH rendelet** — Pflichtveröffentlichung |
| Stand | **31. Juli 2026** |
| Zeilen | **662 Anschlusspunkte**, davon **562 Sonne**, 52 Wind |
| Orte | rund 258 verschiedene Gemeindenamen |
| Felder | Gemeindename · Umspannwerk · Betreiber · Steuernummer · verfügbare Einspeiseleistung (MVA) · Entnahmeleistung · Spannungsebene · **Energieträger** · Speichertechnik · frühester Anschlusstermin · Anschlussentgelt · Bemerkung · Aktenzeichen |
| Kleinanlagen | **nein** — Schwelle ist **0,5 MW**, Mittel- und Hochspannung |
| Zeitachse | nein, ein Stichtag; die Bemerkungsspalte trennt „bereits in Betrieb" von „vor Inbetriebnahme" |

**Was er ist und was nicht:** Er ergänzt die HMKE-Dateien nach oben — Haushaltsanlagen bis 50 kVA
dort, Anlagen ab 500 kW hier. Dazwischen (50 kVA bis 500 kW) klafft eine Lücke, für die es nur die
Datei `Nem_engedélyköteles_nem_HMKE_2022.xlsx` gibt, und die endet 2022. Und es sind
**Anschlusspunkte, keine Anlagen** — eine Adresse kann mehrere tragen, und geplante sind enthalten.

### 4b. Statistikamt KSH — hat keine eigene Tabelle

**Das KSH führt keine Solartabelle nach Gemeinde oder Kreis; es benutzt selbst die MEKH-Daten —
GEPRÜFT 23.09.2026.**

Belegt am eigenen Fachaufsatz des Amtes: Szép Tekla / Tóth Géza, „A háztartási méretű napelemes
rendszerek térbeli mintázata a hazai járásokban", *Statisztikai Szemle* 103 (2025) Heft 2
(<https://www.ksh.hu/statszemle_archive/all/2025/2025_02/2025_02_113.pdf>, selbst geladen,
4.200.838 Byte). Dort im Wortlaut:

> „…Közmű-szabályozási Hivatal **járási szintű adatbázisa**, amely **Budapest kerületeit is
> tartalmazza**. Az adatok a **2019–2023**-as időszakra érhetők el (MEKH, 2024)."

Also: die Autoren des Statistikamts greifen für genau diese Frage auf die MEKH-Kreisdatei zurück und
bestätigen nebenbei deren Aufbau (Kreise plus Budapester Bezirke, Reihe ab 2019).

### 4c. Übertragungsnetzbetreiber MAVIR — nur Landesebene

**Kein Gebietsbezug — GEPRÜFT 23.09.2026.** `https://www.mavir.hu/web/mavir/adatok` antwortet mit
404; der richtige Einstieg ist `…/adatpublikaciok-es-kiadvanyok` (GEPRÜFT, HTTP 200, 118.825 Byte).
Sein Inhaltsverzeichnis führt ausschließlich systemweite Reihen: „VER aktuális adatok", „VER napi /
heti / havi / éves adatok", „VER forgalmi adatok", „Rendszerszintű szolgáltatások", dazu unter
Tudásbázis „Saját célra termelő (SCTE) ipari PV termelés". **VER = villamosenergia-rendszer**, also
das Gesamtsystem. Eine Aufteilung nach Komitat, Kreis oder Gemeinde kommt darin nicht vor.

### 4d. Verteilnetzbetreiber — nichts gefunden

**Kein Gebietsdatensatz gefunden; kein Beleg für Nichtexistenz.** Gesucht wurde nach
Veröffentlichungen von E.ON Hungária/ELMŰ, MVM Démász, MVM ÉMÁSZ und OPUS TITÁSZ (GEPRÜFT, dass die
Suche nichts anderes ergab). Was sie veröffentlichen, sind Antragsverfahren, Formulare und
Wechselrichter-Listen. **Die Sechser-Aufteilung im MEKH-Quartalsblatt beweist, dass die Daten je
Netzbetreiber existieren** — MEKH weist sie dort aus (E.ON Észak-Dunántúl, E.ON Dél-Dunántúl, OPUS
TITÁSZ, ELMÜ, MVM ÉMÁSZ, MVM DÉMÁSZ, GEPRÜFT). Sie werden nur vom Netzbetreiber selbst nicht
publiziert. **Anders als in Rumänien gibt es in Ungarn keine Verordnung, die sie dazu zwingt** — und
genau das ist der Unterschied, der Rumänien zum besseren Fall macht.

## 5. Lizenz

### 5a. Die Rechtserklärung — und die Feinheit, die die erste Recherche überlesen hat

Volltext <https://mekh.hu/jogi-nyilatkozat>, Abschnitte 1 und 2 (GEPRÜFT 23.09.2026, im Browser
gelesen, hier im Wortlaut):

> **1. Szerzői jogvédelem**
> „A Magyar Energetikai és Közmű-szabályozási Hivatal … weboldalán szereplő adatok, tájékoztató
> anyagok, letölthető dokumentumok, elemzések … szerzői jogi oltalom alatt áll, az azokkal
> kapcsolatos vagyoni jogok gyakorlására kizárólagosan a Hivatal jogosult."
>
> **2. A honlap használatának feltételei**
> „A weboldal tartalmának akár részben, akár egészben történő, a saját személyes használatot
> meghaladó vagy attól eltérő célú bármilyen használata a Hivatal előzetes írásbeli engedélye nélkül
> **kizárólag a forrás megjelölésével történhet**. A Hivatal előzetes írásbeli engedélye nélkül az
> oldalak, valamint azok alkotóelemének **nyilvános közzététele tilos**."

**Das sind zwei Sätze, und sie sagen Verschiedenes.** Die erste Recherche hat nur den zweiten
gelesen („öffentliche Zugänglichmachung ohne schriftliche Genehmigung untersagt"). Der erste sagt:
Jede Nutzung über den rein persönlichen Gebrauch hinaus ist ohne Genehmigung erlaubt, **sofern die
Quelle genannt wird**. Der zweite verbietet die öffentliche Wiedergabe „der Seiten und ihrer
Bestandteile".

**Die Trennlinie liegt also zwischen dem Weiterverbreiten der Datei und dem Veröffentlichen eigener
Ableitungen daraus.** Ob eine Gemeindeseite mit gerechneten Kennzahlen unter Quellenangabe noch
Satz 1 oder schon Satz 2 ist, entscheidet diese Klausel nicht — das ist eine Frage für einen
Legal-Judge, nicht für einen Rechercheur. **Was sie ausdrücklich NICHT ist: eine schlichte
Vollsperre.** Das war das Urteil der ersten Runde und es ist zu streng.

### 5b. Gesetzliche Weiterverwendung — es gibt einen Weg, und er ist neu

**Ungarn hat ein Weiterverwendungsregime, und es ist seit dem 01.04.2024 ein anderes als früher —
GEPRÜFT 23.09.2026.**

- Das **2012. évi LXIII. törvény a közadatok újrahasznosításáról** (Umsetzung der PSI-Richtlinie)
  ist **aufgehoben**. Im Wortlaut der amtlichen Gesetzessammlung (njt.jog.gov.hu): „A törvényt a
  **2023. évi CI. törvény** 104. § a) pontja **hatályon kívül helyezte 2024. április 1. napjával**."
- An seine Stelle trat das **2023. évi CI. törvény a nemzeti adatvagyon hasznosításának rendszeréről
  és az egyes szolgáltatásokról** (Gesetz über die Nutzung des nationalen Datenvermögens). Es regelt
  die Weiterverwendung von Verwaltungsdaten, mit den Grundsätzen **Transparenz, Diskriminierungsverbot,
  Verbot von Ausschließlichkeitsrechten** und **Gebühren höchstens in Höhe der Grenzkosten**, dazu
  Gebührenbefreiungen für große Datensätze und Forschungsdaten. Der Zugang läuft über ein
  **Antragsverfahren**.

**Das ist die praktisch wichtigste Erkenntnis für Ungarn:** Die „vorherige schriftliche Genehmigung",
die MEKH verlangt, ist nicht Willkür, sondern **genau der Weg, den das Gesetz vorsieht** — und das
Gesetz verpflichtet die Behörde dabei zu Diskriminierungsfreiheit und Grenzkostengebühren. Eine
Anfrage hat damit eine Rechtsgrundlage und keine bloße Bittstellerposition.

### 5c. Offenes Datenportal — Fehlanzeige

**Die MEKH-Daten stehen auf keinem offenen Datenportal — GEPRÜFT 23.09.2026.** Die Suche nach „MEKH"
im europäischen Datenportal (`data.europa.eu/api/hub/search`) liefert **einen** Treffer, und der ist
eine senegalesische Bodenkarte (GEPRÜFT).

---

# RUMÄNIEN

## Das Urteil der ersten Recherche ist überholt

**Rumänien hat ein Einzelanlagen-Register mit Ortsbezug, Anschlussdatum und Leistung. Es liegt bei
den vier Verteilnetzbetreibern, wird monatlich fortgeschrieben, und bei einem davon als Tabelle.**

Die erste Recherche hatte nur die Regulierungsbehörde ANRE angesehen und deren Kreis-PDFs als
feinste Ebene bewertet. Die Verteilnetzbetreiber wurden dort ausdrücklich als „UNGEPRÜFT" vermerkt.

## 1. Die vier Verteilnetzbetreiber — alle veröffentlichen, einer als Tabelle

Rechtsgrundlage ist **ANRE-Verordnung Nr. 52/2021, später Nr. 185/2022, Anhang 8.1** —
„Informații privind prosumatorii racordați la rețeaua de distribuție" (Angaben über die an das
Verteilnetz angeschlossenen Prosumenten). Alle vier Netzbetreiber veröffentlichen sie monatlich.

| Netzbetreiber | Format | Neuester Stand | Zeilen | Kreise | GEPRÜFT? |
|---|---|---|---|---|---|
| **Rețele Electrice România** | **XLSX** | **Juli 2026** | **99.396** | 11 (inkl. Bukarest) | **ja, ausgezählt** |
| Distribuție Energie Oltenia | PDF (1.276 S.) | Mai 2026 | **59.960** | 7 | **ja, ausgezählt** |
| DEER Zone MN | PDF (1.280 S.) | Juli 2026 | **47.595** | 6 | **ja, ausgezählt** |
| DEER Zone TS | PDF (18,7 MB) | Juli 2026 | nicht gezählt | — | Datei geladen, Kopf gelesen |
| DEER Zone TN | PDF (8,3 MB) | Juni 2026 | nicht gezählt | — | Datei geladen, Kopf gelesen |
| Delgaz Grid | ZIP → PDF (25 MB) | Juni 2026 | nicht gezählt | — | Existenz + Typ geprüft, Inhalt nicht |

**Allein die drei ausgezählten Dateien ergeben 206.951 Einzelanlagen** — gegenüber rund 346.000
Prosumenten im Land insgesamt (Landeszahl UNGEPRÜFT, aus der ersten Recherche übernommen).

**Delgaz Grid ließ sich nicht auslesen, und der Grund ist benannt:** Der Server weist jeden
Kommandozeilen-Abruf mit HTTP 403 ab, auch mit vollständigen Browser-Kopfzeilen (GEPRÜFT, zweimal).
Aus dem Browser heraus kommt die Datei durch — GEPRÜFT: `status 200`,
`content-type: application/zip`, **24.984.978 Byte**, ein einziger Eintrag namens
`Delgaz Grid - Ord ANRE 52 - Anexa 8.1 - iunie 2026.pdf`. Ihre **Existenz, Größe, Aktualität und ihr
Typ sind damit belegt**; ihr Inhalt ist **UNGEPRÜFT**. Dass er dem vorgeschriebenen Anhang-8.1-Muster
folgt, ist plausibel (der Dateiname nennt die Verordnung) — aber nicht nachgesehen.

### Was in den Dateien steht

**Rețele Electrice (XLSX, die beste Form) — GEPRÜFT, Spalten selbst gelesen:**

```
Nr. crt. · Codul unic al punctului de masura · Forma de organizare (PF/PJ) · Tip SRE ·
Adresa locului de consum şi de producere · Judet · Numărul certificatului de racordare ·
Data certificat de racordare · Consum final propriu (CFP) · Consumatori la barele centralei ·
Puterea electrică instalată (kW) · Puterea electrică aprobată pentru evacuare ·
Capacitate baterii de stocare (Ah) · Formula de calcul · Cod Furnizor ·
Cantitatea de energie electrică · Tensiune Nominala la Capacitatea de Stocare
```

Gemessen (GEPRÜFT, selbst gerechnet): 99.396 Zeilen · **99.391 solar**, 3 Wind, 2 Biogas ·
**89.474 natürliche Personen / 9.922 juristische** · 11 Kreise · **1.245.287,8 kW = 1.245,3 MW** ·
Anschlussjahre 2018 (1) · 2019 (49) · 2020 (292) · 2021 (2.809) · 2022 (7.162) · 2023 (18.662) ·
2024 (22.310) · **2025 (28.325)** · 2026 (19.786, bis Juli).

Beispielzeilen im Wortlaut (GEPRÜFT):

```
Str. Marului, nr. 2, loc Corbeanca        | IF | 2019-01-14 | 22 kW
Str. Broscari, nr. 81, loc. Balotesti     | IF | 2019-04-16 | 12,5 kW
Str. Drumul Valea Cricovului, nr.103 Lot1, sector 6 | B | 2019-05-06 | 18 kW
```

**Distribuție Oltenia (PDF) trägt zusätzlich die Postleitzahl** und maskiert dafür den Anlagennamen
(GEPRÜFT):

```
'59401060000205528571623584  PF  solar  CEF*****LIA   ROSIORI DE VEDE,REPUBLICII,145100  TR  ...  4,00 kW
'59401010000297692971519019  PF  solar  CEF*****DAN   CRAIOVA,SOSEAUA POPOVENI,200633    DJ  ... 11,96 kW
```

3.834 verschiedene Kombinationen aus Ort und Postleitzahl (GEPRÜFT, ausgezählt).

**DEER (PDF)** trägt Ort, Straße und **Hausnummer** ohne Maskierung (GEPRÜFT):

```
594030100003499278  PF  solar  LIPANESTI, str. RADU STANIAN, nr. 604  PH  ...  2019-05-20  8,00 kW
```

### Die drei Grenzen dieser Quelle — ehrlich benannt

1. **Es ist PERSONENBEZOGEN, und zwar deutlich.** Straße und Hausnummer einer Privatperson plus
   Anlagenleistung plus Anschlussdatum. Für einen Atlas brauchen wir davon **nur den Ort** — die
   Aggregation auf Gemeindeebene entfernt den Personenbezug. Aber die **Verarbeitung auf dem Weg
   dorthin** ist eine eigene Frage, und sie ist hier nicht beantwortet.
2. **Der Ort steckt im Freitext.** Es gibt keine eigene Gemeindespalte und keinen SIRUTA-Schlüssel.
   Drei Netzbetreiber, drei Schreibweisen („loc. Balotesti", „ROSIORI DE VEDE,REPUBLICII,145100",
   „LIPANESTI, str. …"). Das Herauslösen des Ortsnamens ist Textarbeit mit allen bekannten Fallen.
3. **Fünf von sechs Dateien sind PDF**, teils 1.280 Seiten. Nur Rețele Electrice liefert XLSX.

### Die Zeitachse ist der eigentliche Gewinn

**Jede Zeile trägt ihr eigenes Anschlussdatum** (`Data certificat de racordare`), taggenau, zurück
bis 2015. Damit ist **kein Monatsvergleich zweier Dateien nötig** — der Zubau je Jahr und Gemeinde
steht in einer einzigen Datei. Das ist mehr, als die ungarische Quelle hergibt, und in derselben
Klasse wie das deutsche Anlagenregister.

## 2. Lizenz — data.gov.ro im Volltext und die Bedingungen der Netzbetreiber

**Das nationale Datenportal:** <https://data.gov.ro/pages/termeni> und `/about` selbst geladen
(GEPRÜFT 23.09.2026, je 30.009 bzw. 17.079 Byte). Kernaussagen im Wortlaut:

> „În România, cadrul legal pentru publicarea datelor deschise a fost stabilit de **Legea nr. 109/2007**
> privind reutilizarea informațiilor din instituții publice, modificată și completată de Legea nr. 299/2015."
>
> „…portalul pune la dispoziția utilizatorilor **Licența pentru o Guvernare Deschisă — OGL ROU 1.0**,
> emisă în 2014 de Secretariatul General al Guvernului ca model de licență deschisă."
>
> Auf der Bedingungsseite zusätzlich: „**LEGE nr. 179 din 9 iunie 2022** privind datele deschise și
> reutilizarea informațiilor din sectorul public" — die Umsetzung der Richtlinie (EU) 2019/1024.

**Aber: Es liegt dort nichts.** Die Abfrage `package_search?q=prosumatori` liefert **0 Treffer**
(GEPRÜFT). Weder ANRE noch ein Netzbetreiber stellt seine Daten dort ein.

**Die Bedingungen des Netzbetreibers sind restriktiv.** DEER, Abschnitt 1 „Dreptul de copyright"
(<https://www.distributie-energie.ro/termeni-si-conditii/>, GEPRÜFT, im Wortlaut):

> „Pentru toate informaţiile existente pe acest site, dreptul de copyright este deţinut de Distribuţie
> Energie Electrică Romania ori de afiliaţii săi. **Niciun material de pe acest site nu poate fi
> reprodus parţial, integral sau modificat fără acordul expres exprimat** de către Distribuţie Energie
> Electrică Romania, ori de titularul acestui drept. Toate drepturile sunt rezervate…"

**Die entscheidende rechtliche Trennlinie, und sie ist neu gegenüber der ersten Recherche:**
Das Gesetz 179/2022 verpflichtet **öffentliche Stellen**. ANRE ist eine; **die Verteilnetzbetreiber
sind private Aktiengesellschaften**. Für sie gilt das Weiterverwendungsgesetz nicht in derselben
Weise — ihre Veröffentlichung ist zwar **behördlich angeordnet** (ANRE-Verordnung), ihre
Nutzungsbedingungen sind aber ihre eigenen. **Das ist eine Legal-Judge-Frage und wird hier nicht
entschieden.** Festzuhalten ist nur: Es ist eine *andere* Frage als bei ANRE, und die erste
Recherche hat beide nicht getrennt.

Die Nutzungsbedingungen von Rețele Electrice waren nicht auslesbar — die Adresse
`reteleelectrice.ro/termeni-si-conditii/` liefert **1,25 MB Binärdaten statt HTML** (GEPRÜFT, keine
Textextraktion möglich). UNGEPRÜFT.

## 3. Statistikamt INS (Tempo-Online) — nichts unterhalb der Landesebene

**GEPRÜFT 23.09.2026, der gesamte Matrizenkatalog durchsucht**
(`http://statistici.insse.ro:8077/tempo-ins/matrix/matrices`, 361.919 Byte, selbst geladen).

**37 Matrizen mit Energiebezug.** Die beiden einzigen zur Stromerzeugungskapazität sind:

- `IND114A` — „Puterea instalata a grupurilor electrogene la sfarsitul anului pe categorii de
  centrale electrice"
- `IND118A` — „Productia de energie electrica pe categorii de centrale electrice"

**Beide haben keine Gebietsdimension.** `IND114A` im Detail abgefragt (GEPRÜFT): genau **drei**
Dimensionen — Kraftwerkskategorie (Total, Termoelectrica, Hidroelectrica, Eoliana, …), Jahr (ab
1992), Maßeinheit (Mii kW). Letzte Aktualisierung 27.11.2025.

Die **einzige** Matrix mit Ortsebene im Energiebereich ist `GOS109A` „Energia termica distribuita pe
judete si localitati" — **Fernwärme**, nicht Strom.

**Ergebnis: Das rumänische Statistikamt hat keine Solar- oder Prosumentenzahl unterhalb der
Landesebene.**

## 4. Förderprogramm „Casa Verde Fotovoltaice" — keine Ortsangabe

**Die Empfängerlisten tragen keinerlei Ortsbezug — GEPRÜFT 23.09.2026.**

Geladen: `https://www.afm.ro/main/programe/sisteme_fotovoltaice/2025/lista_solicitanti_2024_pf_aprobati-2025_03_04.pdf`
(3.554.511 Byte, **205 Seiten**; der Umweltfonds weist Kommandozeilen-Abrufe mit HTTP 503 ab, der
Abruf gelang mit der Sitzungskennung aus dem Browser — GEPRÜFT). Kopf und erste Zeilen im Wortlaut:

```
 ADMINISTRATIA FONDULUI PENTRU MEDIU
   Anexă - Cereri de finanțare aprobate.
NrCrt            Cod                Finanțare aprobată(lei)
 1      BESF0220240632000005       30 000.00
 2      BESF0220240632000012       30 000.00
```

**Drei Spalten: laufende Nummer, anonymisierte Antragskennung, Förderbetrag.** Kein Kreis, kein Ort,
kein Name.

**Die Antragskennung hilft auch nicht.** 10.418 Kennungen ausgezählt (GEPRÜFT): alle 20-stellig,
alle mit Präfix `BESF`, alle mit `02` an Stelle 5–6 und `2024` an Stelle 7–10 — **keine Varianz**.
Die Stellen 11–14 haben **24 verschiedene Werte** bei sehr ungleicher Verteilung (0210: 1.217,
0214: 1.144, 0218: 1.033 …). Rumänien hat **42** Kreise; 24 ungleich besetzte Werte passen nicht auf
eine Kreiskennung, wohl aber auf die **validierten Installationsbetriebe**, über die das Programm
abgewickelt wird. **Kein Ortsbezug ableitbar.**

---

# GRIECHENLAND

## Das Urteil der ersten Recherche ist überholt

**Griechenland hat ein Einzelanlagen-Register der Dachanlagen mit Gemeinde, Leistung, Speicher und
Aktivierungsdatum — als Tabelle, monatlich fortgeschrieben, mit Archiv seit 2022.** Es liegt beim
Verteilnetzbetreiber HEDNO/ΔΕΔΔΗΕ, nicht bei der Regulierungsbehörde.

## 1. Das DAPEEP-Bulletin — die „geografische Verteilung" gibt es nicht

**GEPRÜFT 23.09.2026, und der Befund widerlegt die Annahme des Auftrags.**

Die Seite des Marktbetreibers ist gesperrt: `dapeep.gr` antwortet **auf jeden** Abruf mit HTTP 503
(Wordfence), auch im echten Browser („Your access to this site has been limited by the site owner") —
GEPRÜFT, vier Versuche über drei Wege. **Der zweite Weg war das Webarchiv**, und er hat funktioniert:
Über die CDX-Schnittstelle sind die aktuellen Ausgaben auffindbar (343 archivierte Dateien ab 2025,
GEPRÜFT). Die jüngsten:

```
2026/02/32_NOV_2025_min_DELTIO_ELAPE_v_1.0_24.02.2026.pdf
2026/03/33_DEC_2025_min_DELTIO_ELAPE_v_1.0_09.03.2026.pdf
2026/05/34_ANNUAL_2025_min_DELTIO_ELAPE-1.pdf        ← Jahresbulletin 2025
```

Das Jahresbulletin 2025 selbst geladen (GEPRÜFT, 659.127 Byte, **15 Seiten**) und im Volltext
durchsucht. Titel: „**ΜΙΝΙ** ΜΗΝΙΑΙΟ ΑΠΟΛΟΓΙΣΤΙΚΟ ΔΕΛΤΙΟ ΕΙΔΙΚΟΥ ΛΟΓΑΡΙΑΣΜΟΥ ΑΠΕ, ΣΗΘΥΑ & ΑΠΟΘΗΚΕΥΣΗΣ".

**Gebietsbezogene Begriffe im gesamten Dokument (GEPRÜFT, ausgezählt):**

```
Περιφέρ (Region)      1×      Κρήτ (Kreta)   6×
Νομ (Präfektur)       0×      Δήμο (Gemeinde) 0×      γεωγραφ (geografisch) 0×      κατανομή (Verteilung) 0×
```

**Es gibt keine geografische Verteilung.** Die einzige räumliche Unterscheidung ist
**ΔΣ gegen ΜΔΝ** — Verbundsystem gegen nicht verbundene Inseln — plus Kreta als Sonderfall. Das ist
eine Netztopologie, keine Gebietsgliederung.

Die Dachanlagen erscheinen als **eine Landeszahl** (Seite 3, im Wortlaut: „Φ/Β Στέγες — Ενεργές
Συμβάσεις **6.642**, Ισχύς **378,6 MW**, Παραγωγή **479,2 GWh**, Καθαρή Αξία 183,1 εκατ. €").

**Das Wort „ΜΙΝΙ" im Titel deutet auf eine ausführlichere Fassung hin — die wurde nicht gefunden
(UNGEPRÜFT).** Bei gesperrter Quellseite war nur das archivierte Dateiverzeichnis verfügbar, und
darin steht ausschließlich die Mini-Reihe.

## 2. HEDNO/ΔΕΔΔΗΕ — hier liegen die Dachanlagen

### 2a. Das Net-Metering-Register: Einzelanlagen mit Gemeinde

**Das ist der Hauptfund dieser Nachprüfung für Griechenland.**

Seite: <https://www.deddie.gr/el/ypiresies/stathmoi-ape-sithya-apo-aftoparagogous-me-efarmogi-energeiakou-sympsifismou-i-eikonikou-energeiakou-sympsifismou/>
(GEPRÜFT, HTTP 200, 94.354 Byte). Dateien:

```
NET-METERING-Μάιος-2026.xlsx           (10.794.103 Byte, selbst geladen)
VIRTUAL-NET-METERING-Μάιος-2026.xlsx   (   384.522 Byte, selbst geladen)
```

dazu ein Archiv mit Stichtagen **Mai 2022 · Nov 2022 · Aug 2023 · Dez 2023 · Feb 2024 · Aug 2024 ·
Apr 2025 · Okt 2025 · Mai 2026** (GEPRÜFT, aus der Dateiliste).

**Spalten des Registers (GEPRÜFT, alle 35 selbst gelesen):**

```
 0 α/α εφαρμογής ΑΠΕ                    (Antragsnummer)
 1 Ονοματεπώνυμο / Επωνυμία             (Name — personenbezogen)
 2 Θέση Εγκατάστασης                    (Lage/Adresse)
 3 Δήμος                                ← GEMEINDE
 4 Περιφερειακή Ενότητα                 ← Regionaleinheit
 5 Περιφέρεια                           ← Region
 6 Εγκατεστημένη Ισχύς (kW)             ← installierte Leistung
 7 Μέγιστη Ισχύς Παραγωγής (kW)
 8 Ισχύς Συστήματος Αποθήκευσης (kVA)   ← SPEICHER
 9 Τάση Σύνδεσης                        10 Τεχνολ.        11 Χώρος Εγκατάστασης (Dach/Boden)
12 Αρμόδια Περιοχή ΔΕΔΔΗΕ               13 Αρμόδια Περιφέρεια ΔΕΔΔΗΕ      14 Μονάδα Διαχείρισης
15 Αριθ. Πρωτ. Υποβολής Αίτησης         16 Ημ/νία Υποβολής Αίτησης
17–27  elf weitere Verfahrensdaten (Umweltgenehmigung, Angebot, Vertrag …)
28 Ημ/νία Ενεργοποίησης                 ← AKTIVIERUNGSDATUM
29 Ημ/νία Ακύρωσης Αίτησης              30 Αιτία Ακύρωσης
31 Υποσταθμός ΥΤ/ΜΤ   32 Μετασχηματιστής   33 Γραμμή ΜΤ   34 Είδος Αίτησης Σύνδεσης
```

**Gemessen (GEPRÜFT, selbst gerechnet):**

| Größe | Wert |
|---|---|
| Zeilen gesamt | **47.589** |
| davon **aktiviert** (Aktivierungsdatum gesetzt) | **36.207** |
| Technologie | 47.576 ΦΒ (Photovoltaik), 13 ΣΗΘΥΑ (KWK) |
| Aufstellung | **43.888 „Επί Κτιρίου" (auf Gebäude)**, 3.466 auf Boden, 235 ohne Angabe |
| **Gemeinden mit aktivierter Anlage** | **288** |
| Regionaleinheiten | **63** · Regionen: 12 |
| Leistung aktiviert | **878,7 MW**, davon Photovoltaik **876,2 MW** (36.204 Anlagen) |
| **davon ≤ 10 kW** | **27.781 Anlagen** |
| Aktivierungsjahre | 2015 (114) · 2016 (426) · 2017 (367) · 2018 (399) · 2019 (374) · 2020 (392) · 2021 (713) · 2022 (3.229) · 2023 (8.622) · **2024 (16.126)** · 2025 (5.261) · 2026 (184) |

Griechenland hat 332 Gemeinden; **288 davon tragen mindestens eine aktivierte Anlage.**

Das virtuelle Net-Metering ist dieselbe Struktur in klein: 1.678 Zeilen, 589 aktiviert (GEPRÜFT).

**Damit hat Griechenland genau das, was der ersten Recherche fehlte: die privaten Dachanlagen, je
Gemeinde, mit Leistung, Speicher und Datum.** Dass sie fehlten, war richtig beobachtet — sie fehlen
im Genehmigungsregister, weil sie keine Genehmigung brauchen. Sie stehen beim Netzbetreiber.

**Die Grenzen:**
- **Personenbezogen** (Spalte 1 trägt den Klarnamen, Spalte 2 die Lage). Für einen Atlas wird nur
  Spalte 3 gebraucht; die Aggregation entfernt den Bezug. Die Verarbeitung auf dem Weg dorthin ist
  eine eigene Frage und hier nicht beantwortet.
- **Es sind ANTRÄGE.** Nur 36.207 von 47.589 sind aktiviert. Wer den Bestand will, filtert auf
  Spalte 28 — sonst zählt er Anträge als Anlagen.
- Kein Gemeindeschlüssel, nur der Name. Griechische Gemeindenamen stehen in der Datei in Großbuchstaben
  und im Genitiv („ΑΘΗΝΑΙΩΝ", „ΚΑΛΑΜΑΤΑΣ") — für die Zuordnung auf Geometrien ist das Textarbeit.

### 2b. Das HEDNO-Datenportal: Leistung und Erzeugung je Regionaleinheit, monatlich

**Zweiter Fund, und er hat eine offene Schnittstelle — GEPRÜFT 23.09.2026.**

<https://apps.deddie.gr/apedata/> („ΔΕΔΔΗΕ ΑΠΕ", Angular-Anwendung mit Karte). Die darunterliegende
REST-Schnittstelle ist **ohne Anmeldung und ohne Schlüssel** erreichbar:

```
https://apps.deddie.gr/mdp/rest/apedata/map?area=regionalUnit&timeAggregation=month&date=01-08-2026%2000:00:00&source=solar
```

Eigener Abruf (GEPRÜFT): HTTP 200, `application/json`, 8.053 Byte, Felder
`areaCode · production · percentage · carbon · installedPower`.

**Gemessen für August 2026, Energieträger Sonne (GEPRÜFT, selbst gerechnet):**
**74 Regionaleinheiten**, alle mit Leistung, Summe **7.732,7 MW installiert** und **1.241,8 GWh
Erzeugung** im Monat. Größte: Gebiet 0502 mit 573,9 MW, dann 0804 mit 445,0 MW.

Energieträger-Codes der Schnittstelle (GEPRÜFT): `solar · wind · hydro · biomass · naturalGas · other`.
Gebietsstufen: `country · region · regionalUnit`. Zeitstufen: u. a. `month`.

Das Feld `percentage` („Ποσοστό της ισχύος για το οποίο λαμβάνονται μετρήσεις" — Anteil der Leistung,
für die Messungen vorliegen) liegt je Gebiet zwischen 69 % und 95 % — die Erzeugungszahl ist also
teilweise hochgerechnet. **Die installierte Leistung ist davon nicht betroffen** (UNGEPRÜFT, aus dem
Aufbau geschlossen).

**Was NICHT geprüft werden konnte:** ob die 7.732,7 MW die Net-Metering-Dachanlagen enthalten. Der
Erklärtext „Σχετικά με τα δεδομένα" ließ sich nicht öffnen (GEPRÜFT, drei Versuche über Klick und
Skript; kein Dialog erschien, kein Textbaustein in den Anwendungsdateien auffindbar). **UNGEPRÜFT.**
Die Größenordnung spricht dafür, dass sie enthalten sind — 7,7 GW im Verteilnetz gegenüber 876 MW
aktiviertem Net-Metering —, aber das ist ein Indiz, kein Beleg.

## 3. ELSTAT und Energieministerium — nichts unterhalb der Landesebene

**Energieministerium: GEPRÜFT 23.09.2026.** Die Statistikseite
<https://ypen.gov.gr/energeia/statistika-stoicheia/> (Kommandozeilen-Abruf HTTP 403, im Browser
gelesen) führt drei Blöcke: Strompreise, Gaspreise und **„Παραγωγή – Κατανάλωση – Ενεργειακό
Ισοζύγιο"** mit den Jahres-Energiebilanzen 2017–2024 (`EL-Energy-balance-sheets-April2026-edition.xlsx`
u. a.). **Energiebilanzen sind Landeswerte.** Keine regionale Aufschlüsselung.

**ELSTAT: nichts gefunden, kein Beleg für Nichtexistenz.** Die gezielte Suche nach einer Solartabelle
nach Region ergab nur Verweise auf die Bilanzen des Ministeriums und auf Marktzahlen des
Branchenverbands ΣΕΦ (GEPRÜFT, dass die Suche nichts anderes ergab).

## 4. Lizenz — deutlich weiter als beim ersten Durchgang

### 4a. Der Kartendienst der Regulierungsbehörde (geo.rae.gr)

**Dienst-Eigenerklärung bestätigt — GEPRÜFT 23.09.2026** (GetCapabilities selbst geladen,
279.530 Byte):

```
Title:             Υπηρεσίες Τηλεφόρτωσης (WFS) γεωχωρικών δεδομένων της Ρυθμιστικής Αρχής Ενέργειας
ProviderName:      Regularity Authority of Energy
Fees:              NONE
AccessConstraints: NONE
```

**Der entscheidende neue Befund: Der Datensatz steht auf dem nationalen offenen Datenportal.**
`data.gov.gr` (CKAN) führt ihn unter der Organisation **ΡΑΑΕΥ** — GEPRÜFT, über die Portal-Schnittstelle
abgefragt: 25 Treffer zu „φωτοβολταϊκά", darunter „Φωτοβολταϊκοί Σταθμοί", „… Άδεια Λειτουργίας",
„… Άδεια Εγκατάστασης", „… Άδεια Παραγωγής".

Metadaten des Hauptdatensatzes (GEPRÜFT, im Wortlaut):

```
title:            Φωτοβολταϊκοί Σταθμοί
name:             gis-raaey-wms-rae_status-v_sdi_r_photovoltaics_all
license_id:       null
license_title:    null
metadata_modified: 2026-05-25
notes:            „Πολύγωνα γηπέδων εγκατάστασης φωτοβολταικών σταθμών, όπως αυτά προκύπτουν από τις
                   αιτήσεις για χορήγηση άδειας παραγωγής…"
Ressourcen:       WMS · GeoJSON · CSV · SHAPE-ZIP · KML · ZIP-Gesamtabzug
```

**Das Lizenzfeld ist leer — das bestätigt die erste Recherche.** Die Notiz bestätigt zugleich, dass
es ein **Antragsregister für Erzeugungsgenehmigungen** ist, also ohne Dachanlagen.

**Neu und wichtiger: Die Nutzungsbedingungen des Portals sagen etwas.** <https://data.gov.gr/el/pages/terms-of-use>
(GEPRÜFT, im Wortlaut gelesen):

> **3.1.** „Η πρόσβαση στην Πύλη και στα αναρτημένα δεδομένα είναι **ελεύθερη, ανοικτή, καθολική και
> μη αποκλειστική** για κάθε Χρήστη, χωρίς υποχρέωση εγγραφής, καταβολής τελών ή παροχής αιτιολογίας."
>
> **3.2.** Jeder Nutzer darf „…**επαναχρησιμοποιεί δεδομένα για οποιονδήποτε νόμιμο σκοπό,
> συμπεριλαμβανομένης της εμπορικής εκμετάλλευσης**" — Daten für jeden rechtmäßigen Zweck
> weiterverwenden, **einschließlich kommerzieller Verwertung** —, dazu ändern, kombinieren, anreichern
> und abgeleitete Werke erzeugen sowie die Schnittstellen für automatisierte Abrufe nutzen.
>
> **3.4. Άδειες:** „Όλα τα σύνολα δεδομένων διατίθενται υπό τους τύπους αδειών που προβλέπει ο νόμος."
> Als häufigste genannt: **CC0** und **CC BY 4.0**.
>
> **3.3.** Verboten sind irreführende Veränderung/Verfälschung und rechtswidrige Zwecke.

Rechtsrahmen dahinter ist **Νόμος 4727/2020, Kapitel Ι' (Art. 59 ff.)**, die griechische Umsetzung
der Richtlinie (EU) 2019/1024, mit dem Grundsatz **„ανοικτά εξ ορισμού" (offen als Voreinstellung)**
— UNGEPRÜFT im Gesetzeswortlaut, belegt über die Portal-Bedingungen und Sekundärquellen.

**Bewertung: Die Lage ist deutlich besser als „keine Lizenz gefunden".** Der Datensatz liegt auf dem
staatlichen Portal, dessen Bedingungen die kommerzielle Weiterverwendung ausdrücklich erlauben, und
das Gesetz stellt öffentliche Daten grundsätzlich offen. **Was fehlt, ist die Lizenzmarke am
Datensatz selbst** — und damit die Angabe, ob CC0 oder CC BY gilt, also ob eine Namensnennung
geschuldet ist. Für eine kommerzielle Nutzung wäre das an die Behörde zu richten; die
Ausgangsposition ist gut.

### 4b. HEDNO — technisch das Beste, rechtlich das Engste

**Die Nutzungsbedingungen von ΔΕΔΔΗΕ sind eindeutig restriktiv — GEPRÜFT 23.09.2026**
(<https://www.deddie.gr/el/oroi-kai-proypotheseis/oroi-chrisis-istoselidas/>, Abschnitt 2
„Δικαιώματα Πνευματικής και Βιομηχανικής Ιδιοκτησίας", im Wortlaut):

> **2.1.** „…αποτελεί πνευματική και βιομηχανική ιδιοκτησία της Εταιρείας… **Για οποιαδήποτε χρήση
> του περιεχομένου του ιστοτόπου, πλην της καθαρά ιδιωτικής, απαιτείται προηγούμενη γραπτή
> συγκατάθεση της Εταιρείας.** Το ίδιο ισχύει και για κάθε αλλαγή, αλλοίωση, προσαρμογή, μετάφραση
> και κάθε άλλη επεξεργασία του περιεχομένου…"
>
> **2.2.** „…οι χρήστες μπορούν να κάνουν χρήση του περιεχομένου του **αποκλειστικά και μόνο για
> προσωπικούς, μη–εμπορικούς σκοπούς. Δεν παραχωρείται κανένα δικαίωμα εμπορικής χρήσεως** επί του
> διαδικτυακού τόπου ή του περιεχομένου αυτού."
>
> **2.4.** „Η αντιγραφή, αναπαραγωγή, τροποποίηση με οποιονδήποτε τρόπο, μέρους ή του συνόλου των
> περιεχομένων… **χωρίς την προηγούμενη έγγραφη συναίνεση** της Εταιρείας είναι παρά[νομη]…"

**Im Klartext: persönlich und nicht-kommerziell; alles andere braucht schriftliche Zustimmung.**

**HEDNO-Datensätze stehen NICHT auf data.gov.gr** — die Portalsuche nach „ΔΕΔΔΗΕ" liefert 7 Treffer,
und alle sind Stromzähler-Datensätze von Gemeinden (Keratsini, Egaleo u. a.), keiner von HEDNO
selbst (GEPRÜFT).

**Die offene Frage, die ein Legal-Judge entscheiden müsste:** ΔΕΔΔΗΕ ist eine Aktiengesellschaft,
aber ein reguliertes Netzmonopol, und die Veröffentlichung der Net-Metering-Listen erfolgt in
Erfüllung einer regulatorischen Pflicht. Ob ein solches „öffentliches Unternehmen" im Energiesektor
unter das Weiterverwendungsregime des Ν. 4727/2020 fällt (die Richtlinie (EU) 2019/1024 erfasst
öffentliche Unternehmen in Art. 1 Abs. 1 Buchst. b, allerdings mit schwächeren Pflichten), ist **hier
nicht entschieden** und UNGEPRÜFT. **Dieselbe Struktur wie in Rumänien: Behörde offen, Netzbetreiber
zu, und die Daten liegen beim Netzbetreiber.**

---

# Übersicht — beste Quelle je Land

| | **Ungarn** | **Rumänien** | **Griechenland** |
|---|---|---|---|
| **Beste Quelle** | MEKH-Kreisdatei `HMKE_2024_Q1_Q4.xlsx` | Anexa 8.1 der vier Verteilnetzbetreiber | HEDNO `NET-METERING.xlsx` |
| **Feinste Ebene** | Gemeinde (3.155, ein Stichtag) · **Kreis** (174 + 23 Bp., sechs Jahre) | **Einzelanlage** mit Ort im Adressfeld | **Einzelanlage mit Gemeindespalte** |
| **Zeitachse** | Kreis: 2019–2024 · Gemeinde: **keine** | **je Anlage**, Anschlussdatum ab 2015 | **je Anlage**, Aktivierungsdatum ab 2015 |
| **Kleinanlagen** | **ja, ausschließlich** (HMKE ≤ 50 kVA) | **ja** (89 % natürliche Personen) | **ja** (27.781 Anlagen ≤ 10 kW) |
| **Format** | XLSX | **XLSX** (Rețele Electrice) · sonst PDF | **XLSX** |
| **Aktualität** | Ende 2024 (kein 2025er Stand) | **Juli 2026**, monatlich | **Mai 2026**, etwa halbjährlich |
| **Menge** | 2.690 MW / 296.231 Anlagen | ≥ 206.951 Anlagen selbst gezählt | 36.207 aktiviert / 876 MW |
| **Lizenz** | Quellenangabe reicht für Nutzung, öffentliche Wiedergabe braucht Genehmigung; Antragsweg über Gesetz CI/2023 | Behörde unter Gesetz 179/2022; **Netzbetreiber: Reproduktion nur mit Zustimmung** | **Behörde auf offenem Portal (kommerziell erlaubt, Lizenzmarke fehlt)**; **HEDNO: nur privat, nicht kommerziell** |
| **Personenbezug** | nein (Summen) | **ja, Straße und Hausnummer** | **ja, Klarname und Lage** |

## Ändert sich das bisherige Urteil?

**UNGARN — ja, in zwei Punkten.**
Die Behördenseite ist **kein** blinder Fleck mehr: Sie ist im Browser vollständig lesbar und hat
sogar eine offene Schnittstelle für Wächter. Die Gemeindeebene existiert (3.155 Orte), aber sie ist
**nur einen Stichtag tief und bei Budapest um Faktor 26 zu klein** — die tragfähige Ebene ist der
Kreis mit sechs Jahrgängen. Die Lizenzlage ist **milder** als gedacht: Satz 1 der Rechtserklärung
erlaubt Nutzung gegen Quellenangabe, und seit 04/2024 gibt es mit dem Gesetz CI/2023 einen
gesetzlichen Antragsweg mit Diskriminierungsverbot und Grenzkostengebühr. Kein 2025er Jahrgang.

**RUMÄNIEN — ja, grundlegend.**
Das Urteil „feinste Ebene ist der Kreis, nur als PDF" ist **falsch**. Rumänien hat ein
Einzelanlagen-Register mit Ort, Anschlussdatum und Leistung, monatlich, bei allen vier
Netzbetreibern — und bei Rețele Electrice als **XLSX mit 99.396 Zeilen**. Damit steigt Rumänien von
„taugt nur für Kreisseiten" auf **„taugt für Gemeindeseiten, sobald der Ortsname aus dem Adressfeld
gelöst ist"**. Die beiden neuen Hürden sind nicht technischer Natur: **Personenbezug** (Straße und
Hausnummer) und die **Nutzungsbedingungen privater Netzbetreiber**, die das
Weiterverwendungsgesetz 179/2022 nicht ohne Weiteres erfasst.

**GRIECHENLAND — ja, grundlegend.**
Der Satz „private Dachanlagen fehlen vollständig" galt für das Genehmigungsregister und war dort
richtig. **Sie fehlen nicht im Land, sie liegen beim Netzbetreiber:** 36.207 aktivierte Anlagen mit
Gemeinde, Leistung, Speicher und Aktivierungsdatum, 27.781 davon unter 10 kW, in 288 von 332
Gemeinden, als Tabelle, mit Archiv seit 2022. Dazu eine offene REST-Schnittstelle mit Solarleistung
je **Regionaleinheit** und Monat. Die **Lizenz des Kartendienstes** ist ebenfalls besser als „offen":
Der Datensatz steht auf `data.gov.gr`, dessen Bedingungen kommerzielle Weiterverwendung ausdrücklich
erlauben — nur die Lizenzmarke am Datensatz fehlt. **Die Bremse ist jetzt HEDNO**, dessen
Nutzungsbedingungen ausdrücklich „nur persönlich, nicht kommerziell" sagen.

## Was offen bleibt — und wer es beantworten muss

Kein Rechercheur, sondern ein Legal-Judge:
1. **Ungarn:** Ist eine Gemeindeseite mit eigenen Ableitungen unter Quellenangabe Satz 1 (erlaubt)
   oder Satz 2 (verboten) der MEKH-Rechtserklärung?
2. **Rumänien und Griechenland:** Fallen die Verteilnetzbetreiber als regulierte Netzmonopole unter
   das jeweilige Weiterverwendungsgesetz, oder gelten ihre eigenen Bedingungen?
3. **Beide:** Die Register sind personenbezogen. Die Aggregation auf Gemeindeebene löst den Bezug —
   der Verarbeitungsschritt dorthin ist eigenständig zu bewerten.

Rein tatsächlich offen (nicht wiederholt geprüft, wenn es nicht gebraucht wird):
4. Ob die 7,7 GW des HEDNO-Portals die Net-Metering-Dachanlagen enthalten (Erklärtext nicht zu öffnen).
5. Ob es neben dem „MINI"-Bulletin von DAPEEP eine ausführliche Fassung mit Gebietsbezug gibt
   (Quellseite gesperrt, nur Archivverzeichnis einsehbar).
6. Zeilenzahlen von DEER TN/TS und Delgaz Grid (Dateien geladen bzw. belegt, Inhalt nicht ausgezählt).
