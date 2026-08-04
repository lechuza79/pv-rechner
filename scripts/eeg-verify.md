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
- **Nachlauf-Prüfung:** ein täglicher scheduled task, der bis zur
  Veröffentlichung läuft und dann abgleicht. Er wird bei jedem Vorausrechnen
  **neu angelegt** und löscht sich nach dem Abgleich selbst — wer ihn sucht,
  findet ihn zwischen zwei Halbjahren nicht. Stimmen die Werte überein →
  `source` auf die amtliche Zuschreibung zurückstellen, `note` entfernen.
  **Weichen sie ab → melden statt überschreiben.**

**Der Fall ist einmal durchlaufen und hat gehalten** (Halbjahr 08/2026): Am
28.07.2026 vorausgerechnet, am 01.08.2026 gegen die erschienene Liste geprüft —
alle vier Sätze stimmten auf den Cent (7,70 · 6,66 · 12,22 · 10,24). Die
Gesetzeskette ist damit nicht nur rückwirkend an veröffentlichten Halbjahren
geprüft, sondern einmal echt vorhergesagt. Vorausrechnen ist die richtige
Antwort auf eine fehlende Liste — Hauptsache, die Herkunft steht dran.

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

## Zusätzlich prüfen: Reform-Sachstand — EINE Quelle, kein Text-Tippen

**Seit 30.07.2026 steht der Sachstand in `lib/eeg-reform-config.ts`** und wird
von allen Oberflächen daraus gezogen: den beiden FAQ-Sätzen in `lib/faq.ts`, dem
Sachstands-Block im Ratgeber (`app/(site)/ratgeber/lohnt-sich-pv-ohne-einspeise
verguetung/page.tsx`, dessen `REFORM_STAND` jetzt aus dem Modul kommt), der
Ergebnis-Notiz im PV-Rechner und der 2027-Marke in
`components/charts/ZubauWidget.tsx`.

**Warum:** Der Verfahrenssatz stand vorher sechsmal handgetippt da. Am
29.07.2026 hat das Kabinett den Entwurf beschlossen — damit war „der Weg durch
Kabinett, Bundestag und Bundesrat stand noch aus" auf allen sechs Oberflächen
gleichzeitig falsch. Derselbe Satz wird am Tag des Bundestagsbeschlusses wieder
falsch. Also: **Sachstand ändern heißt Modul ändern, nicht Texte suchen.**

**Aktueller Zustand (04.08.2026):** Regierungsentwurf, im Kabinett beschlossen am
29.07.2026 — kein Gesetz. Als Nächstes Bundesrat und Bundestag, dazu die
beihilferechtliche Genehmigung der EU-Kommission (§ 102 des Entwurfs). Die
**Kabinettsfassung ist amtlich veröffentlicht** und die maßgebliche Primärquelle:
`docs/quellen/EEG-2027_Regierungsentwurf_BMWE_2026-07-29.pdf` (der ältere
Referentenentwurf vom 18.07. bleibt daneben liegen — nur noch historisch).
**Download-Falle bei BMWE-PDFs:** Die URL braucht `?__blob=publicationFile`,
sonst liefert der Server eine HTML-Hülle; ein so gescheiterter Abruf ist KEIN
Beleg für „unveröffentlicht" (genau dieser Fehlschluss stand am 04.08.2026 in
einem Council-Urteil).

**Offener Prüfauftrag (Council-Auflage vom 04.08.2026):** Sobald der Entwurf als
Bundesrats- oder Bundestags-Drucksache erscheint (bundesrat.de /
dserver.bundestag.de), ALLE Werte in `EEG_ENTWURF_WERTE` + `EEG_UEBERGANG_STAFFEL`
gegen die Drucksache nachprüfen — zwischen Referentenentwurf und Kabinettsfassung
haben sich zwei Werte geändert (7-kW-Stufe bis Inbetriebnahme 2030 statt 2029;
50-%-Grenze-Schwelle von „offen" auf „weniger als 100 Kilowatt" entschieden),
dieselbe Drift kann im Parlament wieder passieren.

