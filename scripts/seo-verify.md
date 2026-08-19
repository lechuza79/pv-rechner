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

Ein hohes Suchvolumen in `ranked_keywords` ist **kein** Chancensignal. Vor jeder
Empfehlung für einen Begriff aus der Quick-Win-Zone:

`POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced`
Body `[{"keyword":…,"location_code":2276,"language_code":"de","depth":10}]` (0,002 $;
**nur ein Task je Aufruf**, sonst „You can set only one task at a time"). Auswerten:

1. **Steht `ai_overview` oder `featured_snippet` im `items`-Aufbau?** Dann fängt Google
   die Klicks ab — eine erklärende Seite dort zu verbessern, bringt Einblendungen und
   keine Besucher. Nicht als Chance melden.
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
