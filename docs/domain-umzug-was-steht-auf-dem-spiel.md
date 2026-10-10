# Domainwechsel: was heute auf dem Spiel steht

**Bestandsaufnahme vom 27.09.2026.** Keine Namensvorschläge, keine Domainrecherche —
nur die Frage, was ein Umzug kosten würde.

Alle Zahlen in diesem Papier sind an diesem Tag selbst gemessen, nicht aus CLAUDE.md
oder älteren Berichten übernommen. Wo eine Zahl aus einer fremden Quelle stammt, steht
die Quelle daneben. Wo nichts Belastbares zu finden war, steht das ausdrücklich da.

**Zwei Sätze vorweg, damit die Zahlen richtig gelesen werden.** Der Bestand, den ein
Umzug gefährdet, ist objektiv klein — 462 indexierte Adressen, 14 verweisende Domains,
121 Klicks in 28 Tagen. Gleichzeitig wächst die Sichtbarkeit gerade so steil wie nie
(Woche 952 → 3.642 Einblendungen in zehn Wochen). Beides zusammen ist der eigentliche
Befund: **Nicht der Bestand ist teuer, sondern der Zeitpunkt.**

---

## 1. Was die Domain heute an Sichtbarkeit trägt

### 1.1 Klicks und Einblendungen

Quelle: Google Search Console über `/api/seo/gsc`, abgerufen 27.09.2026. Die Search
Console hinkt zwei bis drei Tage nach, deshalb endet jeder Zeitraum am **24.09.2026**.

| Zeitraum | Einblendungen | Klicks | Seiten mit Einblendungen |
|---|---|---|---|
| 28 Tage (27.08.–24.09.2026) | **12.836** | **121** | 262 |
| 90 Tage (26.06.–24.09.2026) | **21.794** | **188** | 266 |

**GEPRÜFT.** 59 % der Einblendungen des Vierteljahres fallen in das letzte Drittel.
Eine Summe verbirgt genau das — deshalb der Verlauf.

### 1.2 Der Verlauf — der wichtigste Befund dieses Papiers

Einblendungen je Kalendermonat (aus der Tagesreihe, `/api/seo/index-status?days=180`):

| Monat | Einblendungen | Klicks | Tage mit Daten | Einbl./Tag |
|---|---|---|---|---|
| 03/2026 | 1 | 0 | 1 | 1,0 |
| 04/2026 | 29 | 0 | 15 | 1,9 |
| 05/2026 | 33 | 0 | 18 | 1,8 |
| 06/2026 | 121 | 2 | 24 | 5,0 |
| 07/2026 | 4.448 | 41 | 31 | 143,5 |
| 08/2026 | 6.263 | 38 | 31 | 202,0 |
| 09/2026 | 11.056 | 109 | 24 | **460,7** |

Und feiner, in Sieben-Tage-Blöcken:

| Woche | Einblendungen | Klicks |
|---|---|---|
| 17.–23.07. | 952 | 9 |
| 24.–30.07. | 1.058 | 12 |
| 31.07.–06.08. | 980 | 7 |
| 07.–13.08. | 1.123 | 10 |
| 14.–20.08. | 1.140 | 6 |
| 21.–27.08. | 1.661 | 8 |
| 28.08.–03.09. | 2.617 | 21 |
| 04.–10.09. | 2.949 | 27 |
| 11.–17.09. | 3.325 | 28 |
| 18.–24.09. | **3.642** | **42** |

**GEPRÜFT.** Zehn Wochen ununterbrochenes Wachstum, Faktor 3,8 bei den Einblendungen
und 4,7 bei den Klicks. Die letzte gemessene Woche ist die beste Woche der
Projektgeschichte. Es gibt in der Reihe keinen Knick, der auf ein Plateau hindeutet.

**Was das für die Umzugsfrage heißt, und das ist keine Meinung, sondern eine Folge aus
der Kurve:** Der Schaden eines Umzugs ist nicht nur das, was von 121 Klicks wegbricht,
sondern auch das Wachstum, das währenddessen nicht stattfindet. Bei einer flachen Kurve
wäre der zweite Posten null. Hier ist er der größere von beiden.

### 1.3 Indexierung — getrennt gemessen, nicht aus Einblendungen abgeleitet

Einblendungen sind **kein** Indexierungsstatus. Deshalb eigens über die
URL-Inspection-API gefragt (`/api/seo/index-status`, 27.09.2026):

**Sitemap:**

| Angabe | Wert |
|---|---|
| URLs in unserer Sitemap (live abgerufen, gezählt) | **462** |
| davon von Google gezählt (`submittedUrls`) | 456 |
| zuletzt von Google geholt | 26.09.2026 (vor 0 Tagen) |
| Fehler / Warnungen | 0 / 0 |

Die Differenz 462 ↔ 456 ist ein Schnappschuss-Unterschied, kein Fehler.

**Stichprobe von zehn Adressen, einzeln inspiziert:**

