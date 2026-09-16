# Förder-Verifikation — Runbook (täglich und quartalsweise)

**Zweck:** Die Förderdaten in `lib/funding-programs.ts` gegen die offiziellen
Quellen prüfen, ohne dass jemand sie von Hand durchgeht. Förderprogramme ändern
Sätze und Budgets unterjährig — ein falscher €/kWp-Satz oder ein „aktiv", obwohl
der Topf leer ist, verfälscht die Beispielrechnungen und den Rechner.

**Kein klassischer Scraper:** Offizielle Stadt-/Landesseiten sind oft
Cloudflare-/JS-gesperrt und jede Stadt nutzt ein anderes Format. Deshalb
**Agent-Extraktion**: ein Recherche-Agent pro Programm liest die offizielle
Quelle (oder, wenn gesperrt, das Richtlinien-PDF / seriöse Sekundärquellen),
extrahiert Satz + Status und hält sie gegen den hinterlegten Wert.

**Gemeinsamer Ablauf:** `scripts/funding-daily-review.md` verbindet den bestehenden Tageswächter mit neuen Quellen, Rückfragen, Antworten und Live-Prüfung. Das Wächter-Gate bleibt maßgeblich; es entsteht kein weiterer geplanter Auftrag.

## Schritt 0: Der Arbeitsvorrat — BLOCKER, vor jedem anderen Schritt

```bash
npm run foerder:probe -- --vorrat
```

Das ist die Liste, mit der der Lauf **beginnt**, und zwar von oben. Sie steht in
dieser Reihenfolge: erst die Programme, an denen wir hängen (Fehlversuche), dann
die am längsten nicht an der Amtsquelle geprüften.

**Warum das der erste Schritt ist (16.08.2026):** Vorher stand in den Aufträgen
„merke dir, welche Programme du nur sekundär belegen konntest, und arbeite sie in
den Folgeläufen per Browser ab". Kein Lauf konnte das befolgen — jede Sitzung
fängt bei null an. Also fiel jeder dauerhaft geblockte Träger stillschweigend
hinten runter, während sein Prüfdatum auf der Seite alterte, ohne dass etwas
anschlug. Das Gedächtnis steht jetzt in der Datenbank (`funding_checks`,
Leseseite `lib/funding-verify-state.ts`), nicht im Kopf des Laufs.

**Jeder Versuch wird protokolliert, auch der gescheiterte** — sonst ist der
Vorrat beim nächsten Mal wieder leer:

```bash
npm run foerder:probe -- --ok <id> --wie traeger --url <url> --zitat "<Beleg>"
npm run foerder:probe -- --fehl <id> --wie pruefseite
```

Fünf Ausgänge, und **nur `traeger` zählt als geprüft**: `traeger` (Amtsseite
selbst gelesen — Abruf, PDF oder echter Browser) · `archiv` (nur der
Archiv-Stand) · `sekundaer` (nur Dritte) · `pruefseite` (auf der Bot-Prüfung
hängengeblieben) · `gesperrt` (auf allen Wegen zu). Nur `traeger` setzt das
Datum, das auf den Seiten als „Zuletzt geprüft" steht.

**Ein Massen-Befund im Vorrat ist zuerst ein Verdacht gegen uns — BLOCKER
(19.08.2026).** Stehen an einem Tag zehn, zwanzig, dreißig Programme mit „Amtsseite
hat sich geändert" da, dann haben nicht dreißig Städte gleichzeitig ihre Seite
umgebaut. Genau das ist am 18.08.2026 passiert: `fingerprintOf` bekam den
Token-Filter gegen die verwürfelten Kontaktadressen, und weil sich damit für
**jede** Seite ein anderer Abdruck ergab, verbuchte der Lauf 15 Programme als
geändert, startete die 14-Tage-Nachprüffrist und hätte sie am 02.09.2026 aus der
Rechnung fallen lassen — ohne dass sich irgendwo etwas geändert hätte.

Der Abdruck trägt seit dem 19.08.2026 deshalb **Abrufweg und Verfahrensfassung**
(`live-v2:…`), und `vergleichbar()` lässt nur Gleiches gegen Gleiches antreten;
eine Fassungsänderung erscheint als „nicht vergleichbar", nie als „geändert". Wer
`fingerprintOf` anfasst, **zählt `FINGERPRINT_VERSION` hoch** — sonst kommt genau
dieser Fehlalarm zurück. Der erste Lauf nach einer solchen Änderung meldet einmalig
alle Seiten als nicht vergleichbar; das ist richtig so und kostet nichts, weil es
weder eine Frist startet noch eine Bestätigung vortäuscht.

