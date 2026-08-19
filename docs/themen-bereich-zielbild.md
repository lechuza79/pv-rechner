# Zielbild: Themen-Bereich als Adress- und Navigationsmodell

**Auftrag des Betreibers, 19.08.2026:** Erst das vollständige Zielbild festlegen,
dann einmal umziehen — statt in Schüben. Anlass war sein Einwand gegen die flache
Adressstruktur („nicht wirklich skalierbar"). **Der Einwand war berechtigt**; die
Gegenargumente und wo die frühere Empfehlung kaputt war, stehen in Abschnitt 1.

**Zeitdruck, seit 19.08.2026 bekannt:** Der aktuelle Stand ist bei der Google
Search Console eingereicht. Vier Adressen des Balkon-Bereichs sind damit zur
Indexierung angemeldet (`/balkonkraftwerk`, `/rechner`, `/foerderung` und über
die Ratgeber-Registry `/anmelden`). Das macht den Umzug nicht teuer — eine
dauerhafte Weiterleitung auf einer gerade erst entdeckten Adresse ist der
billigste Moment überhaupt, weil es noch nichts zu konsolidieren gibt. Es heißt
aber: **Die Uhr läuft, und jede weitere Seite vor der Entscheidung vergrößert den
Umzug.**

---

## 1. Warum flach nicht trägt (Korrektur der Empfehlung vom selben Tag)

Die frühere Empfehlung „Kategorien als Ansicht, Adressen flach" stützte sich auf
vier Argumente. Drei halten nicht:

- **„Verzeichnistiefe ist kein Rankingfaktor."** Stimmt, beantwortet aber die
  falsche Frage. Das Argument zeigt, dass Verschachteln beim Ranking nicht
  *hilft* — nie, dass flach *besser* ist.
- **„`/ratgeber` ist auch nur eine Ansicht."** Schlechter Vergleich. Das ist eine
  **globale** Liste über die ganze Seite mit sieben Einträgen, jeder mit eigenem
  Keyword-Slug. Eine wachsende Kategorie **innerhalb** eines Bereichs ist etwas
  anderes. Die Cluster-Regel in CLAUDE.md sagt sogar das Gegenteil: ab der
  dritten Seite zu einem Thema wird verschachtelt, bevor die zweite live geht.
- **„Die Steuerungseinheit existiert schon."** Dieses Argument drehte sich zuerst
  um (flach gibt es nur EINE Einheit für den ganzen Bereich) — und ist dann von
  zwei unabhängigen SEO-Prüfern am 19.08.2026 **ganz gekippt** worden. Beide
  Hälften halten nicht:
  - **Steuerung:** Das Projekt schaltet längst PRO SEITE frei, ohne Pfadbezug —
    `atlasRobots(cityIndexFreigegeben(city))` auf den Förder-Stadtseiten,
    `lib/release-plan.ts` nach Ortsschlüssel × Gattung, dazu eine inhaltliche
    Thin-Schwelle je Seite. Über hundert Seiten unter EINEM Präfix, einzeln
    gesteuert. Ein Kategorie-Feld an `lib/ratgeber.ts` hätte dasselbe geliefert.
  - **Auswertung:** Die Search Console kann seit Juni 2021 einen Regex-Filter auf
    der Seiten-Dimension; `(/a|/b|/c)` ist genau ein Filter. Ein gemeinsames
    Präfix braucht sie nicht. Ebenso kennt `robots.txt` Platzhalter.

**Was als Begründung übrig bleibt — schwächer, aber tragfähig:** eine Krümelspur,
die nicht mehr lügt (vorher behauptete sie eine Hierarchie, die die Adresse nicht
hatte — CLAUDE.md nennt genau das die schwächste Form), eine Adresse, unter der
eine Kategorie-Übersicht wohnen kann, und für Menschen lesbare Pfade. Googles
eigene URL-Empfehlung sagt genau das und nichts weiter.

**Daraus folgt eine Grenze:** Weil die Begründung schwach ist, rechtfertigt sie
einen Umzug nur dort, wo er fast nichts kostet — vor oder unmittelbar nach dem
Livegang, **nie auf gewachsenem Bestand**.

Das vierte Argument (Umzugskosten) galt gewachsenen Seiten. Der Balkon-Bereich
ist vom 18.08.2026 und rankt praktisch nicht (gemessen 18.08.: zwei Balkon-Wörter
auf Position 102/103, beide über eine Förderseite).

**Was von der alten Empfehlung bleibt:** Die *Navigation* darf nicht aus dem Pfad
abgeleitet werden — siehe Abschnitt 3. Das war der richtige Kern am falschen Ort.

---

## 2. Das Adressmodell

```
/<thema>                          Bereichs-Startseite
/<thema>/rechner                  Werkzeug            — flach, solange ≤ 2
/<thema>/foerderung               Förder-Überblick    — flach, siehe 2c
/<thema>/ratgeber/<slug>          Artikel             — eigene Ebene
/<thema>/produkte/<slug>          Produktseiten       — eigene Ebene, später
```

**Regel: nach GATTUNG, nicht nach Anzahl.** Eine **Reihe** (Ratgeber, Produkte —
davon kommen sicher mehr) bekommt ihre Ebene ab der ersten Seite. Was **singulär**
bleibt (Bereichs-Startseite, Rechner, Förder-Überblick), bleibt für immer flach.

Die erste Fassung stand hier als Zählschwelle („flach, solange ≤ 2"). Der zweite
Prüfer hat sie zerlegt, und der Einwand sitzt: Eine Zählschwelle löst den Umzug
genau dann aus, wenn ein Bereich erfolgreich wird — im teuersten Moment. Und sie
wird ohnehin nicht befolgt: Dieselbe Regel steht seit dem 18.08.2026 in CLAUDE.md,
und Photovoltaik hat sechs Seiten und ist flach. Eine Regel, die das eigene Repo
schon verletzt, verletzt es in zwei Jahren wieder. Gattungsbasiert ist die Antwort
**ablesbar** statt abzuwägen — und genau so steuert `lib/release-plan.ts` bereits,
über ein Gattungsfeld statt über Pfade.

### 2a. Ratgeber bekommen eine Ebene
Zwei Artikel existieren (Anmelden, Speicher), und die Gattung ist als
fortlaufender Strom angelegt — die dritte kommt sicher.

**Der ehrliche Preis:** Das Segment `ratgeber` ist ein Wort, das niemand sucht.
`/balkonkraftwerk/speicher` trifft die Anfrage „balkonkraftwerk mit speicher"
wörtlicher als `/balkonkraftwerk/ratgeber/mit-speicher`. Das URL-Wort ist ein
schwaches Signal (Titel und Inhalt tragen die Last), aber es ist nicht null.
**Wir zahlen ein schwaches, einmaliges Signal für einen dauerhaften
Betriebshebel.** Das ist der Handel, und er ist bewusst so herum entschieden.

### 2b. Werkzeuge bleiben flach, solange es höchstens zwei sind
Im Balkon-Bereich gibt es genau eines. Eine `tools/`-Ebene dafür wäre Zeremonie,
und der Rechner ist die Seite mit dem meisten Direktverkehr.

**Bewusst in Kauf genommen: Bereiche werden sich unterscheiden.** Photovoltaik
hat fünf Werkzeuge, könnte also eine Ebene gebrauchen — kann aber nicht umziehen
(gewachsene Rankings, CLAUDE.md: „Der Bestand mit gewachsenem Ranking zieht
nicht um"). Vollständige Gleichförmigkeit über alle Bereiche ist damit ohnehin
unerreichbar. Genau deshalb hängt die Navigation nicht am Pfad (Abschnitt 3).

### 2c. Ortsbezogene Förderseiten gehören NICHT in den Bereich — BLOCKER
Der Bereich behält den **bundesweiten Überblick** („welche Kommunen zahlen einen
Zuschuss") und verlinkt ins Förder-Verzeichnis. Was er **nie** bekommt, sind
Seiten je Ort (`/balkonkraftwerk/foerderung/muenchen`).

Grund: Die gibt es schon, unter `/photovoltaik-foerderung/<land>/<stadt>`, und
zwei eigene Seitenfamilien auf derselben Anfrage kosten beide Positionen — die
Regel steht in CLAUDE.md und hat am 18.08.2026 schon einmal eine Freischaltung
gestoppt. Die Technik-Dimension im Förderkatalog (`foerdert: ["balkon"]`) macht
diese Trennung möglich, ohne Inhalt zu verlieren.

### 2d. Produktseiten bekommen eine Ebene, bevor die erste live geht
Sie sind viele, gleichartig und tragen Affiliate-Kennzeichnung — genau die Art,
die man gestaffelt freischalten und getrennt auswerten will. Konzept und Stand:
`docs/balkon-vergleichsseite-konzept.md`.

---

## 3. Das Navigationsmodell hängt NICHT am Pfad

Der Kern, damit das Ganze skaliert: **Die Kategorie steht als Feld an der Seite,
nicht in ihrer Adresse.** Ein Registry-Modul in der Art von `lib/ratgeber.ts`
führt je Eintrag Bereich, Kategorie, Titel, Teaser und Pfad.

Warum das die eigentliche Voraussetzung ist:
- **Gewachsene Bereiche können nicht umziehen.** Photovoltaik und Wärmepumpe
  bleiben verstreut. Nur wenn die Kategorie am Eintrag hängt, funktionieren
  Bereichs-Startseite, Bereichsnavigation und Suche dort **genauso** wie im
  verschachtelten Balkon-Bereich.
- **Drei handgepflegte Listen fallen weg.** Heute muss eine neue Seite in
  Menügruppe, Markierungs-Kette und Fußzeile eingetragen werden; beim
  Speicher-Ratgeber wurden zwei davon vergessen, ohne dass es im Browser auffällt
  (Netz seit 19.08.2026: `lib/__tests__/nav-aktiv.test.ts` liest den Dateibaum).
- **Der Suchindex entsteht daraus mit**, statt eine vierte Liste zu werden.

Damit ist der Pfad nur noch für **Steuerung und Auswertung** zuständig
(Freischaltung, robots, Search-Console-Segmente) — und genau dafür ist er das
richtige Werkzeug. Die Darstellung hängt an der Registry.

---

## 4. Was der Umzug konkret kostet

| Seite | heute | Ziel |
|---|---|---|
| Startseite | `/balkonkraftwerk` | unverändert |
| Rechner | `/balkonkraftwerk/rechner` | unverändert |
| Förder-Überblick | `/balkonkraftwerk/foerderung` | unverändert |
| Anmelde-Ratgeber | `/balkonkraftwerk/anmelden` | `/balkonkraftwerk/ratgeber/anmelden` |
| Speicher-Ratgeber | noch nicht live | `/balkonkraftwerk/ratgeber/mit-speicher` |

**Eine** dauerhafte Weiterleitung (Anmelde-Ratgeber). Der Speicher-Ratgeber ist
noch nicht zusammengeführt und zieht ohne Weiterleitung um. Dazu: Registry-Pfade,
Fußzeile, Menügruppe samt Markierungs-Schlüssel, Krümelspur, Stand-Eintrag,
Sitemap-Zeile, Rundgang-Adresse und die Verweise aus Startseite und
Ratgeber-Blöcken. Aufwand rund eine Stunde, Risiko gering.

**Zum Vergleich in drei Monaten:** je Artikel eine Weiterleitung, plus die
Konsolidierung eingehender Links und angelaufener Platzierungen.

---

## 4b. Drei Gattungen fehlen noch — und genau die erzwingen sonst den zweiten Umzug

Vom zweiten Prüfer am 19.08.2026 gefunden. Sie müssen entschieden sein, **bevor**
die erste Seite der jeweiligen Gattung entsteht — sonst zahlt man den Umzug
ausgerechnet dort, wo am meisten Seiten liegen.

1. **Daten- und Nachschlage-Seiten.** `/einspeiseverguetung-tabelle`,
   `/photovoltaik-zubau-deutschland`, `/photovoltaik-neigungswinkel` sind keine
   der vier Kategorien — es sind Tabellen und Zeitreihen. Zwei laufen heute
   notdürftig als Ratgeber-Registry-Einträge, was sie nicht sind. Das ist nicht
   kosmetisch: Nach eigener Messung ist „veränderlich" die einzige Kategorie mit
   freier Bahn gegen KI-Antworten. Vorschlag: eigene Gattung, global statt je
   Thema — aber entschieden, nicht vergessen.
2. **Handeln ist keine Ratgeber-Gattung.** „Anmelden" ist mit 27.100 Suchen im
   Monat die stärkste Einzelseite des Bereichs und eine Anleitung, kein Artikel.
   Der zweite Prüfer empfiehlt, solche Seiten flach unter dem Bereich zu lassen.
   **Offen** — Abwägung siehe Abschnitt 5.
3. **`produkte` ist kein Segment, sondern ein Unterbereich.** Marken- und
   Herstellerseiten sind eine eigene Suchkategorie. Ob `/produkte/<marke>/…` oder
   ein eigenes `/marken/`, muss **vor** der ersten Produktseite feststehen.

Ausdrücklich **nicht** aufgenommen, mit Begründung: Vergleiche (X gegen Y) und
Fallbeispiele sind Ratgeber. Thematische Glossarseiten sind Thin Content und
stehen frontal gegen die KI-Antwort — bleiben global. FAQ ist im Projekt ein
Block, keine Seite; das gehört als Ausschluss hier hin, sonst baut es jemand.
Regionale Seiten bleiben im Förder-Verzeichnis (Abschnitt 2c) — diese Trennung
gilt aber nur, solange die Förder-Stadtseite die Technik-Dimension mitträgt.

## 5. Offen — gehört dem Betreiber

1. **Segment-Name für die Artikel:** `ratgeber` (gleiches Wort wie in der
   globalen Übersicht, damit erkennbar) oder `wissen` (kürzer). Empfehlung:
   `ratgeber`, weil das Wort auf der Seite schon eine Bedeutung hat.
2. **Gilt das Modell auch für Wärmepumpe und Photovoltaik?** Empfehlung: als
   Navigations- und Kategoriemodell ja (das kostet nichts), als Adressmodell
   nein — dort wäre es ein echter Umzug gewachsener Seiten.
3. **`anmelden` unter `ratgeber` oder flach?** Der zweite Prüfer ist dagegen:
   stärkste Einzelseite des Bereichs (27.100/Monat), eine Anleitung statt eines
   Artikels, und die Adresse tauscht ein gesuchtes Wort gegen ein ungesuchtes.
   Dafür spricht: Sie steht in der Ratgeber-Registry, liest sich als Anleitung
   mit Schritten und FAQ, und eine eigene Gattung „Handeln" wäre eine Taxonomie,
   die künftige Sitzungen nicht zuverlässig anwenden können. Dazu rankt die Seite
   heute nichts (Position 102/103 domainweit), das URL-Wort ist also ein schwaches
   Signal ohne Bestand. **Aktuell verschachtelt; Rücknahme kostet heute eine
   Zeile, solange der Umzug nicht auf der Hauptlinie ist.**
4. **Suche über den Bereich oder über die ganze Seite?** Der zweite Prüfer hat
   zwei Vorgaben nachgeliefert: Titel und Teaser allein reichen NICHT (gesucht
   wird „800 Watt", „Nullsteuersatz" — Wörter, die dort nicht stehen; der Index
   braucht auch H2/H3 und die FAQ-Fragen), und Ortssuche gehört NICHT in denselben
   Index (unscharfes Rangieren gegen Präfix-Treffer sind zwei Mechaniken; 11.000
   Gemeinden ins Browser-Bundle zu legen wäre der Fehler). Außerdem: `SearchAction`
   im strukturierten Datensatz ist gegenstandslos — Google hat die Sitelinks-
   Suchbox am 21.11.2024 abgeschaltet.
5. **Reihenfolge.** Beide Prüfer ordnen den Struktur-Umbau als Vorsorge ein, nicht
   als Wachstumsschritt. Der gemessen größte Hebel liegt woanders (Förderseiten
   vom Text zum Werkzeug). Der Umbau sollte ihn nicht vordrängen.