| Urteil | Zustand | zuletzt gecrawlt | Adresse |
|---|---|---|---|
| PASS | Gesendet und indexiert | 23.09.2026 | `/` |
| PASS | Gesendet und indexiert | 24.09.2026 | `/photovoltaik-foerderung` |
| PASS | Gesendet und indexiert | 26.09.2026 | `/atomstrom-import` |
| PASS | Gesendet und indexiert | 31.08.2026 | `/balkonkraftwerk/foerderung` |
| PASS | Gesendet und indexiert | 14.09.2026 | `/einspeiseverguetung-tabelle` |
| PASS | Gesendet und indexiert | 19.08.2026 | `/strommix-deutschland` |
| PASS | Gesendet und indexiert | 26.09.2026 | `/solar-atlas/brandenburg` |
| PASS | Gesendet und indexiert | 13.09.2026 | `/photovoltaik-rechner` |
| PASS | Gesendet und indexiert | 17.08.2026 | `/photovoltaik-foerderung/…/osnabrueck` |
| NEUTRAL | URL ist Google nicht bekannt | nie | `/solar-atlas/hessen/wetteraukreis/nidda` |

**GEPRÜFT.** Neun von zehn indexiert. Die zehnte ist eine nicht freigegebene
Gemeindeseite — sie steht absichtlich nicht in der Sitemap und trägt „nicht
indexieren“. Das ist kein Mangel, sondern der gewollte Zustand.

**Aufteilung der 462 Sitemap-Adressen** (live aus der Sitemap gezählt):
306 Atlas-Ortsseiten · 124 Förderseiten · 5 Balkonkraftwerk · 5 Ratgeber ·
22 Einzelseiten (Rechner, Startseite, Strommix, Methodik, Lizenz …).

### 1.4 Die stärksten Seiten und wie konzentriert der Verkehr ist

28 Tage, nach Einblendungen:

| # | Einbl. | Klicks | Ø-Pos. | Seite |
|---|---|---|---|---|
| 1 | 2.272 | 3 | 27,2 | `/photovoltaik-foerderung` |
| 2 | 728 | 3 | 7,3 | `/atomstrom-import` |
| 3 | 626 | 6 | 10,2 | `/balkonkraftwerk/foerderung` |
| 4 | 553 | 7 | 8,3 | `/einspeiseverguetung-tabelle` |
| 5 | 407 | 27 | 16,0 | `/` (Startseite) |
| 6 | 303 | 5 | 19,4 | `/strommix-deutschland` |
| 7 | 303 | 2 | 26,2 | `/solar-atlas/brandenburg` |
| 8 | 242 | 2 | 7,4 | `/photovoltaik-foerderung/niedersachsen/osnabrueck` |
| 9 | 223 | 2 | 45,9 | `/solar-atlas/schleswig-holstein` |
| 10 | 204 | 6 | 21,9 | `/pv-simulation` |
| 11 | 193 | 4 | 7,3 | `/photovoltaik-foerderung/baden-wuerttemberg/heidelberg` |
| 12 | 174 | 1 | 30,9 | `/solar-atlas/thueringen` |
| 13 | 174 | 0 | 54,0 | `/methodik` |
| 14 | 154 | 0 | 45,4 | `/solar-atlas/mecklenburg-vorpommern` |
| 15 | 135 | 0 | 19,5 | `/solar-atlas/bayern` |
| 16 | 128 | 1 | 66,1 | `/balkonkraftwerk/rechner` |
| 17 | 126 | 3 | 33,6 | `/solar-atlas/sachsen-anhalt` |
| 18 | 121 | 1 | 14,8 | `/photovoltaik-foerderung/nordrhein-westfalen/aachen` |
| 19 | 116 | 2 | 8,2 | `/photovoltaik-foerderung/niedersachsen/hannover` |
| 20 | 115 | 2 | 7,7 | `/photovoltaik-foerderung/nordrhein-westfalen/essen` |

**Konzentration (GEPRÜFT):**

| | Einblendungen | Anteil | Klicks | Anteil |
|---|---|---|---|---|
| Top 5 | 4.586 | 35,7 % | 46 | 38,0 % |
| Top 10 | 5.861 | 45,7 % | 63 | 52,1 % |
| **Top 20** | **7.297** | **56,8 %** | **77** | **63,6 %** |
| Top 50 | 9.811 | 76,4 % | 99 | 81,8 % |
| Top 100 | 11.599 | 90,4 % | 110 | 90,9 % |

Zwanzig Adressen tragen knapp zwei Drittel der Klicks. Das ist die gute Nachricht für
einen Umzug: Wenn zwanzig Adressen sauber umziehen, ist der größte Teil gesichert.
Es ist zugleich die schlechte: Geht bei diesen zwanzig etwas schief, ist fast alles weg.

### 1.5 Rankings

**Zwei unabhängige Messungen, weil beide eine eigene Schwäche haben.**

**a) Fremdindex (DataForSEO Labs, `ranked_keywords`, live abgerufen 27.09.2026, 0,025 $):**

