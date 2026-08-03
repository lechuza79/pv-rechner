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

**Nicht tun:** Titles/Content „schnell mitfixen" (Außenwirkung → Session mit
Abnahme) · Rankings aus Impressionen ableiten · KD/Volumen aus dem Gedächtnis
statt aus der API · Shortlists über 5 Einträge (verwässert die Entscheidung).
