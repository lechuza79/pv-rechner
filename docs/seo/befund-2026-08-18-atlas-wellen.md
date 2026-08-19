# Atlas-Index-Wellen: die Ebene, auf der gesucht wird (18.08.2026)

**Anlass:** Der Wellen-Monitor hat am Morgen des 18.08. Welle 0b (die ~400 Landkreise)
**empfohlen** — alle drei Auflagen aus `lib/atlas-index.ts` waren erfüllt. Auf Nachfrage
des Betreibers („prüfe GSC und DataForSEO für eine sichere Strategie") wurde am selben
Tag nachgemessen, was diese Welle einbringen würde. **Die Empfehlung ist damit
zurückgezogen.** Sie war technisch begründet und wirtschaftlich unbelegt.

**Methode:** Search Console über `/api/seo/gsc` (Seiten- und Anfragen-Ebene, 28 Tage bis
15.08.) und `/api/seo/index-status`; DataForSEO Labs `ranked_keywords`,
`serp/google/organic/live/advanced`, `keywords_data/google_ads/search_volume`.
Kosten des Laufs: **0,15 $**.

---

## 1. Der Befund in einem Satz

Auf der Kreisebene sucht niemand. Gesucht wird nach **Ortsnamen** — und genau dafür
ranken die Kreisseiten eines Wettbewerbers, nicht für das Wort „Landkreis".

## 2. Die Messung, die es entscheidet: der Wettbewerber

`wieistmeinsolar.de` macht dasselbe Produkt wie unser Atlas (Bestandsstatistik je
Region aus Marktstammdatenregister-Zahlen). Damit ist die Frage „trägt diese
Seitengattung überhaupt Rankings?" nicht Meinung, sondern messbar:

| Größe | Wert |
|---|---|
| Platzierte Suchbegriffe | 139 |
| davon in den Top 10 | 8 — **davon 6 echte Ortsanfragen** |
| Summe Suchvolumen aller Platzierungen | 16.200 / Monat |
| Platzierungen mit dem Wort „Landkreis"/„Kreis" im Suchbegriff | **1** von 139 |
| Platzierungen auf Ortsseiten | 123 von 139 (14 Kreisseiten, 2 Startseite) |

**Nachgezählt am 18.08.2026 durch einen adversarialen Prüfer, nachdem die erste
Fassung dieser Tabelle drei Zahlen zu günstig gerundet hatte** — die 8 Top-10-Treffer
enthalten „solarcheck" (deren Startseite, kein Ort) und „solarstraße friedrichshafen"
(ein Straßenname ohne Solar-Absicht); die ausgeschriebene Null bei „Landkreis" war
eine Behauptung, tatsächlich steht dort „solarförderung rhein erft kreis". Die
Richtung der Aussage ändert sich dadurch nicht, ihre Belastbarkeit schon: **6 saubere
Ortstreffer mit zusammen 740 Suchen/Monat.**

Die Gewinner-Seiten sind Gemeindeseiten, die Gewinner-Begriffe sind Ortsnamen:
„pv erdweg" (Position 5), „pv rendsburg" (7), „pv nienburg" (7), „pv winterberg" (9),
„solar weinheim" (10), „solarenergie münster" (12). Volumen je Ort 50–260 — klein, aber
es gibt Tausende davon, und dort liegt die Summe.

**Auch die 14 Kreisseiten in dieser Liste ranken für Ortsnamen** („solar düren",
„pv-anlage würzburg", „solar bad kreuznach") — also dort, wo der Kreis so heißt wie
seine größte Stadt. Die Kreisseite gewinnt dann als Notnagel für die Stadt, nicht als
Kreisseite.

## 3. Die Gegenprobe am Suchvolumen

| Suchbegriff | Volumen/Monat |
|---|---|
| photovoltaik münchen | 320 |
| solaratlas nrw | 110 |
| solaratlas bayern | 90 |
| photovoltaik landkreis würzburg | 10 |
| photovoltaik landkreis hameln-pyrmont | nicht messbar |
| solaranlagen landkreis fulda | nicht messbar |
| solar landkreis bautzen | nicht messbar |

„Nicht messbar" heißt unterhalb der Meldeschwelle, nicht null — über 400 Kreise
summiert sich ein Rest. Aber die Größenordnung ist eindeutig: Die Ortsebene trägt das
Volumen, die Verwaltungsebene darüber nicht.

## 4. Der zufällige Feldversuch, den wir schon hatten

`/solar-atlas/niedersachsen/landkreis-hameln-pyrmont` war während der zwei Stunden am
27.07.2026 indexiert und stand danach noch im Index, bis Google die Seite am 16.08.
neu gelesen hat. In den 28 Tagen bis zum 15.08. brachte sie **58 Einblendungen und
0 Klicks**; davon sind 42 auf fünf einzeln ausgewiesene Anfragen zurückzuführen, die
übrigen 16 verteilen sich auf zu seltene Anfragen, die Google nicht mehr benennt
(Seitenebene 58, Summe der sichtbaren Anfragen 42 — die Differenz ist keine
Ungenauigkeit, sondern die Anonymisierungsschwelle der Search Console):

| Anfrage | Einblendungen | Position |
|---|---|---|
| solaranlage bad-pyrmont | 16 | 43,8 |
| solaranlage hameln | 14 | 63,4 |
| solarkataster hameln | 6 | 8,5 |
| pv hameln | 3 | 42,0 |
| solar hameln | 3 | 34,0 |

**Alle fünf sind Ortsanfragen, keine Kreisanfrage.** Die Kreisseite wurde von Google als
Ersatz für eine Ortsseite ausgeliefert, die es (noch) nicht gibt. Das ist derselbe
Befund wie beim Wettbewerber, nur an unserer eigenen Seite.

Aus einer Seite auf 400 hochzurechnen wäre unseriös (eine Stichprobe, dazu der Nachlauf
einer schon gelöschten Indexierung). Die Richtung deckt sich aber mit der
Wettbewerbsmessung, und die beruht auf 139 Platzierungen.

## 5. Die Ergebnisseiten: hier kommen Klicks an

Anders als bei den statischen Erklärfragen (Atomstrom, Förderung — siehe
`befund-2026-08-13.md`) steht bei den regionalen Anfragen **keine KI-Antwort**:

| Suchbegriff | Aufbau | KI-Antwort |
|---|---|---|
| solarkataster hameln | Ergebnisliste > Ähnliche Suchanfragen | nein |
| photovoltaik landkreis hameln-pyrmont | Ergebnisliste > lokale Anbieter > Ähnliche Fragen | nein |
| solaratlas bayern | Ergebnisliste > Ähnliche Suchanfragen | nein |

Das ist die gute Nachricht der Kategorie: Wer hier auf Seite 1 steht, bekommt auch
Besucher. Es ist derselbe Mechanismus wie bei „strommix deutschland live" — eine Frage
nach einem konkreten Ort ist nicht vorab beantwortbar.

**Die Wettbewerbslage bleibt trotzdem hart:** Auf „solarkataster hameln" stehen
hameln.de, hameln-pyrmont.de und die Klimaschutzagentur auf 1–3, auf „solaratlas bayern"
der Energie-Atlas Bayern und das Geoportal. Das sind amtliche Dachflächen-Werkzeuge —
die Intent-Falle vom 13.08. **Und der Eigenname ist kein Ausweg aus ihr, sondern
dieselbe Falle unter anderem Namen:** Auch auf „solaratlas bayern" stehen auf Platz 1–10
ausnahmslos Dachflächen-Kataster. Was bleibt, ist der Ortsname plus einem beschreibenden
Wort — und das gefragteste ist „Photovoltaik" (Abschnitt 6).

## 6. Unser eigener Stand (Search Console, 18.07.–15.08.)

Alle Atlas-Seiten mit Einblendungen zusammen — **18**, nicht 17: Die achtzehnte ist die
Kreisseite Hameln-Pyrmont aus Abschnitt 4, die eigentlich noindex ist. Zusammen **926
Einblendungen, 9 Klicks (1,0 %)** — dasselbe Artefakt-Muster wie am 13.08. beschrieben.

**Welches Wort die Nachfrage trägt, ist damit gemessen und nicht geraten:**
„photovoltaik" steht in **36 Anfragen mit 140 Einblendungen**, der Eigenname
„solaratlas" in **6 mit 71** — und davon entfallen 48 auf eine einzige Seite (Bayern),
während NRW auf 2 und RLP auf 5 kommt. Platzierte Suchbegriffe der
Domain insgesamt: 45 (03.08.: 34, 13.08.: 43), davon 0 in den Top 10.

## 7. Was daraus folgt

1. **Welle 0b (Landkreise) wird nicht freigeschaltet.** Nicht wegen des Risikos — das
   ist inzwischen beherrscht (Kaltrender 0,5–1,8 s, 6,2 s Luft, Kreisseiten seit heute
   im Gesundheitscheck) —, sondern weil die Ebene kein Suchvolumen hat. 400 Seiten für
   ein Wort, das niemand tippt, und dazu der Crawl-Weg auf 11.000 noindex-Gemeinden.
2. **Der nächste Schritt ist die Ortsebene**, also Welle 1 — und die hängt unverändert
   an ihren zwei Voraussetzungen: der Award-Rangliste (liefert Rang und Nachbarvergleich)
   und den zwei echten Fakten je Seite (größte Anlage, benannter Nachbar). Die
   Wettbewerbsmessung sagt jetzt, wofür sich der Aufwand lohnt: **Ortsname + „pv" /
   „solar" / „photovoltaik"** gehört in Titel, Überschrift und Einstieg.
3. **Sofort und billig: „Photovoltaik" in die Titel der Regionsseiten.** Das Wort stand
   dort nirgends — weder im Titel noch in einem sichtbaren Satz —, obwohl es der
   nachweislich gefragte Begriff ist: Auf unserer stärksten Atlas-Seite
   (Rheinland-Pfalz) sind die drei größten Anfragen „photovoltaik pfalz" (18
   Einblendungen), „photovoltaik rheinland-pfalz" (11) und „photovoltaik rheinland
   pfalz" (7). Über alle Atlas-Seiten: **„photovoltaik" in 36 Anfragen mit 140
   Einblendungen, „solaratlas" in 6 mit 71.**

   **Zwei verworfene Anläufe stehen davor, beide am selben Tag, beide vom Betreiber
   gestoppt — und beide sind lehrreicher als das Ergebnis:**

   - **Anlauf 1: „Solaratlas Bayern" als Überschrift.** Gemessen war nur, wie gut wir
     für den Eigennamen stehen — nicht, was der Begriff wiegt, den er ersetzen sollte.
     **Regel: Wer einen Begriff durch einen anderen ersetzt, misst BEIDE.**
   - **Anlauf 2: „Solaratlas Bayern" als Titel.** Klang harmlos („kostet ja nichts"),
     war aber dieselbe Intent-Falle, die dieses Projekt am 13.08.2026 schon einmal
     dokumentiert hat: Auf Platz 1–10 zu „solaratlas bayern" steht **ausnahmslos ein
     Dachflächen-Potenzialkataster** (Energie-Atlas Bayern, Geoportal, Solaratlas des
     Landkreises Berchtesgadener Land). „Darf ich auf mein Dach?" ist eine andere Frage
     als „was steht hier schon?". Dazu war die Nachfrage Rauschen: 48 Einblendungen bei
     Bayern, aber **2** bei NRW und **5** bei RLP — aus einer Seite wurde eine Regel für
     siebzehn.
   - **Und eine falsche Zahl, die beim Korrigieren der ersten falschen Zahl entstand:**
     „solaratlas rlp (720/Monat)" — die 720 gehören zu „solarkataster rlp", einem
     anderen Begriff aus derselben Tabelle. Für „solaratlas rlp" wurde nie ein Volumen
     gemessen. **Beim Berichtigen einer Zahl entsteht besonders leicht die nächste.**
