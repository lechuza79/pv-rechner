# EEG-Einspeisevergütung — Runbook (halbjährlich, Ende Januar + Ende Juli)

**Zweck:** Die Einspeisevergütungssätze in `lib/feedin-config.ts`
(`DEFAULT_FEED_IN`) gegen die offiziell bekanntgegebenen EEG-Sätze prüfen. Die
Vergütung fließt direkt in die PV-Wirtschaftlichkeit ein (eingespeister Strom ×
Satz). Ein veralteter Satz verfälscht Amortisation und Rendite.

**Warum halbjährlich Ende Jan / Ende Juli:** Die Sätze für neu in Betrieb
genommene Anlagen sinken seit 2024 **planmäßig um 1 % je Halbjahr**, jeweils zum
**1. Februar** und **1. August**. Die Bundesnetzagentur gibt die neuen Sätze
kurz vorher bekannt. Genau dann ist der hinterlegte Wert fällig.

**Wichtig:** Die Supabase-Tabelle `feed_in_rates` ist NICHT angelegt — die
Config ist die einzige Quelle. Daher wird hier **die Datei** aktualisiert (per
Commit), nicht die DB.

## Die Config ist ein Stichtags-Plan, kein einzelner Wert

`FEED_IN_SCHEDULE` in `lib/feedin-config.ts` hält die Halbjahre nebeneinander;
`feedInRatesFor(date)` wählt das am Stichtag geltende aus. **Ein neues Halbjahr
wird angehängt, nicht überschrieben.** Das ist der Grund, warum diese Prüfung
schon Ende Januar/Juli laufen darf, obwohl die Sätze erst am 1.2./1.8. greifen:
Bis zum Stichtag rechnet die Seite weiter mit dem alten Satz, danach von selbst
mit dem neuen — auch ohne Deploy an diesem Tag (`/api/feedin` wertet den Plan
pro Anfrage aus). Alte Halbjahre bleiben stehen; sie kosten nichts und machen
die Reihe nachvollziehbar.

## Rechenregel (nicht schätzen, nicht fortschreiben)

```
anzulegender Wert  = Basiswert × 0,99^n, kaufmännisch auf 2 Nachkommastellen
Einspeisevergütung = anzulegender Wert − 0,40 ct/kWh      (§ 53 Abs. 1 EEG)
Basiswerte (§ 48 Abs. 2/2a EEG 2023, Gebäude):
  Teileinspeisung 8,60 (≤10 kWp) / 7,50 (≤40 kWp)
  Volleinspeisung 13,40 (≤10 kWp) / 11,30 (≤40 kWp)
n = Halbjahresschritte seit 01.02.2024 (n = 1 für 02/2024)
```

**Die Falle:** § 49 Abs. 1 Satz 2 verlangt, den **ungerundeten** Wert
fortzuschreiben. Wer stattdessen den bereits gerundeten *Vergütungssatz*
degressiert (`10,35 × 0,99`), verfehlt 11 der amtlich veröffentlichten Zellen —
genau daraus entsteht das in Ratgeberportalen kursierende 10,25 statt 10,24 für
Volleinspeisung ≤40 kWp ab 08/2026. Sekundärquellen rechnen überwiegend so;
sie taugen deshalb zur Plausibilisierung, nie als Beleg.
`lib/__tests__/feedin-config.test.ts` rechnet die Kette unabhängig nach und
hält sie gegen jedes veröffentlichte Halbjahr — **dieser Test wird nie
aufgeweicht, damit ein Wert durchgeht** (Wächter-Gate, Regel 7).

## Wenn die Bundesnetzagentur noch nicht veröffentlicht hat

Die Behörde stellt die Sätze erfahrungsgemäß erst kurz vor dem Stichtag online,
oft nach diesem Prüftermin. Ihre Liste ist **nur nachrichtlich** — die Absenkung
tritt nach § 49 Abs. 1 EEG kraft Gesetzes ein, es gibt keinen Verwaltungsakt und
keine Veröffentlichungspflicht (bestätigt von der Clearingstelle EEG|KWKG). Der
abgeleitete Wert ist damit belastbar, aber er ist **unsere** Rechnung:

- `source` nennt die Bundesnetzagentur dann **nicht** als Urheberin, sondern
  „Eigene Berechnung nach §§ 48, 49 Abs. 1, 53 Abs. 1 EEG 2023".
- `note` trägt den sichtbaren Herkunfts-Vorbehalt (erscheint auf `/datenstand`).
- Der Geltungszeitraum wird als „ab TT.MM.JJJJ" angegeben, **nicht** bis zum
  Ende des Halbjahres — das Halbjahresende zu behaupten unterstellt, dass das
  Gesetz bis dahin unverändert bleibt.
