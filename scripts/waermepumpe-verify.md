# Wärmepumpen-Werte — Runbook (jährlich, im Januar)

**Zweck:** Die preis- und förderabhängigen Werte in `lib/heatpump-config.ts`
(`DEFAULT_HEATPUMP_CONFIG`) gegen die offiziellen Quellen prüfen. Sie bestimmen
Investition, Förderung und die 20-Jahres-TCO im Wärmepumpen-Rechner — ein
veralteter Fördersatz oder Investitionspreis verzerrt das Ergebnis spürbar.

**Warum jährlich im Januar:** Die volatilen Größen hängen an Politik (BEG-
Förderung, an den Bundeshaushalt gekoppelt) und an jährlichen Marktauswertungen
(Verbraucherzentrale-Angebotsauswertung, BDEW-Strompreise). Beide aktualisieren
sich typischerweise zum Jahreswechsel. Stichtag steht in
`DEFAULT_HEATPUMP_CONFIG.reviewBy`.

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

- **Bei `abweichung`:** zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`). Wärmepumpe ist ein **Ermessensfall** (Förder-
  Kleingedrucktes, „aktiv vs. ausgeschöpft", welches Investitionsfeld) → **kein
  Auto-Fix, auch bei Konsens**. Den bestätigten Vorschlag mailen; erst nach
  Freigabe die betroffenen Felder in `lib/heatpump-config.ts` +
  `validFrom`/`reviewBy`/`source` anpassen, `npm run build` + `npm test` grün
  (Invarianten-Tests in `lib/__tests__/heatpump.test.ts` beachten: Bonus-Summe >
  Cap, SWWP-Invest > LWWP-Invest), committen.
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Jahr setzen.