| Angabe | Wert |
|---|---|
| Keywords mit Platzierung gesamt | **110** |
| davon Seite 1 (Rang 1–10) | **5** |
| Rang 11–20 | 5 |

Die fünf Seite-1-Begriffe:

| Rang | Volumen | Begriff | Seite |
|---|---|---|---|
| 7 | 70 | kauft deutschland atomstrom aus dem ausland | `/atomstrom-import` |
| 8 | 90 | wie viel atomstrom importiert deutschland | `/atomstrom-import` |
| 8 | 140 | wieviel atomstrom importiert deutschland | `/atomstrom-import` |
| 8 | 70 | wieviel atomstrom importiert deutschland 2025 | `/atomstrom-import` |
| 9 | 70 | solarpark idstein | `/photovoltaik-foerderung/hessen/idstein` |

Zum Vergleich der **letzte abgelegte Schnappschuss, `docs/seo/rankings-2026-09.md`,
Abrufdatum 02.09.2026**: dort 58 Keywords, Top 10: **0**. Die Zahl hat sich in
25 Tagen fast verdoppelt, und es gibt erstmals Seite-1-Platzierungen.

**Vorbehalt, den der Schnappschuss selbst aufgeschrieben hat und der weiter gilt:** Die
gespeicherten Positionen dieses Anbieters stammen aus Crawls verschiedener Zeitpunkte
und sind teilweise Wochen alt. Eine Position von dort ist eine Kandidatenangabe, kein
Live-Befund.

**b) Eigene Messung (Search Console, 28 Tage — nicht veraltbar, weil es unsere eigenen
Auslieferungen sind):**

| Angabe | 28 Tage | 90 Tage |
|---|---|---|
| Sichtbare Suchanfragen | 912 | 1.475 |
| davon Ø-Position ≤ 10 | **157** | 273 |
| davon Ø-Position ≤ 3 | 53 | 101 |
| Seite-1-Anfragen mit wenigstens einem Klick | 9 | 10 |

Die beiden Zahlen (5 gegen 157) widersprechen sich nicht: Der Fremdindex prüft ein
Begriffsinventar mit gemeldetem Suchvolumen, die Search Console zählt alles, wonach
wirklich gesucht wurde — einschließlich hunderter sehr seltener Ortsanfragen, bei denen
wir vorne stehen, weil kaum jemand sonst antwortet.

### 1.6 Markenanfragen — der Posten, den ein NAMENSwechsel direkt trifft

28 Tage, alle Anfragen mit „solar check“, „solarcheck“ oder „pv check“ in irgendeiner
Schreibweise:

| | Begriffe | Einblendungen | Anteil | Klicks | Anteil |
|---|---|---|---|---|---|
| **Markenanfragen** | 9 | 154 | **3,4 %** | **10** | **48 %** |
| ohne Marke | 903 | 4.359 | 96,6 % | 11 | 52 % |

Im Einzelnen: `solarcheck` (89 Einbl., 2 Klicks, Ø-Pos. 11,9) · `solar check` (43, 8,
Ø 8,2) · `solar checker` (6) · `solar-check dachbelegung` (5) · `solar-check` (4) ·
`pv checker` (3) · `solar check app` (2) · zwei weitere mit je 1.

**GEPRÜFT, mit einer wichtigen Einschränkung:** Bezugsgröße sind die 4.513
Einblendungen und 21 Klicks der **sichtbaren** Anfragen, nicht die 12.836 / 121 der
Seitenebene. Die Search Console unterdrückt seltene Suchanfragen; auf der Anfragen-Ebene
sind hier nur rund ein Drittel der Einblendungen und ein Sechstel der Klicks sichtbar.
Die 48 % gelten also für den sichtbaren Ausschnitt und sind **nicht** auf die
Gesamtklicks übertragbar.

Trotzdem ist der Befund belastbar: Der Markenname bringt heute wenig Einblendungen,
aber überdurchschnittlich viele Klicks — wer nach „solar check“ sucht, sucht uns und
klickt. Diese Anfragen laufen nach einem Namenswechsel ins Leere, und anders als
Sachanfragen lassen sie sich nicht per Weiterleitung retten: Der Begriff selbst gehört
dann niemandem mehr.

---

## 2. Verweise von außen

**Zwei unabhängige Messungen — und sie widersprechen sich, was selbst der Befund ist.**

### 2.1 Eigene Erhebung (belegt, Tabelle `kommunen_veroeffentlichung`, 27.09.2026)

| Angabe | Wert |
|---|---|
| Belegte Veröffentlichungen | 15 |
| davon **mit** Link auf uns | 13 |
| noch online | 14 |
| **verschiedene verweisende Domains mit Link** | **12** |

Die zwölf: `app.wallertheim.de` · `de.linkedin.com` · `facebook.com` · `gude.news` ·
`heringen.de` · `herzogtum-direkt.de` · `lokalo.de` · `nidda.de` · `rheinmainverlag.de` ·
`riedstadt.de` · `trier.de` · `wetterau.news`.

