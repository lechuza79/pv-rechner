# SEO-Sichtbarkeits-Wächter — Runbook (monatlich)

**Zweck:** Einmal im Monat messen, wie sichtbar solar-check.io in Google ist
(Rankings, Indexierung, Impressionen), die Bewegung zum Vormonat auswerten und dem
Betreiber eine **Themen-Shortlist** für neuen Content vorlegen. Strategie-Hintergrund:
`docs/seo-content-workflow-konzept.md`, Ausgangsanalyse: `docs/seo-analyse-solar-check-io.md`.

**Befugnis (Gate Teil 3):** Dieser Wächter ist ein **Mess- und Melde-Wächter.**
Er ändert **keinen Content, keine Metadaten, keinen Code** — Content-Änderungen
sind Produkt/Außenwirkung und laufen über normale Sessions mit Abnahme. Selbst
erledigen darf er nur: (a) den Monats-Schnappschuss ablegen und committen,
(b) die Sitemap-Neueinreichung, die `/api/seo/index-status?resubmit=1` ohnehin
automatisch macht (sichere Richtung, idempotent).

## Zugangsdaten

- **DataForSEO:** `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` aus `.env.local`
  (`source .env.local`, nur per Env-Var expandieren, **nie loggen oder echoen**).
- **GSC + Alert:** `CRON_SECRET` aus `.env.local`, als Bearer gegen die eigenen
  API-Routen.
- **Befehle klein halten:** Ein kombinierter Riesen-Befehl (source + curl + Heredoc)
  wird vom Permission-Classifier geblockt — Abruf und Auswertung als **getrennte**
  Bash-Aufrufe fahren (Abruf → JSON in Datei, Auswertung → eigener python3-Aufruf).

## Kostendeckel

Vor dem Lauf Guthaben prüfen (`GET https://api.dataforseo.com/v3/appendix/user_data`,
Basic Auth). **Maximal 0,50 $ pro Lauf** ausgeben (der Standard-Lauf kostet ~0,05 $).
Guthaben unter 5 $ → als Entscheidung „aufladen?" in den Bericht.

## Schritt 1 — Rankings abrufen (DataForSEO Labs)

`POST https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live`
Body: `[{"target":"solar-check.io","location_code":2276,"language_code":"de","limit":500}]`
(~0,02 $). Je Item relevant: `keyword_data.keyword`,
`keyword_data.keyword_info.search_volume`, `ranked_serp_element.serp_item.rank_group`,
`…serp_item.relative_url`.

## Schritt 2 — Schnappschuss ablegen + Vormonat vergleichen

