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
