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
  `begEinkommensBonus` / `begMaxCap` / `begMaxRate` — BAFA/KfW BEG
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
- `gasFixCostPerYear` / `gasInvestNeubau` — WP-spezifisch, bleiben in
  `heatpump-config` (BDEW); der Kessel-Wirkungsgrad ebenfalls (pro Variante).

**Nicht prüfen (Modell-/Bauphysik-Konstanten, ändern sich nicht jährlich):**
- `specDemandBestand` / `specDemandNeubau` (dena Gebäudereport, DIN V 18599)
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

- **Bei `ok`:** nur `validFrom` + `reviewBy` auf den nächsten Termin setzen.