Kompakten Schnappschuss nach `docs/seo/rankings-JJJJ-MM.md` schreiben: kurzer
Kopf (Datum, Keyword-Gesamtzahl, Top-Positionen) + ein ```json-Block mit
`[{"kw":…,"rank":…,"vol":…,"url":…}]`. **Bewusst `.md`, nicht `.json`** — Commits,
die nur `*.md` ändern, überspringen den Vercel-Build (Ignored Build Step).

Gegen den Vormonats-Schnappschuss (Datei des Vormonats) auswerten:
- **Aufsteiger/Absteiger** ≥ 5 Positionen (mit Volumen)
- **Neu gerankt / verloren**
- **Quick-Win-Zone:** alles auf Position 11–25 mit Volumen ≥ 50/Monat

Kein Vormonat vorhanden → nur Schnappschuss, Vergleich entfällt (erster Lauf: 08/2026).
Commit als `[auto]` (nur der Schnappschuss, spezifisch gestaged, kein `git add -A`).

### Schritt 2b — SERP prüfen, BEVOR aus einem Volumen eine Chance wird — BLOCKER

Ein hohes Suchvolumen in `ranked_keywords` ist **kein** Chancensignal. Das gilt für
**jede Empfehlung dieses Berichts**, gleich woher der Begriff kommt: Quick-Win-Zone,
Ideen-Abruf, Wettbewerbsvergleich oder ein Schlusssatz, der einen „Hebel" benennt.
Der Geltungsbereich stand hier bis zum 02.09.2026 enger („für einen Begriff aus der
Quick-Win-Zone") — und genau durch diese Lücke ist die Regel gebrochen worden, ohne
dass jemand sie übergehen musste. Vor jeder Empfehlung also:

`POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced`
Body `[{"keyword":…,"location_code":2276,"language_code":"de","depth":10}]` (0,002 $;
**nur ein Task je Aufruf**, sonst „You can set only one task at a time"). Auswerten:

1. **Steht `ai_overview` oder `featured_snippet` im `items`-Aufbau?** Das wird
   MITGEMELDET, ist aber **kein Ausschlusskriterium** (Betreiber-Entscheidung
   02.09.2026: „ich gehe davon aus, dass es bald für alles eine KI-Antwort gibt. Es ist
   gut zu wissen, aber kein Ausschlusskriterium").

   **Warum die Regel gelockert wurde, und zwar begründet:** Sie stand vorher als
   Ausschluss („nicht als Chance melden") und stützte sich auf **vier** Suchbegriffe vom
   13.08.2026 — drei mit KI-Antwort und null Klicks, einer ohne und mit einem Klick. Für
   einen Ausschluss, der ganze Themenfelder streicht, ist das zu dünn, und die Entwicklung
   läuft ohnehin dagegen: Im Lauf 09/2026 trugen bereits 7 von 12 geprüften Begriffen eine
   KI-Antwort. Ein Ausschluss auf dieser Grundlage streicht demnächst alles.

   **Was von dem Befund trägt, ist der MECHANISMUS, nicht die Zahl:** Abgefangen wird,
   was sich vorab beantworten lässt. Veränderliches, Ortsbezogenes und Interaktives nicht
   — eine Antwortmaschine kann weder den aktuellen Strommix noch „zahlt MEINE Gemeinde
   einen Zuschuss, und wie viel" vorformulieren. Also einordnen statt streichen:
   - erklärende Seite + KI-Antwort → Klickerwartung stark dämpfen, Aufwand meiden;
   - Live-Wert, Ortsbezug oder Rechner + KI-Antwort → Chance bleibt, mit Vermerk.
   Die Einordnung gehört als Satz in den Bericht, damit die Erwartung von Anfang an
   stimmt und ein späteres „bringt ja doch nichts" nicht als Überraschung ankommt.
2. **Wer steht auf Platz 1–8, und welche Frage beantworten die?** Deckt sich die
   Intention nicht mit unserem Angebot, ist der Begriff kein Ziel, egal wie groß das
   Volumen ist.
3. **Gegenprobe in der Search Console:** Wie viele Einblendungen bringt der Begriff uns
   tatsächlich (`?dim=query&page=…`)? Volumen ohne eigene Einblendungen ist Theorie.

**Der Fehlschlag, aus dem das entstand (13.08.2026):** „solarkataster nrw" (Volumen
1.900) wurde als größte Chance empfohlen. Tatsächlich stehen dort amtliche
Dachflächen-Werkzeuge (Energieatlas NRW, land.nrw, open.nrw) — eine andere Frage als
unsere Bestandsstatistik —, wir standen auf Position 73,6 und hatten in 28 Tagen **5**
Einblendungen. Bei unserem eigenen Wort („solaratlas rlp") standen wir auf 10,6.
Vollständig in `docs/seo/befund-2026-08-13.md`.

**Derselbe Fehlschlag ein zweites Mal (02.09.2026), und das ist der wichtigere Teil:**
Der Monatsbericht empfahl als Hebel „Positionsarbeit an den Atlas-Landesseiten" und
begründete das mit genau diesen Begriffen („solarkataster nrw" 2.400, „solarkataster
rlp" 720, „energieatlas nrw" 590). Die Ergebnisseiten waren dabei sogar abgerufen
worden — aber nur auf die Frage, ob eine KI-Antwort davorsteht. **Punkt 1 dieser Liste
war geprüft, Punkt 2 nicht.** Die Nachprüfung am selben Tag: Auf Seite 1 aller drei
Begriffe steht ausnahmslos ein amtliches Dachflächen-Kataster; auf den Atlas-Seiten
beantwortet kein Treffer auf Seite 1 unsere Frage. Wer nur Punkt 1 abarbeitet, hat die
Ergebnisseite gesehen und die Frage nicht gestellt.
Festgehalten als Grundregel `absicht-vor-volumen` in `lib/seo-grundregeln.ts`.

### Schritt 2b-1 — BEANTWORTET (02.09.2026): Es war die Länge, nicht die Überschrift

Die offene Frage („Schreibt Google unsere Atlas-Titel um?") ist entschieden und dieser
Abschnitt bleibt nur noch als Messregel stehen.

**Gemessen an neun Landesseiten, live abgerufene Ergebnisseiten, sortiert nach Länge des
Titels OHNE Markenzusatz:**

| Länge | Seiten | Google zeigt |
|---|---|---|
| 52–60 | Bayern, Berlin, Hamburg, Hessen, Brandenburg, Niedersachsen | **unseren Titel** |
| 62–66 | Rheinland-Pfalz, Baden-Württemberg, Nordrhein-Westfalen | „Solaranlagen in <Land> - Solar Check" |

Neun von neun, ohne Ausnahme, Schnitt zwischen 60 und 62 Zeichen.

**Was daraus NICHT folgt** — und im ersten Anlauf des Berichts 09/2026 so dastand:
„Google zieht den Wortlaut der sichtbaren Überschrift heran, also ist die Angleichung
fällig." Google greift auf die Überschrift **nur** zurück, wenn unser Titel nicht passt;
bei sechs der neun Seiten hat er ihn unverändert genommen. Der erste Anlauf hatte drei
Seiten geprüft — zufällig die drei längsten — und eine Längenwirkung mit
`/strommix-deutschland` ausschließen wollen. Diese Gegenprobe lag mit 55 Zeichen selbst
unterhalb der Grenze und konnte deshalb nichts ausschließen. **Eine Gegenprobe muss auf
der anderen Seite der vermuteten Grenze liegen, sonst ist sie keine.**

Umgesetzt: Der Titel steht seit dem 02.09.2026 als eine Quelle in `lib/atlas-titel.ts`
(vorher zweimal getippt, beide Fassungen zu lang) und liegt bei höchstens 55 Zeichen.
`lib/__tests__/atlas-titel-laenge.test.ts` hält das Budget für alle 16 Länder und für
die Ortsseiten.

**Was je Monatslauf davon bleibt:** In `ranked_keywords` bzw. den SERP-Abrufen je
Atlas-URL das angezeigte `title`-Feld gegen unser title-Tag halten. Weicht es ab, ist es
ein Befund — dann zuerst die Länge nachmessen, nicht die Wortwahl ändern.

### Schritt 2b-2 — Zwei eigene Seiten auf einer Anfrage — BLOCKER

Seit dem 18.08.2026 mitzuführen, weil es die teuerste Fehlerklasse dieses Bereichs ist
und man sie in Summen nicht sieht: Wir haben **zwei Seitenfamilien mit Ortsnamen** —
`/photovoltaik-foerderung/{land}/{stadt}` und (künftig) `/solar-atlas/{land}/{kreis}/{gemeinde}`.
Die Rollentrennung lautet: Förderseite = Geld-Wörter, Atlasseite = Bestands-Wörter.

**Sie ist bereits gebrochen.** Nachgezählt an den Anfragendaten: 33 der 108 sichtbaren
Förder-Anfragen tragen kein Geld-Wort, bei sieben Anfragen erscheinen beide Familien, bei
dreien steht die Förderseite auf einem reinen Bestands-Wort besser („photovoltaik pfalz":
Förderseite 32,1 gegen Atlas 43,9).

Je Monatslauf deshalb erheben und in den Schnappschuss schreiben:
1. Wie viele Förder-Anfragen tragen kein Geld-Wort (absolut und als Anteil)?
2. Bei welchen Anfragen erscheinen beide Familien gleichzeitig, und welche steht besser?

Steigt die Zahl, ist das ein Befund für den Betreiber — nicht weil er etwas tun muss,
sondern weil daran hängt, ob die nächste Atlas-Welle überhaupt starten darf. Die statische
Hälfte (unsere eigenen Titel) hält `lib/__tests__/atlas-foerder-wortklassen.test.ts`; die
Zuordnung durch Google kann nur diese Messung sehen.

### Schritt 2b-3 — Der Anteil sichtbarer Anfragen entscheidet, ob eine Position echt ist — BLOCKER

Die Regel „Durchschnittsposition nie ohne Query-Ebene" (unten) sagt, dass man nachsehen
muss. **Diese hier sagt, was man dabei ausrechnet:** je Seite die Summe der Einblendungen
aus den sichtbaren Anfragen geteilt durch die Einblendungen der Seitenebene.

- **Anteil hoch (grob über 30 %)** → die Position beschreibt echte Anfragen. Snippet- und
  Titelarbeit lohnt.
- **Anteil nahe null** → die Seite lebt von Anfragen, die Google anonymisiert, weil sie zu
  selten sind. Die schöne Durchschnittsposition ist dann ein Artefakt aus lauter
  Einzelabfragen, und jede Optimierung schreibt für Verkehr, den es nicht gibt.

**Gemessen am 18.08.2026 an den zwölf stärksten Förder-Stadtseiten** — und das Ergebnis
hat eine bereits ausgesprochene Empfehlung gekippt, die genau auf die guten Positionen
gebaut hatte:

| Seite | Einbl. | Pos. | Anteil sichtbar |
|---|---|---|---|
| Frankfurt | 214 | 19,0 | **40 %** |
| Köln | 54 | 9,4 | 11 % |
| Essen | 89 | 8,5 | 9 % |
| Viersen | 72 | 6,7 | 4 % |
| Regensburg | 50 | 7,1 | 4 % |
| Osnabrück | 71 | 7,2 | 3 % |
| Hannover | 120 | 7,8 | 2 % |
| Wiesbaden | 53 | 7,6 | 2 % |
| Würzburg | 69 | 7,1 | 1 % |
| Bonn / Rhein-Erft / Mainz | 86 / 83 / 36 | 7,7 / 8,1 / 12,5 | **0 %** |

Die sechs Seiten „auf Seite 1" haben zusammen praktisch keine benennbare Anfrage. Die
einzige Seite mit Substanz steht auf **Position 19**, nicht auf 7 — und ihre echten
Anfragen („photovoltaik förderung frankfurt" 11,9, „klimabonus frankfurt 2026" 9,1) sind
ein Ranking-Thema, kein Snippet-Thema.

**Konsequenz für jeden Lauf:** Diese Spalte gehört in den Monats-Schnappschuss. Eine
Seite ohne sichtbare Anfragen wird nicht als Chance gemeldet, egal wie gut ihre Position
aussieht.

### Schritt 2c-2 — Eine Summe über die Anfragen-Ebene ist KEINE Seitensumme — BLOCKER

Die Gegenrichtung zur Regel darunter, und sie ist am 02.09.2026 eingetreten: Aus
`?dim=query` summierte Einblendungen und Klicks ergeben **nicht** die Reichweite einer
Fläche. Die Anfragen-Ebene enthält nur, was Google einzeln ausweist; alles unterhalb der
Anonymisierungsschwelle fehlt. Gemessen über 90 Tage (01.06.–30.08.2026) an derselben
Property:

| | Anfragen-Ebene | Seitenebene | fehlt |
|---|---|---|---|
| Einblendungen | 4.034 | 10.463 | 61 % |
| Klicks | 8 | 79 | 90 % |

Bei den Klicks fehlen also neun von zehn. Aus der Anfragen-Summe wurde daraufhin
„0 Klicks auf den Atlas-Seiten" — tatsächlich waren es 13 bei einer Klickrate im
Bereich der Seite insgesamt. **Wer Reichweite oder Klicks einer Fläche beziffert, nimmt
`?prefix=`. `?dim=query` beantwortet, WONACH gesucht wurde, nicht WIE VIEL ankam.**

### Schritt 2c — Durchschnittsposition nie ohne Query-Ebene — BLOCKER

Eine gute Durchschnittsposition bei ~1 % Klickrate ist ein **Warnsignal, kein Erfolg**.
Der Schnitt entsteht dann aus bedeutungslosen Mikro-Anfragen: `/methodik` stand auf
Position 4,5 — die Anfragen dahinter hießen „berechnen", „8 kw", „pro qm", „wie viel im
monat", je eine Einblendung. Vor jeder Aussage über eine gut platzierte Seite
`?dim=query&page=…` abrufen und nachsehen, wofür sie wirklich rankt. Dieselbe
Systematik wie „Impressionen sind kein Indexierungsstatus".

## Schritt 3 — Indexierung + Impressionen (GSC, eigene Routen)

- `GET https://solar-check.io/api/seo/index-status?resubmit=1&days=28&urls=<bis zu 10 wichtige/neue Seiten>`
  — **Impressionen sind KEIN Indexierungsstatus** (BLOCKER, siehe CLAUDE.md):
  bewerten ausschließlich über `coverageState`. Neue Seiten der letzten 2 Monate
  (aus `lib/ratgeber.ts` + jüngste Routen) immer in die `urls`-Liste.