Und beim Aufräumen: Ein zu Unrecht gesetztes Änderungsdatum wird **nicht in der
Datenbank weggewischt**, sondern auf dem normalen Weg aufgelöst — Amtsseite lesen,
`--ok … --wie traeger` protokollieren. Das ist derselbe Beleg, den das
Wiedereinschalten eines Programms braucht, und er ist ohnehin fällig.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Förder-Prüfung."** Er liest dieses Runbook,
arbeitet den Vorrat aus Schritt 0 von oben ab, spawnt **einen Agenten pro
Programm** in `lib/funding-programs.ts` (Level ≠ `bund` — die zwei
Bundesprogramme sind stabil) und arbeitet die Ergebnisse ab.

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
- **UNREACHABLE / CONFIDENCE low:** Fehlversuch protokollieren und beim nächsten Lauf fortsetzen; ein einzelner Abruffehler ändert weder Prüfdatum noch Status. Nach drei fehlgeschlagenen Läufen greift die dokumentierte Eskalation. Ein bestätigter inhaltlicher Fehler ist gesondert zu korrigieren.

**Wichtig:** Nur `status: "aktiv"` UND ein strukturierter Satz
(`pvPerKwp`/`pvTiers`/`speicherPerKwh`/`speicherTiers`/`percentOfCost`) führen
zu einem automatisch abgezogenen Betrag (siehe `fundingAmount`/`stackFunding`).
Im Zweifel lieber keinen Betrag zeigen als einen falschen.

**Der Resync kommt NACH dem Deploy, nie davor — BLOCKER (19.08.2026).** Die
Route `/api/funding/setup?resync=1` schreibt den Katalog aus dem **ausgelieferten**
Code in die Datenbank. Wer sie direkt nach dem Push aufruft, spiegelt den ALTEN
Stand und bekommt trotzdem `"success": true` zurück — der einzige Hinweis ist die
unscheinbare Zeile `history: skipped, keine Änderung gegenüber dem Bestand`. Genau
das ist an diesem Tag zweimal passiert.

Zuerst den exakten Commit und den Zustand der Produktivveröffentlichung über die Deployment-Metadaten prüfen. Erst danach resyncen und die öffentliche API sowie sichtbare Seiten kontrollieren. Die Förder-API liest die Datenbank: Vor dem Resync kann sie den neuen Code-Seed nicht nachweisen. Quellengebundene Einzelprüfung über `foerder:probe -- --ok … --wie traeger --url … --zitat …`; kein datumsgestütztes Massenstempeln.