Alle stammen aus dem Kommunen-Outreach. Die jüngsten sind vom 25./26.09.2026 (Trier).

### 2.2 Fremdindex (DataForSEO Backlinks, live, 27.09.2026, 0,049 $)

| Angabe | Wert |
|---|---|
| Backlinks gesamt | 30 |
| Verweisende Domains | **23** |
| Spam-Bewertung des Profils | 37 |
| erstmals gesehen | 04.08.2026 |

Aufgeschlüsselt nach Spamwert:

| | Anzahl | Domains |
|---|---|---|
| Spamwert < 40 (glaubwürdig) | **6** | `meindorfnet.de`, `wetterau.news`, `gude.news`, `nidda.de`, `heringen.de`, `suedhessen.app` |
| Spamwert ≥ 40 (Linkfarmen) | **17** | Kasino-, Mode- und Pizza-Seiten, je ein Link |

Die 17 sind Linkfarmen, die auf alles verlinken. Sie tragen nichts und gehen bei einem
Umzug auch nichts verloren.

### 2.3 Zusammengeführt

**Vereinigung der glaubwürdigen verweisenden Domains: 14.**

Bemerkenswert und selbst ein Befund: **Acht unserer zwölf belegten Domains kennt der
Fremdindex nicht** — darunter Trier, Riedstadt, LinkedIn und beide Facebook-Beiträge.
Umgekehrt kennt er zwei, die wir nicht erfasst hatten (`meindorfnet.de`,
`suedhessen.app`). Wer nur eine der beiden Quellen liest, unterschätzt den Bestand;
für diesen Fall ist unsere eigene Messung die bessere.

### 2.4 Was die Messung NICHT sieht

Ausdrücklich benannt, weil eine Zahl ohne ihre Lücken zu gut aussieht:

- **Print.** Regionalzeitungen in der gedruckten Ausgabe tauchen nirgends auf.
- **App-Plattformen.** Wallertheim verlinkt uns in seiner Dorf-App; Verzeichnisse
  crawlen so etwas nicht.
- **Beiträge ohne Klick.** Ohne Besuch gibt es keine Herkunftsangabe.
- **Links mit `rel="noreferrer"`.** Kommen als „direkt“ an, ohne Quelle.
- **Die 1.269 Links in verschickten Mails** (siehe 3.5) — sie liegen in Postfächern,
  nicht auf Webseiten, und werden von keinem Verzeichnis gezählt.
- **Zwei belegte Veröffentlichungen ohne Link** (Berkenthin, hl-live.de) — sie nennen
  uns im Text, verlinken aber nicht. Ein Namenswechsel entwertet genau diese: Der
  genannte Name führt dann nirgendwohin.

---

## 3. Was ein Umzug technisch bedeutet

### 3.1 Adressen insgesamt

| Kategorie | Anzahl | Messung |
|---|---|---|
| **Indexierbar (Sitemap)** | **462** | Sitemap live gezählt |
| Atlas-Gemeindeseiten (erreichbar, überwiegend „nicht indexieren“) | **11.247** | `mastr_regions`, `level=gemeinde` |
| Routen-Dateien im Code (`page.tsx`) | 104 | davon 10 dynamisch |
| Ortsverzeichnis `ATLAS_CITIES` | 284 | aus dem Code |

Erreichbar sind damit rund **11.700 Adressen**, indexierbar **462**.

**Der Unterschied ist für die Kostenfrage entscheidend.** Umziehen müssen alle 11.700
(sonst laufen bestehende Links ins Leere), aber Signale zu übertragen hat nur bei den
462 einen Wert. Und: Bleiben die **Pfade gleich** und wechselt nur die Domain, ist das
**eine** Platzhalter-Regel, nicht 11.700 einzelne. Ändern sich zusätzlich die Pfade,
wird daraus eine Zuordnungstabelle — und dann ist die Zahl 11.700 die Arbeitsmenge.

### 3.2 Weiterleitungen, die heute schon stehen

Gemessen aus `next.config.js` (ausgeführt, nicht gezählt):

| Angabe | Wert |
|---|---|
| `redirects()` gesamt | **300** |
| davon dauerhaft (308) | 299 |
| davon temporär | 1 |
| `rewrites()` | 2 |

Nach Bereich: **281** Förderseiten · 4 Solar-Atlas · 15 Einzelumzüge (`/rechner`,
`/waermepumpe`, `/energie`, `/simulation`, `/empfehlung`, `/pv-bedarf-berechnen`,
`/balkonkraftwerk-rechner`, `/embed-demo` …).

**Was das für einen Umzug heißt:** Diese 300 Regeln müssen auf der neuen Domain
weiterlaufen. Sonst entsteht eine Kette — alte Domain/alter Pfad → neue Domain/alter
Pfad → neue Domain/neuer Pfad. Google folgt Ketten, aber langsamer, und jede Stufe ist
eine weitere Fehlerquelle. Der Aufwand dafür ist gering (dieselbe Datei zieht mit um);
der Fehler entsteht, wenn jemand sie für erledigt hält.

