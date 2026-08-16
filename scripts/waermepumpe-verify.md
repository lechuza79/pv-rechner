# Wärmepumpen-Werte — Runbook (quartalsweise, Jan/Apr/Jul/Okt)

**Zweck:** Die preis- und förderabhängigen Werte in `lib/heatpump-config.ts`
(`DEFAULT_HEATPUMP_CONFIG`) gegen die offiziellen Quellen prüfen. Sie bestimmen
Investition, Förderung und die 20-Jahres-TCO im Wärmepumpen-Rechner — ein
veralteter Fördersatz oder Investitionspreis verzerrt das Ergebnis spürbar.

**Warum quartalsweise (seit 27.07.2026, vorher jährlich):** Ein Jahr ist zu lang.
Der Rechner stand ein halbes Jahr mit einer Investition live, die unter dem
günstigsten realen Angebot lag — bei jährlichem Takt wäre das bis Januar 2027
so geblieben. Politik (BEG) bewegt sich zum Jahreswechsel, Marktpreise laufen
dagegen dauernd (2025 fiel der Schnitt um rund 4.000 €), und die Leitquelle
erscheint im Sommer. Vier Termine im Jahr treffen beides. Stichtag steht
zusätzlich in `DEFAULT_HEATPUMP_CONFIG.reviewBy`.

**Mid-Year-Sicherheitsnetz:** Förderstopps/-änderungen passieren auch unterjährig
(Topf leer, Haushaltssperre). Der wöchentliche `foerder-news-waechter` hat
„Wärmepumpe BEG" als Stichwort und fängt solche Ad-hoc-Fälle mit ab.

## Was prüfen (volatil) vs. was nicht (Modell)

**Prüfen (preis-/politikabhängig):**
- `begGrundfoerderung` / `begKlimaBonus` / `begEffizienzBonus` /
  `begEinkommensBonus` / `begMaxCap` / `begMaxRate` — BAFA/KfW BEG.
  **Zwei davon sinken am 01.02.2027 planmäßig, danach halbjährlich zum 01.02. und
  01.08.:** `begMaxCap` um 750 € je Schritt, `begKlimaBonus` um 4 Prozentpunkte je
  Schritt (ab Antragstellung 01.08.2028 entfällt er ganz). Termin und Schrittweite
  stehen bereits im Merkblatt 458 — das ist keine Prognose, sondern ein Fahrplan.
  Der Marker `OFFEN (bis 01/2027)` in `lib/heatpump-config.ts` lässt den Frist-Test
  rechtzeitig anschlagen; beim Nachziehen die Frist **mitschieben, nicht streichen**,
  weil der nächste Schritt schon feststeht. Die neuen Werte trotzdem am Merkblatt
  ablesen statt fortzurechnen — die Schrittweite kann der Gesetzgeber ändern.
- `investLwwpBase` / `investLwwpPerKw` / `investSwwpBase` / `investSwwpPerKw` /
  `heizkoerperTauschKosten` — **Leitquelle: die jährliche Auswertung echter
  Wärmepumpen-Angebote der Verbraucherzentrale Rheinland-Pfalz** (2025er Ausgabe
  im Repo: `docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2025-06.pdf`,
  Nachfolge-Auswertung als Pressemitteilung Juli 2026). Sie ist die einzige uns
  bekannte Quelle mit echten Angebotspreisen inkl. Leistungsverteilung und
  Kostenkategorien. Abgleich in dieser Reihenfolge:
    1. **Median-Gesamtkosten** bei **Median-Leistung** (2025: 34.979 € bei 10 kW)
       → muss `investLwwpBase + investLwwpPerKw × 10` treffen (±10 %).
    2. **Summe der leistungsunabhängigen Kategorien** (Montage/Lohn, Elektro,
       Fundament, hydraulischer Abgleich, Warmwasser, Puffer; 2025: 16.652 €)
       → das ist `investLwwpBase`.
    3. **Heizkörpertausch**: Ø-Preis je Heizkörper × ~6 kritische Heizkörper.
  **Kein Scraping mehr** (2026-07 abgeschaltet): Die frühere Ableitung aus einer
  Portal-Kostenübersicht bezifferte den Einbau mit 3.000–7.500 € und ergab für ein
  kleines Haus 15.020 € — weniger als das **günstigste** von 160 echten Angeboten.
  Ein Korrekturfaktor darauf wäre geraten gewesen; deshalb Config + dieser Wächter.
  Angebotsportale/Herstellerseiten taugen als Gegenprobe, nie als Leitquelle.
- `wpTarif` — Wärmepumpen-Stromtarif (§ 14a EnWG, BDEW)
- **Gas-/Öl-Preis + CO2-Faktor:** liegen an EINER Stelle — `FUEL_PRICE` in
  `lib/constants.ts` (Single Source of Truth). `heatpump-config`
  (`gasPriceCtPerKwh`/`gasCo2PerKwh`), `FUEL` und `WP_FUEL_OPTIONS` leiten daraus
  ab. **Preis-/CO2-Änderung nur in `FUEL_PRICE`** pflegen → wirkt überall.
