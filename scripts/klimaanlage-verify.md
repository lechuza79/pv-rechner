# Klimaanlagen-Werte — Runbook (quartalsweise)

**Zweck:** Die geräte- und preisabhängigen Annahmen in `lib/aircon-config.ts`
(`DEFAULT_AIRCON_CONFIG`) gegen den Markt prüfen. Sie bestimmen Stromkosten,
Anschaffung, den Gerätevergleich und — für den „Auch heizen?"-Block — die Heiz-
Effizienz. Der **Strompreis** kommt bereits live (aus `market_prices`), die
**Kühlgradstunden** live aus `/api/cooling-degree`; hier geht es um die statischen
Geräte-/Preis-Werte. Vom „Auch heizen?"-Block gehört nur der **SCOP** hierher —
Split-Heizen gibt es NUR im Klima-Rechner. Der Heizwärmebedarf je Gebäudestandard
ist dagegen **geteilte Rechen-Basis** und wird im WP-Runbook gepflegt (siehe unten).

**Warum quartalsweise:** Gerätepreise und Effizienzklassen fallen mit den
Produktgenerationen; ein Quartals-Check hält sie aktuell (Consumer-Preise ändern
sich zu schnell für einen Jahresrhythmus).
Stichtag steht in `DEFAULT_AIRCON_CONFIG.reviewBy`.

## Was prüfen (markt-/produktabhängig) vs. was nicht (Modell)

**Prüfen:**
- `devices[].seer` — Kühl-Effizienz (SEER): Monoblock ~2,5, mobile Split ~4,3,
  fest installiert ~6. Verbraucher-Tests (test.de, Fachpresse).
- `devices[].scop` — Heiz-Effizienz (SCOP): mobile Split ~3,6, fest installiert
  ~4,2. Herstellerdatenblätter / A+++-Wärmepumpen-Split. Monoblock heizt nicht
  (`canHeat: false`). Für den Klima-„Auch heizen?"-Block.
- `devices[].pricePerUnit` / `priceBase` / `pricePerRoom` — Anschaffung je Typ.
  ADAC, daibau, reduco, Fachbetrieb-Festpreise.

**Nicht prüfen (Modell-/Klimatologie-Konstanten):**
- `buildingGain`, `sizingWPerM2`, `targetFactor`, `windowFactor`,
  `exposureOptions[].factor` (kalibriertes Kühlmodell)
- `heatStandards[].specKwh` — **hier NICHT anfassen.** Das ist die geteilte
  Rechen-Basis: die Werte kommen aus `INSULATION_BESTAND`/`INSULATION_NEUBAU`
  (`lib/constants.ts`, dena Gebäudereport / DIN V 18599) und werden vom
  Wärmepumpen-Rechner mitbenutzt. Gepflegt wird das im **WP-Runbook**
  (`scripts/waermepumpe-verify.md`) — ein Fix hier würde die beiden Rechner
  auseinanderdriften lassen.
- `heatTransitionShare` (0,4) — Modell-Annahme: Anteil des Jahres-Heizwärme-
  bedarfs, der in der Übergangszeit anfällt (Herleitung über Heizgradtage, siehe
  Kommentar in der Config). Kein Marktwert, kein Quartals-Thema.
- `cdhNational` / `cdhByBundesland` / Faktoren — Baseline/Fallback, die Live-API
  verfeinert pro PLZ
- `gridCo2PerKwh` (Strommix-Faktor, identisch zu WP-/Balkon-Rechner)

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Klimaanlagen-Prüfung."**
(Der Quartals-Wächter ruft sie zusammen mit der Balkonkraftwerk-Prüfung auf.)

## Agent-Prompt (Vorlage)

> Du prüfst die Geräte- und Preisannahmen des Klimaanlagen-Rechners von
> solar-check.io. Heute ist {DATUM}.
>
> Hinterlegt (aus lib/aircon-config.ts): SEER Monoblock {…}/mobile Split {…}/fest
> {…}; Anschaffung Monoblock {pricePerUnit} €, mobile Split {pricePerUnit} €, fest
> {priceBase} €+{pricePerRoom} €/Raum.
>
> Vorgehen (WebSearch + WebFetch):
> 1. SEER (Kühlen) + SCOP (Heizen) aktueller Geräte je Klasse (Monoblock, mobile
>    Split, fest installierte Split): Verbraucher-Tests, Herstellerdatenblätter.
> 2. Anschaffungs-/Montagepreise: ADAC, daibau, reduco, Fachbetriebe.
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> SEER: <Mono/mobil/fest> (hinterlegt: <…>)
> SCOP: <mobil/fest> (hinterlegt: <…>)
> PREISE: <Anschaffung je Typ> (hinterlegt: <…>)
> QUELLEN: <URLs, Verbraucher-Tests/ADAC zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung`:** SEER/Preise sind Markt-/Produktwerte (kein Ermessens-
  /Rechtsfall) → Werte in `lib/aircon-config.ts` anpassen, `validFrom`/`reviewBy`/
  `source` hochsetzen, `npm run build` + `npm test` grün
  (`lib/__tests__/aircon.test.ts`), committen.
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Jahr setzen.