### 3.3 Die Domain im Code — die eigentliche Arbeitsmenge

Gezählt über alle `.ts/.tsx/.js/.jsx/.mjs/.css/.json/.xml/.txt/.yml`-Dateien,
ohne `node_modules`, `.next`, eingefrorene Design-Vorschauen.

| Bereich | Domain-Nennungen | Marken-Nennungen (alle Schreibweisen) | Dateien |
|---|---|---|---|
| `lib/` (Logik) | 77 | 221 | 59 |
| `app/` (Seiten & Routen) | 87 | 197 | 73 |
| `scripts/` (Läufe) | 66 | 114 | 43 |
| `components/` | 22 | 67 | 41 |
| Embed-Widgets | 27 | 54 | 29 |
| `public/` (statisch) | 5 | 42 | 16 |
| CI / Konfiguration | 18 | 24 | 9 |
| sonstiges | 2 | 13 | 3 |
| **Produktivcode zusammen** | **304** | **732** | **273** |
| Tests (`lib/__tests__`) | 113 | — | — |
| Doku / Messschnappschüsse | 704 | 722 | 8 |

**Die tragende Zahl ist 304 Domain-Nennungen in 273 Produktivdateien.**
Die 704 Nennungen in `docs/` sind abgelegte Messungen der Vergangenheit — sie
beschreiben einen historischen Zustand und dürfen gar nicht umgeschrieben werden.

**Ist die Domain zentralisiert? Teilweise — und das Teilweise ist das Problem.**

- `lib/seo.ts` führt `BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io"`.
- `app/robots.ts` und `app/sitemap.ts` erklären sich **jeweils eine eigene Kopie**
  derselben Konstante.
- **63 harte Vorkommen von `https://solar-check.io` als Zeichenkette in 57
  Produktivdateien** gehen an der Konstante vorbei.

Besonders betroffene Einzeldateien: `lib/kommunen-outreach-draft.ts` (9) ·
`app/(site)/datenschutz/page.tsx` (8) · `lib/outreach-mail.ts` (7) · `lib/gsc-site.ts` (7) ·
`lib/vercel-budget.ts` (5) · `lib/funding-inquiry-draft.ts` (5) ·
`app/(site)/lizenz/page.tsx` (5) · `app/(site)/widget-nutzungsbedingungen/page.tsx` (5) ·
`app/(site)/energie-widgets/client.tsx` (5) · `app/api/og/route.tsx` (4).

**Der Markenname ist die größere Menge: 732 Nennungen in 273 Dateien.** Eine
Domainumstellung ohne Namenswechsel ist deutlich kleiner als beides zusammen. Das ist
eine belegte Unterscheidung, keine Vermutung — die beiden Zahlen sind getrennt gemessen.

**Was zusätzlich an der Domain hängt und in keiner der Zahlen steckt:**

- **IndexNow-Schlüssel** (`lib/indexnow.ts`): Der Schlüssel ist fest auf
  `HOST = "solar-check.io"` verdrahtet und muss zusätzlich als Datei unter
  `/<schlüssel>.txt` liegen. Neue Domain = neuer Schlüssel + neue Datei.
- **TDM-Vorbehalt** (`public/.well-known/tdmrep.json`) und `app/robots.ts`.
- **Vercel-Domainbindungen:** heute `solar-check.io`, `www.solar-check.io`,
  `pv-rechner-alpha.vercel.app` — alle verifiziert (Vercel-API, 27.09.2026).
- **Search-Console-Property:** Für einen Domainwechsel verlangt Google die
  Adressänderung im alten Konto (siehe 4.1), also müssen **beide** Domains samt
  Varianten dort verifiziert sein.
- **Absenderdomain der Mails** (Anmeldemails, Abo, Outreach) samt SPF und DKIM.
- **Affiliate-Konto beim Händler** — die Partnerlinks tragen unsere Kennung, nicht die
  Domain; die hinterlegte Website-Angabe im Partnerkonto aber schon.

### 3.4 Einbettungen des Widgets bei Dritten

Gemessen in `embed_herkunft` (die Tabelle, die genau das zählt), 27.09.2026 — **alle
14 Zeilen gelesen, nicht gestichprobt:**

| Host | Widget | Zeilen | Einordnung |
|---|---|---|---|
| `www.sebastianschaeder.de` | erzeugung-mini | 12 | **eigene Website des Betreibers** |
| `bing.com` | gemeinde-solar | 1 | Suchmaschinen-Vorschau, keine Einbettung |
| `192.168.178.134` | gemeinde | 1 | **eigener Rechner im Heimnetz** |

**Echte Einbettungen bei Dritten: 0.** GEPRÜFT.

Das ist für die Umzugsfrage eine Entlastung — und zugleich der ernüchterndste Befund
des Papiers: 289 verschickte Widget-Angebote haben keine einzige fremde Einbettung
erzeugt. Ein Umzug kostet an dieser Stelle nichts, weil hier nichts ist.

