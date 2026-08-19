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
- **„Die Steuerungseinheit existiert schon."** Dieses Argument dreht sich um.
  Flach gibt es **eine** Steuerungseinheit für den ganzen Bereich. Steuerbar ist
  damit „ganz Balkonkraftwerk", nie „nur die Ratgeber" oder „nur die
  Produktseiten". Mit vierzig Produktseiten ist „Ratgeber freischalten,
  Produktseiten halten" schlicht unmöglich — und in der Search Console ist
  „wie laufen Ratgeber gegen Tools" ohne gemeinsames Pfadstück nicht zu fragen.
  **Das ist die Nicht-Skalierbarkeit, die der Betreiber gemeint hat.**

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

**Regel: Verschachtelt wird, was wächst; flach bleibt, was einzeln bleibt.**
Das ist die Cluster-Regel aus CLAUDE.md, eine Ebene tiefer angewandt — eigene
Ebene ab der dritten Seite einer Art, und zwar bevor die zweite live geht. Ein
Ordner für eine einzige Datei ist Zeremonie (ebenfalls CLAUDE.md).

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

## 5. Offen — gehört dem Betreiber

1. **Segment-Name für die Artikel:** `ratgeber` (gleiches Wort wie in der
   globalen Übersicht, damit erkennbar) oder `wissen` (kürzer). Empfehlung:
   `ratgeber`, weil das Wort auf der Seite schon eine Bedeutung hat.
2. **Gilt das Modell auch für Wärmepumpe und Photovoltaik?** Empfehlung: als
   Navigations- und Kategoriemodell ja (das kostet nichts), als Adressmodell
   nein — dort wäre es ein echter Umzug gewachsener Seiten.
3. **Suche über den Bereich oder über die ganze Seite?** Bestimmt den Aufwand,
   siehe `docs/themen-cluster-struktur.md`, Abschnitt 3d.