- `GET https://solar-check.io/api/seo/gsc?days=28` — Impressionen je Seite, nur
  mit Verlauf (`byDate`) interpretieren, nie als Summe.

## Schritt 4 — Chancen-Shortlist (nur wenn der Vormonat abgearbeitet ist)

Steht aus dem Vormonatsbericht noch eine unerledigte Shortlist offen (im
Bericht der Ablage nachsehen bzw. am Fehlen neuer Seiten erkennbar), **keine neue
Recherche fahren** — die alte Shortlist erneut anhängen, Kosten sparen.

Sonst: `POST …/dataforseo_labs/google/keyword_ideas/live` mit 3–5 Seed-Keywords
aus unseren Themenfeldern (PV, Balkonkraftwerk, Wärmepumpe, Förderung, Strompreis;
`location_code` 2276, `language_code` de, `limit` 200, Filter Volumen ≥ 200).
Scoring: `Volumen × (100 − KD)`, dann Fit-Filter (passt es zu Rechner/Förderung/
Energiedaten? Transaktions-Keywords fremder Geschäftsmodelle raus). **Maximal 5
Chancen**, je Chance: Keyword, Volumen, KD, empfohlener Seitentyp (Optimierung
bestehender Seite / Ratgeber / Tool / Hub-Erweiterung) in je einem Satz.