### 3.5 Verschickte Anschreiben mit Links auf die alte Domain

Gemessen in `kommunen_kontakt`, 27.09.2026:

| Angabe | Wert |
|---|---|
| Verschickte Anschreiben (`contacted_at` gesetzt) | **289** |
| davon mit gespeichertem Brieftext | 269 |
| davon mit `solar-check.io` im Text | **269 (alle)** |
| solar-check.io-Links insgesamt in diesen Briefen | **1.269** |
| Links je Brief | 4 bis 5 |
| Andere verlinkte Hosts | **keine** |

Die 20 Briefe ohne gespeicherten Text sind der erste Schub vom 20.08.2026 — sie trugen
dieselben Links, nur wurde der Wortlaut damals noch nicht mitgeschrieben.

**Diese 1.269 Links liegen in fremden Postfächern und lassen sich nicht ändern.**
Sie funktionieren nach einem Umzug nur, solange die Weiterleitung steht. Das ist das
stärkste Einzelargument für Googles „mindestens ein Jahr, aus Nutzersicht unbefristet“.

Ein Nebenbefund, der nichts mit dem Umzug zu tun hat, aber beim Messen auffiel:
**`ref_klicks` steht bei allen 269 Briefen auf 0** — die Kurzlink-Zählung wird
offenbar nicht fortgeschrieben, obwohl Besuche aus Anschreiben anderweitig belegt sind.

### 3.6 Weitere Bestände, die die Domain kennen

| Bestand | Anzahl | angeschrieben? |
|---|---|---|
| Gemeinde-Abos (bestätigt) | **7** von 11 | laufender Kanal |
| Fachbetriebe | 4.916 | **0** — es gibt keinen Versandweg |
| Pressekontakte | 13.970 | **0** — es gibt keinen Versandweg |
| Social-Konten (LinkedIn, Instagram) | 2 | Profile nennen die Domain |
| Partner-Rechnerseiten (`/fuer/<kennung>`) | gebaut, nicht ausgerollt | keine live |

Bei Fachbetrieben und Presse existiert in der Datenbank **keine** Spalte für ein
Kontaktdatum — es ist also nichts hinausgegangen. Das ist der billigste Zeitpunkt für
einen Umzug, den es bei diesen beiden Beständen je geben wird: Alles, was hier später
verschickt wird, trüge sonst 18.886 Briefe mit der alten Domain.

---

## 4. Wie teuer ein Domainwechsel erfahrungsgemäß ist

### 4.1 Was Google selbst sagt — im Wortlaut

Quelle: **Google Search Central, „Site move with URL changes“**, abgerufen 27.09.2026
unter `https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes`.
Alle acht Zitate wurden gegen den Rohtext der Seite geprüft und sind **wörtlich**
(nicht aus einer Zusammenfassung übernommen).

**Zur Dauer:**

> „for medium-sized websites, it can take a few weeks or more for Google to gradually
> start showing the new URLs instead of the old ones (and for larger sites, even longer)“

> „The speed at which Googlebot and our systems discover and process moved URLs depends
> on the number of URLs and the server speed.“

**Zu Verlusten — und das ist der entscheidende Punkt:**

> „Expect temporary fluctuation in site ranking during the move.“

> „With any significant change to a site, you may experience ranking fluctuations while
> Google recrawls and reindexes your site.“

> „Note that the visibility of your content in Search may fluctuate temporarily during
> the move. This is normal and a site's rankings will settle down over time.“

**Google nennt an keiner Stelle eine Zahl.** Kein Prozentsatz, keine Spanne, keine
Größenordnung. Es steht dort „Schwankung“, „vorübergehend“ und „pendelt sich mit der
Zeit ein“ — mehr nicht. Wer eine Prozentzahl als Google-Aussage ausgibt, hat sie
nicht dort gelesen.

**Zur Dauer der Weiterleitungen — die klarste Aussage des ganzen Dokuments:**

> „Keep the redirects for as long as possible, generally at least 1 year. This timeframe
> allows Google to transfer all signals to the new URLs, including recrawling and
> reassigning links on other sites that point to your old URLs. From users' perspective,
> consider keeping redirects indefinitely.“

Also: **mindestens ein Jahr für Google, aus Nutzersicht unbefristet.**

**Zum Vorgehen:**

> „Small or medium sites: We recommend moving all URLs on your site simultaneously
> instead of moving one section at a time. This helps users interact with the site
> better in its new form, and helps our algorithms detect the site move and update our
> index faster.“

> „If your site is large and it's technically possible, we recommend initially moving
> just a piece of the site to test any effects on traffic and search indexing.“

> „Time your move to coincide with lower traffic, if possible. If your traffic is
> seasonal or dips on certain weekdays, it makes sense to move your site during the
> recurring traffic dips.“

**Und eine Stelle, die hier besonders zutrifft:**

