# Wärmepumpen-Werte — Runbook (jährlich, im Januar)

**Zweck:** Die preis- und förderabhängigen Werte in `lib/heatpump-config.ts`
(`DEFAULT_HEATPUMP_CONFIG`) gegen die offiziellen Quellen prüfen. Sie bestimmen
Investition, Förderung und die 20-Jahres-TCO im Wärmepumpen-Rechner — ein
veralteter Fördersatz oder Investitionspreis verzerrt das Ergebnis spürbar.

**Warum jährlich im Januar:** Die volatilen Größen hängen an Politik (BEG-
Förderung, an den Bundeshaushalt gekoppelt) und an jährlichen Marktberichten
(BWP Preisübersicht, BDEW-Strompreise). Beide aktualisieren sich typischerweise
zum Jahreswechsel. Stichtag steht in `DEFAULT_HEATPUMP_CONFIG.reviewBy`.

**Mid-Year-Sicherheitsnetz:** Förderstopps/-änderungen passieren auch unterjährig
(Topf leer, Haushaltssperre). Der wöchentliche `foerder-news-waechter` hat
„Wärmepumpe BEG" als Stichwort und fängt solche Ad-hoc-Fälle mit ab.

## Was prüfen (volatil) vs. was nicht (Modell)

**Prüfen (preis-/politikabhängig):**
- `begGrundfoerderung` / `begKlimaBonus` / `begEffizienzBonus` /
  `begEinkommensBonus` / `begMaxCap` / `begMaxRate` — BAFA/KfW BEG
- `investLwwpBase` / `investLwwpPerKw` / `investSwwpBase` / `investSwwpPerKw` /
  `heizkoerperTauschKosten` — BWP Preisübersicht (jeweils aktuellstes Jahr)
- `wpTarif` — Wärmepumpen-Stromtarif (§ 14a EnWG, BDEW)
- `gasPriceCtPerKwh` / `gasFixCostPerYear` / `gasInvestNeubau` — Gas-Referenz (BDEW)

> **⚠️ Gas-/Öl-Preis ist doppelt abgelegt** (bis zur geplanten Zusammenführung):
> `heatpump-config.gasPriceCtPerKwh` (WP-Rechner) UND `FUEL.gas.price` /
> `FUEL.oil.price` in `lib/constants.ts` (PV-Rechner, `calcFuelCost25`) + die
> `WP_FUEL_OPTIONS`. Bei einer **Gas-/Öl-Preis-Änderung BEIDE Stellen** als „zu
> aktualisieren" listen, sonst rechnet der PV-Rechner mit dem alten Wert weiter.
> (Sobald die Audit-Session beides zu einer Quelle zusammengeführt hat, kann
> dieser Hinweis raus.)

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
> 2. Investitionskosten Wärmepumpe: aktuellste BWP-Preisübersicht (Bundesverband
>    Wärmepumpe) bzw. Verbraucherzentrale.
> 3. WP-Stromtarif (§ 14a EnWG) + Gaspreis Haushalt: BDEW, Verivox/Check24 als
>    Sekundärquelle.
> 4. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> BEG: <Sätze + Cap> (hinterlegt: <…>) — Programm aktiv? ja/nein
> INVESTITION: <BWP-Werte> (hinterlegt: <…>)
> WP-TARIF / GAS: <Werte> (hinterlegt: <…>)
> QUELLEN: <URLs, BAFA/KfW/BWP/BDEW zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung`:** zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`). Wärmepumpe ist ein **Ermessensfall** (Förder-
  Kleingedrucktes, „aktiv vs. ausgeschöpft", welches Investitionsfeld) → **kein
  Auto-Fix, auch bei Konsens**. Den bestätigten Vorschlag mailen; erst nach
  Freigabe die betroffenen Felder in `lib/heatpump-config.ts` +
  `validFrom`/`reviewBy`/`source` anpassen, `npm run build` + `npm test` grün
  (Invarianten-Tests in `lib/__tests__/heatpump.test.ts` beachten: Bonus-Summe >
  Cap, SWWP-Invest > LWWP-Invest), committen.
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Jahr setzen.