4. **Kreisseiten bleiben trotzdem gebaut und erreichbar** (intern verlinkt, on-demand,
   im Gesundheitscheck). Sie sind der Umschlagplatz zur Ortsebene — nur eben kein
   eigenes Suchziel. Wenn die Ortswelle steht, kann die Kreisebene beiläufig mitlaufen.

## Anhang — Rohdaten des Laufs

Search Console, Atlas-Seiten 18.07.–15.08. (Einblendungen / Klicks / Position):
Rheinland-Pfalz 105/0/44,9 · Bayern 101/0/17,2 · Saarland 97/0/66,0 · Hessen 69/1/33,0 ·
Mecklenburg-Vorpommern 66/2/50,3 · Sachsen-Anhalt 66/0/45,9 · Baden-Württemberg 59/1/47,1 ·
**Landkreis Hameln-Pyrmont 58/0/37,5** · Nordrhein-Westfalen 54/0/34,3 · Niedersachsen 43/3/23,2 ·
Berlin 40/0/25,0 · Schleswig-Holstein 29/0/56,5 · Sachsen 28/1/9,4 · Brandenburg 26/1/21,3 ·
Hamburg 23/0/23,1 · Thüringen 23/0/57,8 · Bremen 22/0/31,6 · Atlas-Start 17/0/19,1.

Atlas-Platzierungen laut DataForSEO (Position / Volumen): solarkataster berlin 26/50 ·
energieatlas nrw 30/720 · sonne nrw schermbeck 39/50 · solarenergie baden-württemberg 41/50 ·
solarpotenzialkataster nrw 53/50 · solarkataster rlp 55/720 · solarkataster nrw 71/1900.