> „if you want to move your site to a new domain name, change your content management
> system (CMS), and update your site to use a new layout, do them one at a time: move to
> a new domain, then change your site's layout.“

Das ist wörtlich unser Fall — und zwar nicht als abgeschlossene Vergangenheit.
**Gemessen an der Hauptlinie (`git log origin/main`, 15.–27.09.2026):** Die
Atlas-Ortsseiten sind am 22.09. auf das neue Design umgestellt worden, die
Gemeinde-Widgets am selben Tag, die Suche am 24.09., die Landkreis-Ansicht am 26.09.
Die Umgestaltung läuft also **noch**. Google rät ausdrücklich, Umzug und Umgestaltung
nacheinander zu machen — hier wäre der Umzug nicht „danach“, sondern mittendrin.

**Verfahren:** Google verlangt für einen Domainwechsel zusätzlich die Adressänderung
in der Search Console:

> „If you're changing domain names or subdomains, submit a Change of Address in Search
> Console for the old site.“

**Ergänzend zu dauerhaften Weiterleitungen** (Google Search Central, „Redirects and
Google Search“, abgerufen 27.09.2026): Bei einer dauerhaften Weiterleitung nutzt die
Indexierung diese „as a signal that the redirect target should be canonical“ — bei einer
temporären ausdrücklich nicht. Für einen Umzug kommen daher nur 301/308 in Frage. Eine
Pflichtdauer nennt dieses Dokument nicht; die steht in dem oben zitierten.

### 4.2 Dokumentierte Fälle mit Zahlen — und was davon trägt

Der Auftrag war, nach belegten Fällen zu suchen und „man hört oft 20 %“ nicht als
Befund zu zählen. Ergebnis der Suche:

**Es gibt keine belastbare, unabhängig überprüfbare Zahl.** Das ist das ehrliche
Ergebnis, nicht ein Versäumnis der Recherche.

Im Einzelnen geprüft:

| Quelle | Behauptung | Bewertung |
|---|---|---|
| **Google Search Central** | keine Zahl, nur „vorübergehende Schwankung“ | **Primärquelle, aber unquantifiziert** |
| **SALT.agency**, „Only 27 % of domain migrations recover in 90 days“ | n = 1.052 Umzüge; **Median 304 Tage** bis zur Erholung, Mittelwert 489; ~23 % binnen 90 Tagen, ~58 % binnen eines Jahres, **13,9 % auch nach 3 Jahren nicht** erholt | **Das Beste, was es gibt — und trotzdem mit Vorbehalt.** Stichprobe sind eigene Projekte der Agentur plus „crowdsourced from the SEO community“; das Auswahlverfahren ist nicht beschrieben, die Rohdaten sind nicht veröffentlicht, und die Autoren schreiben selbst: „this study does not run regression analysis against migration quality factors“. Umzüge, die geräuschlos gut gingen, werden in einer solchen Sammlung systematisch unterrepräsentiert sein. |
| „Fountain Partnership“ / „Numen Technology“: 10–30 % Einbruch im ersten Monat | — | **Agenturaussage ohne Stichprobe, ohne Methode, ohne Datensatz.** Zählt nicht. |
| „iO Digital“: bis zu 80 % Verlust | — | dito. Zählt nicht. |
| Einzelfall Hooshmand (.net → .com, ~90 % Verlust, Erholung nach 1,5 Jahren) | — | **Ein Einzelbericht.** Als Existenzbeweis brauchbar („so etwas kommt vor“), als Erwartungswert wertlos. |
| „60–80 % aller Umzüge verlieren deutlich“, „20–50 % Verlust üblich“ | — | **Zirkuliert ohne Quelle.** Nicht verwendbar. |

**Ein Fund, der für sich lehrreich ist:** Die Sekundärwiedergabe der SALT-Studie, die
mehrfach auftaucht, spricht von **„892 Umzügen, im Schnitt 523 Tage“**. Die Studie
selbst nennt **1.052 Umzüge, Median 304 Tage, Mittelwert 489**. Die weiterverbreitete
Fassung war also schon falsch, bevor jemand sie zitierte — genau der Grund, aus dem in
diesem Projekt Sekundärquellen nicht als Beleg gelten.

### 4.3 Warum die Fremdzahlen auf uns ohnehin nur begrenzt passen

Das ist Einordnung, keine Messung — und als solche gekennzeichnet:

Was bei einem Umzug verloren gehen kann, ist **angesammeltes Signal**. Unser
angesammeltes Signal ist, gemessen: 462 indexierte Adressen, **14** glaubwürdige
verweisende Domains, 110 platzierte Suchbegriffe, 121 Klicks in 28 Tagen. Die Studien
messen überwiegend gewachsene Unternehmensseiten mit vier- bis fünfstelligen
Linkzahlen. Bei denen ist die Signalübertragung das Nadelöhr; bei uns gibt es kaum
etwas zu übertragen.