- `fixCostPerYear` / `gasInvestNeubau` — WP-spezifisch, bleiben in
  `heatpump-config` (BDEW); der Kessel-Wirkungsgrad ebenfalls (pro Variante).
  **`fixCostPerYear` ist je Energieträger getrennt:** Gas trägt den Grund-/
  Zählerpreis des Netzanschlusses, Heizöl trägt **0** — beim Öltank hängt an
  keinem Anschluss eine laufende Gebühr. Das ist keine Preisfrage, sondern eine
  Strukturfrage: Der Öl-Wert bleibt 0, auch wenn der Gas-Grundpreis steigt.
  (Bis 28.07.2026 bekam die Ölheizung den Gas-Grundpreis aufgeschlagen — 3.600 €
  über 20 Jahre zugunsten der Wärmepumpe. Gefunden hat das ein Forumsnutzer.)
- **Bioheizöl-Preispfad — beobachtet der TÄGLICHE Wächter, nicht dieser hier.**
  § 43 Abs. 1 GModG nennt Heizöl gleichrangig neben Gas, aber wir rechnen die
  Beimischung nur für Gas (kein belastbarer Bioheizöl-Preis, Begründung und
  sichtbarer Hinweis siehe `waermepumpe.tsx`). Ein Quartalsrhythmus wäre dafür zu
  träge: Sobald eine Regelung steht, muss sie sofort in die Rechnung und ist
  zugleich ein Anlass, den Rechner zu zeigen. Der Punkt liegt deshalb im
  `foerder-news-waechter` (täglich), Runbook `scripts/gruengas-verify.md`
  Schritt 4 — dort wird ohnehin das Quotengesetz nach § 42a verfolgt, das bis zum
  1. Dezember 2026 vorzulegen ist und Heizöl ausdrücklich einschließt. **Hier
  nichts doppelt prüfen** — zwei Wächter auf derselben Frage erzeugen
  widersprüchliche Befunde.
- **OFFEN (bis 01/2027): Wartungskosten Heizöl.** `gasMaintenance` gilt aktuell
  für Gas UND Öl. Dass eine Ölheizung mit Tankprüfung und zusätzlichen
  Schornsteinfeger-Terminen real teurer in der Wartung ist, ist plausibel — uns
  fehlt dafür aber eine belastbare Quelle (Kostenportale zählen nicht, siehe die
  Investitions-Lehre oben). Beim nächsten Lauf: Träger-/Verbraucherzentralen-
  Quelle mit echten Wartungsverträgen suchen. Findet sich keine, bleibt die
  Gleichsetzung — dann diesen Punkt mit dem Befund „keine Quelle gefunden"
  bestätigen, statt eine Zahl zu schätzen.