**Und rechne damit, dass der Deploy gar nicht läuft.** Der „Ignored Build Step"
vergleicht nur `HEAD^..HEAD`. Bei einem **Merge-Commit** ist das der Vergleich
gegen den ersten Elternteil — bringt der Merge nur eine `.md`-Datei mit, während
auf dem gemergten Zweig echte `.ts`-Änderungen liegen, wird der Build
übersprungen und die Änderungen liegen auf `main`, ohne live zu sein. Am
19.08.2026 waren so vier Deployments hintereinander abgebrochen (erkennbar am
`errorLink` auf „ignored-build-step"). Das heilt sich mit dem nächsten Push, der
Code anfasst; wer nicht warten will, prüft die Deployments und stößt neu an.

## Automatisierung: vorhandene Aufgaben, gemeinsamer Ablauf

Der **bestehende tägliche** `foerder-news-waechter` bearbeitet bekannte Programme, neue Quellen und eingegangene Förderantworten nach `scripts/funding-daily-review.md`. Er belässt es nicht bei Suchtreffern oder Verdachtsmeldungen. Die bestehende Quartalsprüfung bleibt die Vollprüfung und nutzt dieselben Schutzregeln; parallele Änderungen werden vorab über Sessions und Git abgeglichen.

Die technischen GitHub-Läufe für Quellensuche, geregelten Anfrageversand und Postfachrücklauf bleiben bestehen. Sie sind unterschiedliche Stufen, keine konkurrierenden fachlichen Wächter. Die zusätzliche Codex-Nachkontrolle bleibt deaktiviert. Keine neue Zeitplanung einrichten.

## Die Namensfalle: „ausgelaufen" steht auf derselben Seite wie „läuft"

**Köln, 19.08.2026.** Eine zusammenfassende Abfrage der Programmseite meldete
„Seit 27. August 2024 nehmen wir in diesem Programm keine neuen Anträge an" — das
klang nach dem Freiburger Fall und wäre beinahe ein Abschalten geworden. Im
Rohtext gelesen steht der Satz aber unter der Zwischenüberschrift **„Ausgelaufene
Förderprogramme"** und gilt dem Vorgänger. Die Namen unterscheiden sich um zwei
Wörter:

| läuft | ausgelaufen (seit 27.08.2024) |
|---|---|
| Photovoltaik – klimafreundliches Wohnen **in Köln** | Photovoltaik – klimafreundliches Wohnen |
| Photovoltaik – klimafreundliches Arbeiten **in Köln** | Photovoltaik – klimafreundliches Arbeiten |

Daraus zwei Regeln:

1. **Ein Stopp-Satz wird im Rohtext mit seiner Überschrift gelesen**, nie aus einer
   Zusammenfassung übernommen. Eine Zusammenfassung kennt die Gliederung der Seite
   nicht und greift den prominentesten Satz — hier den falschen. Das gilt in beide
   Richtungen: In Freiburg trugen die Unterseiten den Stopp *nicht*, in Köln trug
   die Seite einen Stopp, der ein anderes Programm meinte.
2. **Der Beleg kommt von der Programm-Unterseite, nicht von der Übersicht.** Sie
   ist die Seite, die „Zum Förderprogramm" verlinkt, und dort standen die Sätze
   vollständig (PV 1.500/2.000/2.300/2.500 € nach Leistungsspanne, Speicher
   500/1.000/1.300 € — deckungsgleich mit unserem Eintrag) plus ein eigener,
   deutlich höherer Satz für gemeinnützige Vereine, den wir bewusst nicht führen.

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
   Datum** setzen — über `npm run foerder:probe -- --ok <id> --wie traeger …`
   mit Original-URL und Zitat (protokolliert den Versuch mit); kein datumsgestütztes Massenstempeln.
   Dieses Datum wird auf den Seiten als „Zuletzt geprüft: …" angezeigt — es ist
   das Vertrauenssignal und muss echt sein.
   **`updated_at` ist KEIN Ersatz** (korrigiert 16.08.2026): Der Lader zog früher
   `last_verified ?? updated_at` heran, also ersatzweise den Zeitpunkt der letzten
   Schreibung. Damit trugen 19 der 38 Programme ein „Zuletzt geprüft"-Datum für
   eine Prüfung, die nie stattgefunden hat — und jeder Resync frischte es auf.
   Ohne echtes Prüfdatum steht jetzt der redaktionelle `stand` da.
   Das ist die Förder-Ausprägung von **Gate-Regel 9**: Bestätigung ohne Änderung
   ist der Normalfall und setzt das Datum trotzdem — ein gescheiterter Abruf
   nie.
3. **Konservativ im Zweifel:** Ein einzelner Abruffehler wird protokolliert, nicht als Programmende interpretiert. Für drei fehlgeschlagene Läufe gilt die Eskalation unten. Ein neuer oder inhaltlich ungeklärter Befund darf kein ungesichertes „aktiv“ oder einen neuen Abzug erzeugen.
4. Jahreswechsel ist der kritischste Drift-Punkt (Töpfe öffnen am 1.1., laufen
   mitten im Jahr leer) → Anfang Januar zusätzlich voll prüfen; der tägliche
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
   → protokollieren als `--ok … --wie traeger`, wenn die Seite kommt.
5. **Archiv der Amtsseite** — `https://web.archive.org/web/2026/<url>`. Das ist
   der Wortlaut des Trägers selbst, nur datiert; qualitativ etwas anderes als ein
   Vergleichsportal. → `--fehl … --wie archiv`.
6. Erst wenn auch das scheitert: Sekundärquellen — Verdikt `UNREACHABLE`, Vermerk,
   welche Stufen versucht wurden. → `--fehl … --wie sekundaer|pruefseite|gesperrt`.

**Das Archiv belegt den INHALT, nicht die AKTUALITÄT — BLOCKER.** Eine Förderung,
die im Juli lief, kann im September gestoppt sein. Ein Archiv-Treffer setzt das
Prüfdatum deshalb NICHT zurück (erzwungen von `lib/__tests__/funding-verify-state.test.ts`);
er darf die Werte stützen, aber nie ein „aktiv" tragen.

**Was ein Wächter NICHT tut: das Häkchen setzen.** Gemessen am 16.08.2026 an
frankfurt.de — direkter Abruf 403; der skriptgesteuerte Browser (dasselbe
Chromium, das die Seitentests fährt) landet auf der Cloudflare-Prüfseite,
unsichtbar **und** sichtbar gestartet, und sie löst sich auch nach einer halben
Minute nicht auf; im echten Chrome des Betreibers erschien zeitweise
„Bestätigen Sie, dass Sie ein Mensch sind". Eine Mensch-Prüfung für eine Maschine
wegzuklicken oder mit Tarnwerkzeugen zu umgehen, ist die eine Grenze, an der auch
ein Wächter anhält — und wäre obendrein brüchig: Jede Änderung auf deren Seite
legt es lahm, und dann meldet ein stillstehender Wächter weiter Grün.

**Es ist keine Mauer, sondern eine Laune.** Derselbe echte Browser hat dieselbe
Seite eine Stunde später ohne jede Prüfung vollständig geliefert. Ein einzelner
Versuch ist Glückssache, über mehrere Läufe kommt man durch — genau dafür gibt es
den Arbeitsvorrat aus Schritt 0.

**Nach drei Läufen ohne Amtsquelle: sichere Richtung + Entscheidung.** Der Vorrat
weist das Programm dann als ESKALATION aus. Dann `status` im Seed auf `unsicher`
(kein Abzug mehr in der Rechnung, bleibt mit Hinweis sichtbar) — das darf der
Wächter selbst; Wiedereinschalten nur nach aktuellem Träger-Beleg und dem
Verfahren im Abschnitt „Council bei Abweichung“ — **und** die ausgegebene Entscheidungszeile
als `decisions`-Eintrag melden. Erst drei, nicht einer: Die Prüfseite ist eine
Laune; beim ersten Fehlversuch abzuschalten nähme Förderungen weg, die es gibt.

**Letzte Stufe: bestehender Anfrageprozess.** `foerder-anfragen.yml` verschickt die bereits beauftragten Sachfragen zu katalogisierten Programmen nach drei protokollierten Fehlversuchen. Der Tageswächter dokumentiert Versuche und liest `foerder:anfrage -- --liste` und `--antworten`; er startet keinen zweiten Versand. Die Schutzregeln für Rollenpostfach, Abstand zum Outreach, Bürozeit, Mengenbegrenzung und kein Nachfassen bleiben erhalten. Inhaltliche Widersprüche sowie nicht katalogisierte Neufunde werden nicht automatisch von dieser Auswahl erfasst; dafür gelten der vorhandene geprüfte Einzelfall-/Entscheidungsweg und ein dauerhafter offener Quellenbefund. Siehe `scripts/funding-daily-review.md`.

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
für eine Erhöhung **bereits geführter Abzüge** (Satz rauf, Deckel rauf, neuer
strukturierter Satz in einem vorhandenen Programm): kein Auto-Fix, auch bei Konsens.
Diesen bestätigten Erhöhungsbefund als Vorschlag für `lib/funding-programs.ts`
mailen; der Nutzer gibt frei. Die belegte Neuaufnahme eines Programms folgt
dagegen der besonderen Aufnahmebefugnis im Wächter-Gate und dem gemeinsamen Tagesverfahren.

**Ein Programm EINSCHALTEN ist davon zu trennen** (Wächter-Gate, Teil 4:
„Programm einschalten nach Träger-Beleg" steht in der Selbst-Ändern-Spalte, und
das Gate geht dem Runbook vor). Zulässig, wenn die Richtlinie oder die
Trägerseite selbst gelesen wurde **und** das Council 3/3 bestätigt. Beim
Statuswechsel auf `aktiv` immer mitprüfen: Zieht damit auch ein Betrag ab
(`pvPerKwp` & Co.)? Wenn ja, ist das der Teil, der Vorschlag bleibt — Status und
Abzug sind zwei Entscheidungen, nicht eine. Und: `status: "aktiv"` **veröffentlicht
die Stadtseite** (`isCityLive` in `lib/atlas-cities.ts`); das gehört in den
Bericht, weil damit eine neue indexierbare Seite live geht.

**Auto-Fix ist dagegen Pflicht, wenn beides zutrifft** (Gegenprüfung nach dem gemeinsamen Tagesverfahren bleibt erforderlich):
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
