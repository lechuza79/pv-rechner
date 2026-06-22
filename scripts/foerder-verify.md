# Förder-Verifikation — Runbook (quartalsweise)

**Zweck:** Die Förderdaten in `lib/funding-programs.ts` gegen die offiziellen
Quellen prüfen, ohne dass jemand sie von Hand durchgeht. Förderprogramme ändern
Sätze und Budgets unterjährig — ein falscher €/kWp-Satz oder ein „aktiv", obwohl
der Topf leer ist, verfälscht die Beispielrechnungen und den Rechner.

**Kein klassischer Scraper:** Offizielle Stadt-/Landesseiten sind oft
Cloudflare-/JS-gesperrt und jede Stadt nutzt ein anderes Format. Deshalb
**Agent-Extraktion**: ein Recherche-Agent pro Programm liest die offizielle
Quelle (oder, wenn gesperrt, das Richtlinien-PDF / seriöse Sekundärquellen),
extrahiert Satz + Status und hält sie gegen den hinterlegten Wert.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Förder-Prüfung."** Er liest dieses Runbook,
spawnt **einen Agenten pro Programm** in `lib/funding-programs.ts` (Level
≠ `bund` — die zwei Bundesprogramme sind stabil) und arbeitet die Ergebnisse ab.

Pro Agent mitgeben: `name`, `traeger`, `region`, hinterlegte `url`, hinterlegter
`status` und die hinterlegten Beträge (`rates` + strukturierte Felder
`pvPerKwp`/`pvSockel`/`pvCap`/`speicherPerKwh`/`speicherCap`/`speicherMin`/
`pvTiers`/`speicherTiers`/`percentOfCost`).

## Agent-Prompt (Vorlage)

> Du bist Förder-Verifizierer für PV-/Speicher-Zuschüsse in Deutschland. Prüfe
> EIN Förderprogramm gegen die OFFIZIELLE Quelle. Heute ist {DATUM}.
>
> Vorgehen:
> 1. WebSearch + WebFetch. Primärquelle = offizielle Seite. Wenn durch
>    Bot-Schutz (Cloudflare/JS, 403) nicht lesbar: offizielles Richtlinien-PDF,
>    Google-Cache oder seriöse Sekundärquellen (co2online, finanztip, regionale
>    Presse, Solarenergie-Förderverein) — Sekundärquellen klar kennzeichnen.
> 2. Ermittle AKTUELL: Nimmt das Programm gerade Anträge an?
>    (aktiv / ausgeschoepft / pausiert / eingestellt) und die konkreten Beträge.
> 3. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück (keine Einleitung):
> ```
> VERDICT: MATCH | DISCREPANCY | UNREACHABLE
> STATUS: <gefunden> (hinterlegt: <X>) — stimmt/abweichung
> BETRÄGE: <pro Position: stimmt / ABWEICHUNG stored=… gefunden=…>
> KORREKTUR: <konkrete Felder die geändert werden müssen, oder "keine">
> QUELLE: <URL(s)>; Zitat: "<max 15 Wörter>"
> SEKUNDÄR: ja/nein
> CONFIDENCE: high|medium|low
> NOTIZ: <1 Satz>
> ```
> Erfinde nichts. Unklar → CONFIDENCE low.
>
> PROGRAMM: {name}, {traeger}, {region}
> Offizielle URL (hinterlegt): {url}
> Hinterlegter Status: {status}
> Hinterlegte Beträge: {rates + strukturierte Felder}

Programm-spezifische Schärfung mitgeben, wo es einen bekannten Stolperstein
gibt (z. B. „fördert die Stadt die Module oder nur Begleitmaßnahmen?",
„Topf schon leer?", „gibt es einen Höchstbetrag, der die Prozent-Rechnung
deckelt?").

## Ergebnisse abarbeiten

- **MATCH (high/medium):** nichts tun. Optional `stand` aktualisieren.
- **DISCREPANCY:** Betrag/Status in `lib/funding-programs.ts` korrigieren.
  - Satz/Cap stimmt nicht → strukturierte Felder anpassen.
  - Programm nimmt keine Anträge an → `status` auf `ausgeschoepft`/`pausiert`/
    `unsicher` setzen (nur `status: "aktiv"` wird in der Berechnung abgezogen).
  - Betrag durch keine Quelle gedeckt → strukturierte Felder entfernen (Programm
    wird dann „nicht pauschal berechenbar" mit ehrlichem Hinweis) und
    `verified: false`.
  - Jede inhaltliche Korrektur mit einem **Regressionstest** in
    `lib/__tests__/funding-data.test.ts` festschreiben.
- **UNREACHABLE / CONFIDENCE low:** `verified: false` lassen/setzen, `status`
  auf `unsicher`, im Changelog unten notieren, beim nächsten Lauf erneut prüfen.

**Wichtig:** Nur `status: "aktiv"` UND ein strukturierter Satz
(`pvPerKwp`/`pvTiers`/`speicherPerKwh`/`speicherTiers`/`percentOfCost`) führen
zu einem automatisch abgezogenen Betrag (siehe `fundingAmount`/`stackFunding`).
Im Zweifel lieber keinen Betrag zeigen als einen falschen.

## Automatisierung: zwei geplante Tasks

Beide laufen über die App (scheduled-tasks, „läuft solange die App offen ist" —
für Förderdaten ausreichend). Sie werden **nach dem Merge** scharf geschaltet,
weil sie die Programmliste aus diesem Repo (main) lesen.

**1. News-Wächter — wöchentlich (billig, stößt nur an).** Cron z. B. `47 6 * * 1`
(Montag früh). Prompt-Kern:

> Lies `lib/funding-programs.ts` für die aktuelle Programmliste (Level ≠ bund).
> Mach **wenige, breite** Web-Suchen (nicht eine pro Programm) nach Signalen, dass
> sich etwas geändert hat — z. B. „[Stadt] Photovoltaik Förderung 2026 ausgeschöpft
> / gestoppt / neu / geändert". Melde nur **Verdachtsfälle** mit Quelle + einem
> Satz. Für jeden Verdachtsfall: Empfehlung „volle Prüfung für Programm X" (das ist
> dann Task 2 für genau dieses eine Programm). Keine Datenänderung, nur Bericht.

Begründung Cadence: Förderbudgets ändern sich nicht täglich; wöchentlich fängt
„Topf leer" innerhalb von Tagen und ist deutlich billiger als täglich. (Täglich
ist möglich — bei Bedarf Cron umstellen.)