**Die Gegenrichtung gehört dazu, sonst ist die Einordnung Schönfärberei:** Wenig
angesammeltes Signal heißt auch wenig Puffer. Eine gewachsene Seite fällt um 30 % und
steht immer noch. Bei 121 Klicks geht derselbe Anteil in der normalen Schwankung
unter — aber ein Totalausfall der zwanzig Seiten aus Abschnitt 1.4 wäre praktisch der
ganze Verkehr.

---

## 5. Zusammengefasst: die Rechnung

**Was auf dem Spiel steht (gemessen 27.09.2026):**

| Posten | Menge |
|---|---|
| Einblendungen / Klicks in 28 Tagen | 12.836 / 121 |
| Indexierte Adressen | 462 |
| Platzierte Suchbegriffe (Fremdindex) | 110, davon 5 auf Seite 1 |
| Suchanfragen mit eigener Ø-Position ≤ 10 (Search Console) | 157 |
| Glaubwürdige verweisende Domains | 14 |
| Echte Widget-Einbettungen bei Dritten | 0 |
| Links auf die alte Domain in verschickten Briefen | 1.269 in 289 Anschreiben |
| Bestätigte Abonnenten | 7 |

**Was die Arbeit ausmacht (gemessen):**

| Posten | Menge |
|---|---|
| Domain-Nennungen im Produktivcode | 304 in 273 Dateien |
| davon harte Zeichenketten an der Konstante vorbei | 63 in 57 Dateien |
| Markennennungen im Produktivcode (zusätzlich, nur bei Namenswechsel) | 732 |
| Domain-Nennungen in Tests | 113 |
| Bestehende Weiterleitungen, die mitziehen müssen | 300 |
| Erreichbare Adressen, die weitergeleitet werden müssen | ~11.700 (eine Regel, falls die Pfade bleiben) |
| Nicht änderbar, nur weiterzuleiten | 1.269 Links in fremden Postfächern |

**Was Google sagt:** „a few weeks or more“ bis die neuen Adressen gezeigt werden ·
„expect temporary fluctuation“, ohne jede Zahl · Weiterleitungen „generally at least
1 year“, aus Nutzersicht unbefristet · kleine und mittlere Seiten auf einmal umziehen ·
den Umzug in eine Verkehrsdelle legen · Umzug und Umgestaltung **nacheinander**.

**Der Befund zum Zeitpunkt, und er ist der einzige, bei dem die Zahlen deutlich
sprechen:** Die Kurve steigt seit zehn Wochen ununterbrochen, die letzte gemessene
Woche ist die stärkste bisher. Googles eigener Rat lautet, in eine Verkehrsdelle zu
ziehen — die gibt es gerade nicht. Der Bestand, der verloren gehen kann, ist klein
genug, dass ein Umzug technisch billig wäre; teuer ist er, weil er eine Wachstumsphase
unterbricht und weil die Umgestaltung der Seiten noch läuft — gegen Googles
ausdrückliche Empfehlung, beides nicht zusammenzulegen.

---

## Anhang: Messwege, damit das nachvollziehbar bleibt

| Zahl | Weg |
|---|---|
| Einblendungen / Klicks | `GET /api/seo/gsc?prefix=/&days=28` bzw. `90`, Bearer `CRON_SECRET` |
| Tagesreihe | `GET /api/seo/index-status?prefix=/&days=180` → `byDate` |
| Suchanfragen / Positionen | `GET /api/seo/gsc?dim=query&days=28` bzw. `90` |
| Sitemap-Status | `GET /api/seo/index-status` → `sitemaps` |
| Sitemap-Adressen | `curl https://solar-check.io/sitemap.xml`, `<loc>` gezählt |
| Indexierungsstatus | `GET /api/seo/index-status?urls=…` (max. 10 je Aufruf) |
| Rankings | DataForSEO Labs `ranked_keywords/live`, `location_code 2276`, `de` |
| Verweise (fremd) | DataForSEO `backlinks/summary/live` + `backlinks/referring_domains/live` |
| Verweise (eigen) | Supabase `kommunen_veroeffentlichung` |
| Einbettungen | Supabase `embed_herkunft` (alle Zeilen) |
| Anschreiben | Supabase `kommunen_kontakt`, `contacted_at`/`draft_body` |
| Weiterleitungen | `next.config.js` ausgeführt, `redirects()` gezählt |
| Domain im Code | Dateibaum-Durchlauf über die genannten Endungen |

**Kosten der Fremdabrufe an diesem Tag: 0,074 $** (Rankings 0,025 · Backlink-Übersicht
0,024 · Verweis-Domains 0,025). Deckel laut Runbook 0,50 $ je Lauf.

**Entscheidung für den Betreiber, nebenbei aufgefallen:** Das DataForSEO-Guthaben lag
vor diesen Abrufen bei **2,55 $**. Das Runbook sieht vor, unter 5 $ die Frage „aufladen?“
vorzulegen. Bei ~0,19 $ je Monatslauf reicht es noch rund ein Jahr — aber ein Lauf mit
zusätzlichen Ergebnisseiten-Prüfungen kann auch 0,50 $ kosten.