**Intent-Filter davor** (`docs/seo-intent-konzept.md`): Jede Chance durchläuft die
SERP-Prüfung aus Schritt 2b. Steht dort eine KI-Antwort, ist eine erklärende Seite
kein gültiger Vorschlag — dann nur empfehlen, was die Antwortmaschine nicht kann:
etwas Veränderliches (Live-/Statuswerte), etwas Persönliches (Rechner) oder etwas
Handelndes (Checkliste, Antragsweg, Download). Der empfohlene Seitentyp muss
**Werkzeug** heißen, nicht „Ratgeber", sobald eine KI-Antwort auf der Suche steht.

## Schritt 4b — Vorlauf-Messung für den nächsten Schub — BLOCKER

**Der Wächter misst monatlich im Nachhinein. Ein Schub braucht die Messung VORHER.**
Beides aus derselben Quelle, sonst entstehen zwei Zahlenstände über dieselbe Frage.

**Wann:** Wenn `npm run release:plan` einen Schub innerhalb der nächsten 14 Tage
zeigt, dessen `nachweis` noch `null` ist. Sonst entfällt der Schritt ersatzlos —
er hängt am Plan, nicht am Kalender.

**Du musst nicht daran denken.** Der Gesundheitscheck wertet den Plan alle drei
Stunden aus (`planMeldungen`, in `scripts/health-check.ts`) und meldet an Claude,
sobald ein Schub in die Vorlauffrist läuft oder sein Datum verstreicht — auch
dann, wenn dieser Wächter gerade gar nicht läuft. Das ist Absicht und dieselbe
Lehre wie bei `stand:faellig`: Eine Prüfung, die nur innerhalb eines Wächters
läuft, meldet dessen Ausfall nicht mit.