**Nicht prüfen (Modell-/Bauphysik-Konstanten, ändern sich nicht jährlich):**
- `specDemandBestand` / `specDemandNeubau` (dena Gebäudereport, DIN V 18599;
  die Stufe „vollsaniert" zusätzlich aus der dena-Verbrauchsstudie). Sie werden
  **aus `INSULATION_BESTAND`/`INSULATION_NEUBAU` in `lib/constants.ts`
  abgeleitet** — falls hier doch einmal etwas zu ändern ist, dort ändern, nie in
  der Config (sonst driften UI-Auswahl und Rechnung auseinander).
- `jazLwwp` / `jazSwwp` / Vorlauftemperaturen (Fraunhofer ISE WPsmart)
- `gasCo2PerKwh` (physikalischer Emissionsfaktor), Inflationsannahmen (Konvention)

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Wärmepumpen-Prüfung."**

## Agent-Prompt (Vorlage)

> Du prüfst die preis- und förderabhängigen Annahmen des Wärmepumpen-Rechners
> von solar-check.io gegen offizielle Quellen. Heute ist {DATUM}.
>
> Hinterlegt (aus lib/heatpump-config.ts): BEG-Sätze {beg…}, Cap {begMaxCap}/
> {begMaxRate}; Investition LWWP {investLwwpBase}+{investLwwpPerKw}/kW, SWWP
> {investSwwpBase}+{investSwwpPerKw}/kW, HK-Tausch {heizkoerperTauschKosten};
> WP-Tarif {wpTarif}; Gas {gasPriceCtPerKwh} ct/kWh.
>
> Vorgehen (WebSearch + WebFetch):
> 1. BEG Heizungsförderung: aktuelle Sätze + Förderhöchstgrenze + ob das Programm
>    Anträge annimmt. Primärquelle BAFA/KfW (Bundesförderung effiziente Gebäude).
> 2. Investitionskosten Wärmepumpe: neueste Angebotsauswertung der
>    Verbraucherzentrale (Suchbegriff „Verbraucherzentrale Auswertung Angebote
>    Luft-Wasser-Wärmepumpe"). Gebraucht werden Median UND Mittelwert der
>    Gesamtkosten, die Median-Leistung in kW und die Kostenkategorien-Tabelle.
>    Melde Abweichungen nur mit diesen vier Angaben — eine Gesamtsumme ohne
>    zugehörige Leistung ist wertlos, weil unser Modell an kW hängt.
> 3. WP-Stromtarif (§ 14a EnWG) + Gaspreis Haushalt: BDEW, Verivox/Check24 als
>    Sekundärquelle.
> 4. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> BEG: <Sätze + Cap> (hinterlegt: <…>) — Programm aktiv? ja/nein
> INVESTITION: <Median/Mittelwert + Median-kW + Kategorien-Summe> (hinterlegt: <…>)
> WP-TARIF / GAS: <Werte> (hinterlegt: <…>)
> QUELLEN: <URLs, BAFA/KfW/Verbraucherzentrale/BDEW zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung`:** immer zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`, 3 unabhängige Verifizierer + 1 adversarialer).
  Was danach passiert, hängt vom Feld ab:

### Investition — Auto-Fix erlaubt (seit 27.07.2026)

Betrifft `investLwwpBase`, `investLwwpPerKw`, `investSwwpBase`, `investSwwpPerKw`,
`heizkoerperTauschKosten`. Der Fix wird selbst committet und deployt, **wenn ALLE
fünf Bedingungen erfüllt sind**:

1. **Leitquelle ist eine Auswertung echter Angebote** einer Verbraucherschutz-
   oder Trägerorganisation (Standard: Verbraucherzentrale Rheinland-Pfalz), mit
   **Median-Gesamtkosten**, **Median-Leistung in kW** und der
   **Kostenkategorien-Tabelle**. Fehlt eine der drei Angaben → Vorschlag, kein
   Fix: Eine Gesamtsumme ohne zugehörige Leistung ist für ein Modell wertlos,
   das an der Heizlast hängt. Portale, Hersteller- und Vergleichsseiten sind
   **nie** Leitquelle (sie haben den Fehler von Juli 2026 verursacht) — nur
   Gegenprobe.
2. **Council-Konsens**, adversarialer Prüfer eingeschlossen.
3. **Rechenregel eingehalten** (nicht frei geschätzt): Basis = Summe der
   leistungsunabhängigen Kategorien (Montage/Lohn, Elektro, Fundament,
   hydraulischer Abgleich, Warmwasser, Puffer); Steigung so, dass
   `Basis + Steigung × Median-kW` den Median-Preis trifft. Ein Handfaktor
   („wirkt zu hoch/zu niedrig") ist kein zulässiger Fix.
4. **Sprung ≤ 30 %** je Feld gegenüber dem hinterlegten Wert. Darüber nur
   Vorschlag — ein größerer Sprung ist eher ein Lesefehler als ein Marktereignis.
5. **`npx tsc --noEmit` und `npx vitest run` grün.** Die Marktanker in
   `lib/__tests__/heatpump.test.ts` („Marktanker gegen echte Angebote") sind der
   harte Filter: Median-Fall ±10 %, kleinste Anlage über dem günstigsten realen
   Angebot, größte unter dem teuersten. **Diese Tests dürfen im selben Lauf nur
   angepasst werden, wenn die neuen Grenzen direkt aus der neuen Auswertung
   stammen** — nie, damit ein Wert „durchgeht".

  Ablauf: Worktree → Änderung inkl. `validFrom`/`source` → Tests → Commit mit
  Quellenangabe (Median, Median-kW, Erhebungszeitraum) → Push auf `main` → Mail
  mit dem Diff und den neuen Beispielwerten (4 / 10 / 18 kW). Neue Auswertung als
  PDF in `docs/quellen/` ablegen, damit die Fundstelle nachprüfbar bleibt.

### Förderung, Tarife, Gaspreis — Vorschlag, kein Auto-Fix

`begGrundfoerderung`, `begKlimaBonus`, `begEinkommensStaffel`, `begMaxCap`,
`begMaxRate`, `wpTarif`, `gasPriceCtPerKwh` (letzterer liegt in `FUEL_PRICE` und
wirkt auch im PV-Rechner). Hier hängen Rechtsfolgen und Ermessen dran
(„Programm aktiv vs. Topf ausgeschöpft", Übergangsfristen) — bestätigten
Vorschlag mailen, ändern nach Freigabe. Invarianten beachten (Bonus-Summe > Cap,
SWWP-Invest > LWWP-Invest).

- **Bei `ok`:** `geprueftIso` + `reviewBy` auf den nächsten Termin setzen,
  `validFrom` unverändert lassen.
- **`geprueftIso` in jedem Fall nachziehen** (Gate-Regel 9):
  `DEFAULT_HEATPUMP_CONFIG.geprueftIso` trägt den Tag dieses Laufs, sobald die
  Leitquellen (Angebotsauswertung, KfW-Merkblatt, BDEW-Tarife) tatsächlich
  gelesen wurden — auch bei „alles bestätigt, nichts geändert". Genau das steht
  unter dem Rechner: „Anschaffung, Tarife und BEG-Förderung geprüft am …"
  (`lib/stand.ts`), und dasselbe Datum ist das `lastmod` der Seite in der
  Sitemap. Ein Lauf, der an einer Quelle gescheitert ist, lässt es stehen.
  `validFrom` bewegt sich nur, wenn sich ein Wert ändert.