**Vorgehen bei Verfahrensfortschritt:**
1. `EEG_REFORM_STAND.zustand` weiterdrehen. `eegVerfahrenSatz()` **wirft** dann
   absichtlich eine Ausnahme — der Satz für den neuen Zustand muss bewusst
   formuliert werden, statt einen zu erben, der den neuen Stand falsch beschreibt.
2. `geprueftIso` auf das Prüfdatum setzen (trägt das sichtbare „Stand:").
3. `lib/__tests__/eeg-reform-stand.test.ts` + `e2e/eeg-reform-sachstand.spec.ts`
   angleichen. Der Browser-Test liest die Sätze dort, wo ein Nutzer sie sieht —
   ohne ihn landet eine Korrektur womöglich in einem Feld, das nie rendert.
4. Bei Rechtsbezug: Council **und** Legal-Judge (`scripts/council-verify.md`).

**Sachstand ändern ist Auto-Fix-fähig** (Gate-Zeile „Reform-Sachstand"), der
**Wegfall/die Neueinführung einer Vergütungsart bleibt Vorschlag** — die betrifft
die Berechnungslogik selbst.

### Vier Formulierungsfallen, die der Legal-Judge am 30.07.2026 gefunden hat

Alle vier sind als Test festgenagelt, weil sie beim Nachschärfen sofort
zurückkämen:

1. **EEG-Novellen sind Einspruchsgesetze.** Nie „Bundestag und Bundesrat müssen
   zustimmen" — eine Zustimmungsbedürftigkeit stand nirgends. Richtig: „der
   Bundestag muss noch entscheiden, der Bundesrat ist am Verfahren beteiligt".
   Und der Regierungsentwurf geht nach Art. 76 Abs. 2 GG **zuerst** an den
   Bundesrat. (Derselbe Fehler wurde zwei Tage vorher beim GModG korrigiert.)
2. **Kein Beratungstermin.** „ab September" stand nur in der Fachpresse.
3. **Die 50-%-Grenze gilt nur für Neuanlagen** (§ 9 Abs. 2b, eigene Fundstelle
   in der Begründung) und ist ein Anteil der **installierten Leistung**. Ohne
   beides liest ein PV-Besitzer, seine laufende Anlage werde gekappt bzw.
   verliere die Hälfte des Ertrags. *(Historie: Im Referentenentwurf stand die
   Leistungsschwelle in eckigen Klammern und durfte nicht beziffert werden; die
   Kabinettsfassung vom 29.07.2026 hat sie auf „Solaranlagen des zweiten
   Segments mit weniger als 100 Kilowatt" entschieden, Steckersolar bis
   2 kW/800 VA ausgenommen — seither DARF die Zahl als Entwurfswert genannt
   werden.)*
4. **Zwei Belegebenen nicht vermischen — seit 04.08.2026 vereinfacht:** Die
   Kabinettsfassung ist amtlich veröffentlicht, damit sind auch die Detailwerte
   (36 Monate, 1-ct-Abschlag, Staffel — jetzt 50/25/7 kW mit der 7-kW-Stufe für
   Inbetriebnahme 2029 **und** 2030) auf Kabinettsebene belegt. Sie bleiben
   trotzdem **Entwurfswerte** (kein Gesetz) und werden immer so gekennzeichnet;
   „der Wortlaut der beschlossenen Fassung ist nicht veröffentlicht" darf
   nirgends mehr stehen (Test nagelt das fest).

Dazu drei Dinge, die bewusst **nicht** behauptet werden (Begründung im Modul):
die Abfolge der beiden Zahlungen, ein Beratungstermin, und dass die bestehende
EU-Beihilfegenehmigung Ende 2026 ausläuft (in der Kommissionsentscheidung vom
21.12.2022 selbst nicht abrufbar).

**Einheiten:** Der Entwurf sagt durchgehend „Kilowatt installierter Leistung".
Auf einer Seite, die Anlagengrößen sonst in kWp angibt, wird die Einheit bei der
ersten Nennung ausgeschrieben — `eegStaffelSatz()` tut das.