**Ausgeführt wird sie mit einem Befehl, nicht von Hand:**

```
source .env.local && npm run release:messen        # nächster ungemessener Schub
source .env.local && npm run release:messen w1-foerder-dach
npm run release:messen -- --trocken                # zeigt nur, was gefragt würde
```

Er holt das Suchvolumen je Ort bei DataForSEO, liest die eigenen Anfragen der
letzten 90 Tage aus der Search Console, prüft je Ort, ob dort **beide**
Seitenfamilien auf denselben Anfragen stehen, legt den Beleg unter `docs/seo/`
ab und druckt den fertigen `nachweis`-Block zum Eintragen. **Er entscheidet
nichts** — ob der Schub kommt, kleiner wird oder wegfällt, ist danach ein Urteil,
kein Rechenergebnis.

**Warum überhaupt vorher:** Zwei Fehlschläge an einem Tag (18.08.2026) hatten
dieselbe Ursache — alle vorhandenen Prüfungen waren grün, und die Frage, ob auf
dieser Ebene überhaupt gesucht wird, hatte niemand gestellt. Nach dem Livegang
lässt sie sich nicht mehr folgenlos beantworten: Eine Seite, die keine Nachfrage
bedient, wieder einzusammeln kostet mehr als sie je gebracht hat.

