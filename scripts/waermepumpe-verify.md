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
- `investLwwpPerKw` / `investSwwpBase` / `investSwwpPerKw` /
  `heizkoerperTauschKosten` — BWP Preisübersicht (jeweils aktuellstes Jahr).
  **`investLwwpBase` NICHT mehr manuell prüfen** — die Luft/Wasser-Basis wird
  monatlich automatisch aus der taptaphome-Kostenübersicht gescrapt
  (`/api/prices/scrape`, Ableitung in `lib/heatpump-prices.ts`, Live-Wert in
  `market_prices.wp_lwwp_base`, Fallback = Config). Der Monats-Preis-Report führt
  sie als eigene Zeile; eine Scrape-Degradation kippt den HEALTH-Status. Config-
  Wert dient nur als Fallback. Sole/Wasser bleibt manuell (Bohrkosten sind fix).
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
