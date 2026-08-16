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
>    Bot-Schutz (Cloudflare/JS, 403) nicht lesbar: **Eskalationsleiter fahren,
>    Stufe für Stufe, nicht abkürzen** (siehe „Bot-geblockte Quellen" unten).
>    Erst wenn auch der Browser scheitert, seriöse Sekundärquellen (co2online,
>    finanztip, regionale Presse, Solarenergie-Förderverein) — und dann klar
>    als Sekundärquelle kennzeichnen.
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

## Bot-geblockte Quellen — BLOCKER: „nicht abrufbar" ist kein Befund

Manche Träger sperren automatisierte Abrufe komplett aus (frankfurt.de liefert auf
jede Anfrage 403 — Seite **und** Richtlinien-PDF, auch mit Browser-User-Agent).
Solche Programme fallen sonst dauerhaft durch die Prüfung: Der Wächter sieht kein
Signal und meldet „keine Änderung", obwohl er in Wahrheit gar nicht nachgesehen
hat. Das ist die gefährlichste Form von Grün — Schweigen, das wie Bestätigung
aussieht.

**Eskalationsleiter, in dieser Reihenfolge:**
1. `WebFetch` auf die offizielle Seite.
2. `curl` mit Browser-User-Agent (fängt simple Filter ab).
3. Offizielles Richtlinien-/Merkblatt-PDF direkt (oft anderer Pfad, teils offen).
4. **Echter Browser** — `preview_start` mit der URL, dann `get_page_text`. Das ist
   der Handweg und die Stufe, die den 403 tatsächlich löst. Nicht überspringen,
   nur weil Stufe 1–3 gescheitert sind: genau dafür ist sie da.
5. Erst wenn auch 4 scheitert: Sekundärquellen — und Verdikt `UNREACHABLE` mit
   Vermerk, welche Stufen versucht wurden.

**Sekundärquellen reichen nicht, um „geprüft" zu behaupten.** Belegt am
Frankfurt-Lauf (26.07.2026): Suche und Aggregatoren bestätigten brav „Programm
läuft, 20 %" — die Träger-Seite selbst nannte aber einen **anderen Höchstbetrag**
(100.000 € gesamt statt der hinterlegten 50.000 €), eine **zusätzliche Bedingung**
(Speicher/Ladesäule nur zusammen mit einer neuen PV-Anlage) und einen
**Gemeinschaftsbonus** (+5 Prozentpunkte), von denen keine Sekundärquelle etwas
wusste. Wer auf Stufe 3 stehen bleibt, hält einen veralteten Eintrag für bestätigt.

**Melde-Politik:** Eine geblockte Quelle ist **kein** Grund für eine Nachricht an
den Betreiber — sie ist ein Grund, den Browser zu starten. Gemeldet wird erst,
wenn die ganze Leiter durch ist und die Tatsache trotzdem offen bleibt.

## Council bei Abweichung

Findet die Prüfung bei einem Programm eine Abweichung (Satz geändert, Topf leer,
Status anders), zuerst das **Council** laufen lassen (`scripts/council-verify.md`)
— drei unabhängige Verifizierer, einer mit Widerlegungs-Auftrag, prüfen genau
diesen einen Befund gegen. Förderung ist im Kern ein **Ermessensfall**
(Kleingedrucktes, „aktiv vs. unsicher", strukturierter Satz vs. kein Abzug) →
für alles, was den **Abzug erhöht** (Satz rauf, Deckel rauf, neuer
strukturierter Satz): kein Auto-Fix, auch bei Konsens. Den bestätigten Befund als
Vorschlag für `lib/funding-programs.ts` mailen; der Nutzer gibt frei.

**Ein Programm EINSCHALTEN ist davon zu trennen** (Wächter-Gate, Teil 4:
„Programm einschalten nach Träger-Beleg" steht in der Selbst-Ändern-Spalte, und
das Gate geht dem Runbook vor). Zulässig, wenn die Richtlinie oder die
Trägerseite selbst gelesen wurde **und** das Council 3/3 bestätigt. Beim
Statuswechsel auf `aktiv` immer mitprüfen: Zieht damit auch ein Betrag ab
(`pvPerKwp` & Co.)? Wenn ja, ist das der Teil, der Vorschlag bleibt — Status und
Abzug sind zwei Entscheidungen, nicht eine. Und: `status: "aktiv"` **veröffentlicht
die Stadtseite** (`isCityLive` in `lib/atlas-cities.ts`); das gehört in den
Bericht, weil damit eine neue indexierbare Seite live geht.

**Auto-Fix ist dagegen Pflicht, wenn beides zutrifft** (kein Ermessen, also auch
kein Council nötig):
- Die Tatsache wurde **wörtlich auf der Träger-Seite selbst** gelesen (Stufe 1–4
  der Eskalationsleiter, nicht Sekundärquelle), **und**
- die Änderung erhöht den Abzug nicht: Status auf ausgeschöpft/pausiert/
  eingestellt, Satz runter, Deckel runter, zusätzliche Bedingung, Klarstellung
  von Anzeigetext.

Beispiel Frankfurt (26.07.2026): Höchstbetrag, Speicher-Kombi-Bedingung und
Gemeinschaftsbonus direkt von frankfurt.de abgelesen → selbst gefixt, gemergt,
DB nachgezogen. Eine Nachricht an den Betreiber wäre hier reine Arbeitsverlagerung
gewesen: Es gab nichts zu entscheiden, nur etwas abzuschreiben.

## Changelog

### August 2026 (News-Wächter-Lauf 16.08.)
- **Freiburg im Breisgau** — Jahrestopf leer, wir zogen weiter ab. Die Stadt hat
  das Programm „Klimafreundlich Wohnen" am **14.07.2026** per Pressemitteilung
  gestoppt („Neue Anträge können ab sofort nicht mehr gestellt werden",
  freiburg.de/pb/2626054.html); die Programmseite nennt Baustein 3
  (Stromerzeugung) ausdrücklich mit. Council 3/3 inkl. adversarialem Prüfer.
  → `aktiv` → `ausgeschoepft`, `pvPerKwp`/`pvCap` entfernt (150 €/kWp, max.
  1.500 € wurden einen Monat lang zu Unrecht abgezogen), Grund + Stichtag als
  sichtbare Bedingung. Sätze und Richtlinie bleiben stehen: gestoppt ist das
  Geld, nicht das Programm. Die Stadtseite bleibt online — `ausgeschoepft` zählt
  als Archiv-Status, die Seite rechnet das Beispiel ohne den Zuschuss.
  - **Falle für den nächsten Lauf:** Die Einzelseiten im Service-A-Z („3.3
    Photovoltaik Dachvollbelegung", „3.5 Balkonmodul") tragen den Stopp bis
    heute **nicht** — Freigabestand 2023, Antragslink wirkt weiter aktiv. Wer
    dort nachsieht statt auf der Programmseite, hält das Programm für offen.
    Maßgeblich ist die Programmseite (jüngere Richtlinienfassung, Stopp-Kasten).
  - **Nicht automatisch wieder einschalten:** Der 01.01.2027 steht nur auf der
    Programmseite, nicht in der Pressemitteilung, und die Richtlinie schließt
    einen Rechtsanspruch aus. Vor dem Wiedereinschalten an der Trägerseite
    nachprüfen.

### August 2026 (News-Wächter-Lauf 14.08.)
- **Heidelberg** — der Eintrag stand seit Juni auf `unsicher` („zwei städtische
  Seiten widersprechen sich"). Der Widerspruch war keiner: Die Übersichtsseite
  trägt oben einen Förderstopp-Kasten, der drei **andere** Programme meint
  (Energieeffizienz Unternehmen/Vereine, Wassermanagement, Mobilität), direkt
  darunter steht „Antragstellung ab 1. Juli 2026 wieder möglich". Richtlinie 2026
  beschafft (`docs/quellen/Heidelberg_Rationelle-Energieverwendung_Richtlinie_
  ab-2026-07-01.pdf`, gilt für Anträge nach dem 30.06.2026, Gemeinderatsbeschluss
  11.06.2026). Council 3/3 inkl. adversarialem Prüfer. → `unsicher` → `aktiv`,
  fehlender **Höchstbetrag 10.000 € je Objekt** ergänzt (der stand bei uns
  nirgends), Leistungsgrenzen (Dach bis 100 kWp, Fassade bis 50 kWp), PV-Pflicht-
  Abzug, 15-Jahre-Betriebsbindung, Bagatellgrenze 150 € und der Haushaltsvorbehalt
  ergänzt. **Bewusst weiter ohne `pvPerKwp`**: Der Zuschuss hängt am Anlagenteil
  über der PV-Pflicht BW, und der Topf (250.000 € Nachtragshaushalt 2026) ist mit
  dem Starkregen-Programm geteilt, kein Rechtsanspruch — ein automatisch
  abgezogener Betrag wäre ein Geldversprechen, das die Richtlinie so nicht gibt.
  Nebenwirkung, gewollt: Die Stadtseite Heidelberg geht damit live.
- **Bad Homburg** — bleibt `unsicher`. Die Trägerseite nennt die Richtlinie vom
  17.08.2022 weiter als „aktuell gültig" und bittet um Anträge; die Sätze
  (300 €/kWp, max. 6.000 €; Speicher 300 €/kWh, max. 3.000 €) sind an der
  Richtlinie zellgleich bestätigt. **Offen bleibt allein die Haushaltsfrage** —
  ob die Mittel 2026 noch reichen, sagt keine öffentliche Quelle. Nächster Lauf:
  bei der Energieberatung (energieberatung@bad-homburg.de, Telefon im Impressum)
  nachfassen oder eine Haushaltsvorlage der Stadt suchen; nicht auf Aggregatoren
  stützen, deren „ausgeschöpft" stammt aus 2023.

### Juli 2026 (Handprüfung Frankfurt, News-Wächter-Lauf 26.07.)
- **Frankfurt Klimabonus** — DISCREPANCY, per Browser direkt an der Träger-Seite
  abgelesen (WebFetch/curl/PDF alle 403). Sätze bestätigt (PV 20 %, Solar-Gründach
  30 %, Speicher/Ladesäule 20 %, Mini-PV seit 03.06.2025 leer). Korrigiert:
  Höchstbetrag „50.000 € je Maßnahmenbereich" → „100.000 €" (Wortlaut der
  Trägerseite: „Die maximale Fördersumme beträgt 100 000 Euro"; die
  Bereichs-Aufteilung stand nur bei Aggregatoren und ist raus). Bedingung „Speicher und Ladesäulen nur mit neuer PV-Anlage" ergänzt (fehlte);
  Gemeinschaftsbonus +5 Prozentpunkte ergänzt; „Wallbox" → „Ladesäule",
  „Dachbegrünung" → „Solar-Gründach" (Wortlaut der Richtlinie).
  Rechenwirkung: keine — `percentOfCost: 0.2` unverändert, der Deckel greift bei
  PV-Kosten erst jenseits von 250.000 €.

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