**Was zu erheben ist** — je Schub, nicht je Ort, mit **fünf** Stichproben aus der
Ortsliste (die größten und die kleinsten, nicht die bequemen):

1. **Suchvolumen im Muster, das Nutzer tippen.**
   `POST …/dataforseo_labs/google/keyword_ideas/live` bzw. für einzelne Begriffe
   `…/keywords_for_keywords/live`, `location_code` 2276, `language_code` de.
   Für Förderseiten: „photovoltaik förderung {ort}", „solar zuschuss {ort}".
   Für Atlas-Ortsseiten: „photovoltaik {ort}", „solaranlagen {ort}".
2. **Gegenprobe an wieistmeinsolar.de** (dieselbe Datenbasis, dasselbe Produkt):
   Rankt der Wettbewerber für Orte dieser Größenordnung? Was der dort nicht
   schafft, schaffen wir auch nicht. Statt fünf Stichproben von Hand geht das
   vollständig über `POST …/dataforseo_labs/google/domain_intersection/live`
   (beide Domains, `intersections: false` liefert die Lücke — Begriffe, für die
   er rankt und wir nicht).
3. **Kannibalisierung je Ort:** Steht für „{ort}" schon eine eigene Seite der
   anderen Familie in der Search Console (`?dim=query`)? Das ist Frage 2 des
   Nachweises. **Die Search Console beantwortet sie nur dort, wo wir sichtbare
   Anfragen haben — und das ist die Ausnahme:** Bei sechs der zwölf stärksten
   Förder-Stadtseiten lag der Anteil sichtbarer Anfragen bei 0–4 % (Messung
   18.08.2026, Schritt 2b-3). Für den Rest bleibt die Frage per Search Console
   unbeantwortbar. `POST …/dataforseo_labs/google/page_intersection/live` mit
   zwei eigenen Adressen liefert sie unabhängig davon; die eigenen Daten bleiben
   die belastbarere Quelle, wo es sie gibt.

**Kosten:** ~0,002 $ je SERP-Abruf, ~0,05 $ je Keyword-Satz — ein Schub-Vorlauf
liegt bei **unter 0,10 $** und damit weit unter dem Deckel von 0,50 $. Der Aufwand
ist kein Argument gegen die Messung.