- **Nachlauf-Prüfung** (scheduled task `eeg-bnetza-veroeffentlichung-nachlauf`):
  läuft bis zur Veröffentlichung und gleicht dann ab. Stimmen die Werte überein
  → `source` auf die amtliche Zuschreibung zurückstellen, `note` entfernen.
  **Weichen sie ab → melden statt überschreiben.**

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die EEG-Prüfung."** Er liest dieses Runbook und
spawnt einen Recherche-Agenten.

## Agent-Prompt (Vorlage)

> Du prüfst die deutschen EEG-Einspeisevergütungssätze für neu in Betrieb
> genommene PV-Anlagen. Heute ist {DATUM}.
>
> Hinterlegt in lib/feedin-config.ts: Teileinspeisung ≤10 kWp = {teilUnder10},
> >10 kWp = {teilOver10}; Volleinspeisung ≤10 kWp = {vollUnder10}, >10 kWp =
> {vollOver10}; gültig ab {validFrom}.
>
> Vorgehen (WebSearch + WebFetch):
> 1. Ermittle die AKTUELL gültigen Sätze (ct/kWh) für den laufenden Halbjahres-
>    Zeitraum. Primärquelle: Bundesnetzagentur (Veröffentlichung der
>    Vergütungssätze nach §§ 48/49 EEG). Sekundär: Finanztip, Verbraucherzentrale,
>    energie-experten.org — klar kennzeichnen.
> 2. Achte auf den Stichtag (1.2. bzw. 1.8.) und ggf. eine EEG-Reform, die die
>    Logik ändert (z. B. CfD/„Direktvermarktung", Wegfall der Vergütung bei
>    negativen Preisen).
> 3. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> TEIL_<=10 / TEIL_>10: <ct/kWh> (hinterlegt: <…>)
> VOLL_<=10 / VOLL_>10: <ct/kWh> (hinterlegt: <…>)
> GUELTIG_AB: <Datum>
> REFORM-HINWEIS: <falls Logikänderung absehbar, sonst „keine">
> QUELLEN: <URLs, Bundesnetzagentur zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung`:** zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`) — drei unabhängige Verifizierer prüfen die neuen
  Sätze gegen, einer mit Widerlegungs-Auftrag. EEG ist der mechanische Fall:
  **bei Konsens den Fix automatisch ausführen** — `DEFAULT_FEED_IN` in
  `lib/feedin-config.ts` (4 Sätze + `validFrom` + `source`), die CLAUDE.md-
  Berechnungslogik-Sätze mitziehen, `npm run build` + `npm test` grün, auf `main`
  mergen + pushen, dann Diff + „Council-Konsens" per Mail. **Kein Konsens:** nicht
  ändern, nur als unsicheren Vorschlag mailen.
- **Bei `ok`:** nichts ändern (Sätze noch im laufenden Halbjahr gültig).
- **Bei REFORM-HINWEIS:** nicht blind Zahlen tauschen, **kein** Auto-Fix — erst
  dem Nutzer melden, weil eine Reform die Berechnungslogik selbst betreffen kann.

## Zusätzlich prüfen: Reform-Sachstand der Ratgeberseiten (kein Auto-Fix)

Die datierten EEG-2027-Reform-Aussagen leben an drei Stellen und müssen bei
Verfahrensfortschritt (Kabinett → Bundestag → Bundesrat → Inkrafttreten)
nachgezogen werden — **nie automatisch**, immer als Vorschlag an den Nutzer,
weil eine Reform die Berechnungslogik selbst betrifft:

- `app/(site)/lohnt-sich-pv-ohne-einspeiseverguetung/page.tsx` — Konstante
  `REFORM_STAND` (Stand-Datum) + der „Verfahrensstand"-Absatz. Der Text ist
  bewusst beschluss-fest formuliert („Zum Stand … war die Reform noch nicht
  final beschlossen …"), trägt also einen einzelnen Zwischenschritt; bei
  echtem Inkrafttreten oder finaler Beschlussfassung muss er trotzdem neu.
- `lib/faq.ts → pvOhneEinspeisungFaq` — die Reform-FAQ-Antworten.
- Die Reform-Notiz im PV-Rechner + `lib/feedin-config.ts` (bestehende Notiz).

**Prüfpunkt (jeder Halbjahres-Lauf):** Ist der auf diesen Seiten beschriebene
Verfahrensstand noch korrekt (aktueller Stand von Kabinettsbeschluss/
Bundestag/Bundesrat/EU-Beihilfegenehmigung)? Bei Änderung → `REFORM_STAND`
hochsetzen und die Texte angleichen, dem Nutzer als Diff vorschlagen.