**2. Voll-Prüfung — quartalsweise.** Cron z. B. `23 4 1 */3 *` (alle 3 Monate),
zusätzlich sinnvoll Anfang Januar (neue Jahres-Budgets). Prompt-Kern:

> Führe die Förder-Prüfung gemäß `scripts/foerder-verify.md` aus (ein Agent pro
> Programm), melde die Abweichungs-Liste. Bei klaren Befunden Korrekturen
> vorschlagen, nicht automatisch in die Live-Daten schreiben.

## Status-Verlässlichkeit (aktiv/inaktiv) — BLOCKER

Leitprinzip (User, Juni 2026): **„Am besten immer alles zeigen — aber aktiv/inaktiv
muss zuverlässig sein."** Wir verstecken keine Region wegen fehlender/abgelaufener
Förderung (die Seite trägt sich über MaStR-Bestand + ehrlichen Status). Der
`status` ist aber sicherheitskritisch: nur `status: "aktiv"` wird im Rechner
abgezogen und löst den „Mit Förderung rechnen"-CTA aus. Ein falsches „aktiv"
führt zu falscher Amortisation und vergeblichen Anträgen.

Regeln, die jeder Voll-Lauf erzwingt:
1. **Jedes** Programm (Level ≠ bund) bekommt sein `status`-Feld erneut gegen die
   offizielle Quelle bestätigt — nicht nur die Verdachtsfälle.
2. Nach Bestätigung/Korrektur die Beleg-Spalte **`last_verified` auf das heutige
   Datum** setzen (DB; über `/api/funding/setup?resync=1` landet `updated_at` als
   Fallback, der Wächter schreibt `last_verified` gezielt). Dieses Datum wird auf
   den Seiten als „Zuletzt geprüft: …" angezeigt — es ist das Vertrauenssignal und
   muss echt sein.
3. **Konservativ im Zweifel:** Quelle nicht erreichbar / widersprüchlich / Topf-Stand
   unklar → NICHT „aktiv", sondern `unsicher` (kein Abzug). Lieber eine echte
   Förderung als „unsicher" zeigen als eine tote als „aktiv".
4. Jahreswechsel ist der kritischste Drift-Punkt (Töpfe öffnen am 1.1., laufen
   mitten im Jahr leer) → Anfang Januar zusätzlich voll prüfen; der wöchentliche
   News-Wächter fängt „leer/neu" dazwischen ab.

Je mehr Regionen im Katalog (aktuell ~110 Städte + 4 Kreise), desto wichtiger,
dass der Voll-Lauf wirklich jedes Programm abdeckt — die Reichweite skaliert nur,
wenn der Status verlässlich bleibt.

## Council bei Abweichung

Findet die Prüfung bei einem Programm eine Abweichung (Satz geändert, Topf leer,
Status anders), zuerst das **Council** laufen lassen (`scripts/council-verify.md`)
— drei unabhängige Verifizierer, einer mit Widerlegungs-Auftrag, prüfen genau
diesen einen Befund gegen. Förderung ist ein **Ermessensfall** (Kleingedrucktes,
„aktiv vs. unsicher", strukturierter Satz vs. kein Abzug) → **kein Auto-Fix, auch
bei Konsens**. Den vom Council bestätigten Befund als Vorschlag für
`lib/funding-programs.ts` mailen; der Nutzer gibt frei.

## Changelog

### Juni 2026 (erster Lauf, 13 Programme)
- **Würzburg** — DISCREPANCY: fördert doch Standard-Dach-PV (150 €/kWp, max.
  1.500 €) → von „nicht berechenbar" auf `pvPerKwp:150, pvCap:1500` korrigiert.
- **Bad Homburg** — Beträge korrekt (Richtlinie 2022), aber Mittel laut mehreren
  Quellen ausgeschöpft → `status: "aktiv" → "unsicher"`; Caps (6.000/3.000 €)
  ergänzt (fehlten).
- **Stuttgart** — Regeln zum Mai 2026 umgestellt, Speichersatz (100 €/kWh,
  Cap 15.000 €) durch keine Quelle gedeckt → strukturierte Speicherfelder
  entfernt, `verified: false`.
- 10 Programme bestätigt (Berlin, Karlsruhe, Regensburg, Frankfurt, Darmstadt,
  Köln, Düsseldorf, Hannover, Bonn, Göttingen).
- **Beobachten:** Karlsruhe + Bonn (Neustart 2027), Düsseldorf (in Überarbeitung).