**Ergebnis eintragen** — in `nachweis` des Schubes in `lib/release-plan.ts`
(`gemessenAm`, `nachfrage`, `kannibalisierung`, `beleg`), Beleg als Datei unter
`docs/seo/`. Ohne diese vier Felder lässt der Test den Schub nicht auf `live`;
das ist die Sperre, nicht dieser Text.

**Der Befund kann „nicht bauen" lauten, und das ist ein gutes Ergebnis.** Fällt die
Nachfrage aus, wird der Schub verkleinert oder gestrichen — nicht verschoben, bis
er niemandem mehr auffällt. Das ist eine Entscheidung des Betreibers und gehört
als solche in den Bericht.

## Schritt 5 — Ratgeber-Frische

`lib/ratgeber.ts`: Einträge mit `updated` älter als 6 Monate listen — nur als
Hinweis im Bericht (ob eine Aktualisierung lohnt, hängt am Thema; die fachliche
Aktualität sichern die Fach-Wächter).

## Schritt 6 — Bericht

`POST https://solar-check.io/api/alert` (Bearer `$CRON_SECRET`), Format nach
`scripts/waechter-gate.md` Teil 3 / `lib/alert-format.ts`:
- `decisions` = **nur** die Themenwahl („Welche 1–2 Chancen der Shortlist bauen?",
  mit Empfehlung) und ggf. „Guthaben aufladen?". Keine Shortlist und kein
  Guthaben-Thema → Feld leer, dann geht bewusst **keine Mail** raus.
- `done` = Schnappschuss abgelegt, ggf. Sitemap neu eingereicht.
- `details` = der volle Bericht: Bewegung, Quick-Win-Zone, Indexstatus neuer
  Seiten, Shortlist mit Scores, Ratgeber-Frische.

**Zusätzlich im Bericht mitführen** (seit 08/2026, `docs/seo-intent-konzept.md` Abs. 6):
- **Klicks je Fläche** (Förderung / Energiedaten / Rechner / Ratgeber) — überlebt die
  KI-Antwort als Aussage, anders als Einblendungen.
- **Anteil unserer Top-20-Begriffe mit KI-Antwort** auf der Ergebnisseite. Steigt er,
  sinken die Klicks ohne unser Zutun — das muss sichtbar sein, bevor jemand die Ursache
  bei der eigenen Arbeit sucht.
- **Zitate in KI-Antworten:** bei den geprüften Begriffen die Quellenliste des
  `ai_overview`-Elements mitlesen (`references[].domain`) und melden, ob solar-check.io
  darunter ist. Einziges Maß für den Ratgeber-Strang, der bewusst nicht mehr auf
  Besucher zielt.

**Nicht tun:** Titles/Content „schnell mitfixen" (Außenwirkung → Session mit
Abnahme) · Rankings aus Impressionen ableiten · KD/Volumen aus dem Gedächtnis
statt aus der API · Shortlists über 5 Einträge (verwässert die Entscheidung).

## Anhang — Was der Anbieter sonst kann, und was wir davon nehmen

Bewertet am 25.08.2026 anhand der Angebotsübersicht des Anbieters. **Nicht neu
erheben** — wer eine der verworfenen Auswertungen wieder vorschlägt, braucht einen
neuen Grund, nicht die alte Produktliste. Preise sind hier **nicht geprüft**; belegt
sind nur die zwei, die wir zahlen (Ranking-Abruf ~0,02 $, Einzel-SERP 0,002 $).

**Aufgenommen** (siehe Schritt 4b):
- **Domain-Lücke gegen den Wettbewerber** — ersetzt die Stichproben-Gegenprobe.
- **Überschneidung zweier eigener Adressen** — beantwortet die Kannibalisierungs-Frage
  auch dort, wo die Search Console wegen anonymisierter Mikro-Anfragen schweigt.

**Zu prüfen, wenn ein Anlass da ist** (nicht als Dauerlauf, jeweils erst einmalig
messen und den Nutzen belegen):
- **Saisonalität eines Begriffs.** Unsere Themen sind gegenläufig saisonal (Klimaanlage
  im Sommer, Wärmepumpe im Winter), und der Releaseplan legt Schübe heute allein nach
  Abstandsregeln. Ein Schub, der zwei Monate vor der Nachfragespitze live geht, hat
  Vorlauf; einer danach misst sich gegen eine fallende Kurve. Offen ist, ob das die
  Terminierung wirklich ändert — der Plan ist eine Betreiber-Entscheidung, keine
  Rechnung.
- **Sichtbarkeit in KI-Antworten außerhalb von Google.** Der Ratgeber-Strang zielt
  ausdrücklich auf KI-Zitate; gemessen wird davon heute nur die Quellenliste der
  Google-KI-Antwort (Schritt 6). Erwähnungen in ChatGPT, Perplexity und Gemini sehen
  wir gar nicht — das ist die einzige offene Lücke im einzigen Erfolgsmaß dieses
  Strangs. Datenqualität und Kosten sind **ungeprüft**.

**Verworfen, mit Grund:**
- **Keyword-Schwierigkeit als Zukauf** — die Kennzahl selbst ist nicht verworfen,
  sondern **im Einsatz**: Sie ist der Kern der Chancen-Bewertung in Schritt 4
  (`Volumen × (100 − KD)`). Verworfen ist nur, sie zusätzlich einzukaufen. Ihre
  Grenze bleibt: Die Zahl sieht den Absichts-Konflikt nicht („balkonkraftwerk mit
  speicher", KD niedrig, Ergebnisseite zu 80 % Shops) und ersetzt Schritt 2b nicht.
- **On-Page-Audit (120+ Kennzahlen)** — deckt der eigene Seiten-Rundgang und die
  Kohärenz-Tests ab, und zwar bei jedem Push statt monatlich.

**Backlinks — die Einordnung war zu kurz und ist am 25.08.2026 korrigiert worden.**
Erste Fassung: „verworfen, der Hebel ist die Widget-Distribution". Das stimmt als
Strategie und beantwortet die Frage trotzdem falsch, weil es zwei sehr verschiedene
Anwendungsfälle in einen Topf wirft:
- **Erfolg des Kommunen-Outreach messen** — der naheliegende Fall, und gerade dafür
  sind gekaufte Link-Daten das schlechtere Werkzeug: Auf der Gemeindeseite steht nur
  ein Einbettungsrahmen, unser „Powered by" liegt IM eingebetteten Dokument und damit
  auf unserer eigenen Domain. Ob ein Link-Index eine iframe-Quelle mitzählt, ist von
  außen nicht erkennbar. Gebaut wurde deshalb die eigene Zählung
  (`lib/embed-herkunft.ts`, Ansicht `/admin/einbettungen`): Ohne Abruf bei uns gibt es
  kein Widget — die Auskunft hatten wir ohnehin, wir haben sie nur nie aufgeschrieben.
- **Fremde Links als Zielliste** — hier liefern die Daten etwas, das wir nicht haben:
  Wer verlinkt auf den Wettbewerber mit demselben Produkt und auf die Vergleichs-
  portale? Das sind Kandidaten für die Widget-Verbreitung jenseits der Kommunen.
  **Einmalig ansehen, kein Dauerlauf** — eine Zielliste altert langsam, und ein
  monatlicher Abruf produziert Zahlen, die niemand liest.

**Termin 20.01.2027:** Der Anbieter entfernt sechs veraltete Ja/Nein-Felder an
organischen Treffern (u. a. „ist Bildtreffer", „ist Featured Snippet", „ist
AMP-Fassung"). **Wir lesen keines davon** — geprüft am 25.08.2026 über das ganze
Repo. Schritt 2b prüft auf das eigenständige Antwortbox-Element im Aufbau der
Ergebnisliste, und das bleibt. Kein Handlungsbedarf; der Eintrag steht hier, damit
die Ankündigung beim nächsten Lauf nicht noch einmal geprüft wird.
