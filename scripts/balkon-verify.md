# Balkonkraftwerk-Werte — Runbook (quartalsweise)

**Zweck:** Die preisabhängigen Annahmen in `lib/balkon-config.ts`
(`DEFAULT_BALKON_CONFIG`) gegen den Markt und die Rechtslage prüfen. Sie bestimmen
Investition, Ertrag und Amortisation im Balkonkraftwerk-Rechner. Der **Strompreis**
(dominiert die Ersparnis) und der **Standort-Ertrag** kommen bereits live (aus
`market_prices` bzw. PVGIS) — hier geht es um die statischen Config-Werte.

**Warum quartalsweise:** Steckersolar-Set-Preise fallen kontinuierlich; ein
Quartals-Check hält die Richtpreise aktuell (Jahresrhythmus wäre zu träge).
Stichtag steht in `DEFAULT_BALKON_CONFIG.reviewBy`.

## Was prüfen (markt-/rechtsabhängig) vs. was nicht (Modell)

**Prüfen:**
- `sets[].price` — typische Set-Preise (1 Modul / 2 Module / 4 Module) inkl.
  Halterung. Quelle: Verbraucherzentrale, Stiftung Warentest (test.de),
  Preisvergleiche (geizhals, idealo), große Händler.
- `storage[].price` — Aufpreis Nachrüst-Speicher (~1 kWh / ~2 kWh) inkl.
  Batterie-Wechselrichter/App. Quelle: ADAC, Stiftung Warentest (test.de,
  Heft 4/2026 Balkonspeicher), Verbraucherzentrale, Preisvergleiche. Richtwert
  2026: ~1 kWh ~350–600 €, ~2 kWh ~600–1.000 € (einzeln nachgerüstet). Fallen
  weiter — deshalb der Quartals-Rhythmus.
- `sets[].inverterW` / Modulgrenze — die **800-W-Wechselrichter-Grenze** und die
  **2.000-Wp-Modulgrenze** (Solarpaket I, seit Mai 2024). Prüfen, ob die Grenzen
  gesetzlich unverändert sind (VDE-Norm/EEG). Ändert sich das, sind `inverterW`
  und die Set-Modulleistungen anzupassen.
- Anmelde-Regel (Text im Ergebnis): weiterhin nur Marktstammdatenregister, keine
  Netzbetreiber-Genehmigung? (BNetzA)

**Nicht prüfen (Modell-/Physik-Konstanten):**
- `specificYield` (PVGIS-Fallback), `maxFullLoadHours` (Wechselrichter-Deckel),
  `orientations[].factor` (Einstrahlungsphysik)
- `refYieldKwh` / `sizeExp` / `selfShareMin` / `selfShareMax` — Eigenverbrauchs-
  Modell, kalibriert am HTW Berlin Stecker-Solar-Simulator
- `storage[].kwh` / `storageEffCyclesPerYear` / `storageRoundtrip` /
  `storageSelfShareCap` — Speicher-Durchsatz-Modell (Physik/Kalibrierung: mit
  Speicher steigt der Eigenverbrauch typisch auf 60–80 %, gedeckelt bei 78 %)
- `lifetimeYears` / `degradation` / `gridCo2PerKwh` (Konvention/Physik; CO2-Faktor
  identisch zum WP-/Klima-Rechner)

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Balkonkraftwerk-Prüfung."**
(Der Quartals-Wächter ruft sie zusammen mit der Klimaanlagen-Prüfung auf.)

## Agent-Prompt (Vorlage)

> Du prüfst die Markt- und Rechtsannahmen des Balkonkraftwerk-Rechners von
> solar-check.io. Heute ist {DATUM}.
>
> Hinterlegt (aus lib/balkon-config.ts): Set-Preise 1 Modul {single.price} €,
> 2 Module {duo.price} €, 4 Module {max.price} €; Speicher-Aufpreis ~1 kWh
> {small.price} €, ~2 kWh {large.price} €; Wechselrichter-Grenze {inverterW} W,
> Modulgrenze 2.000 Wp.
>
> Vorgehen (WebSearch + WebFetch):
> 1. Aktuelle Set-Preise (Komplett-Set inkl. Halterung): 1 Modul (~400–500 Wp),
>    2 Module (~800–1.000 Wp, 800-W-WR), 4 Module (~2.000 Wp, 800-W-WR).
>    Verbraucherzentrale / test.de / Preisvergleiche.
> 2. Aktuelle Nachrüst-Speicher-Preise (Aufpreis inkl. Batterie-Wechselrichter):
>    ~1 kWh und ~2 kWh. ADAC / Stiftung Warentest (Heft 4/2026 Balkonspeicher) /
>    Verbraucherzentrale / Preisvergleiche.
> 3. 800-W-Einspeisegrenze + 2.000-Wp-Modulgrenze weiterhin gültig? (Solarpaket I,
>    VDE, BNetzA). Prüfen, ob eine Novelle die Grenzen verändert hat.
> 4. Anmeldung weiterhin nur Marktstammdatenregister?
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> SET-PREISE: <1/2/4 Module Marktspanne> (hinterlegt: <…>)
> SPEICHER-PREISE: <~1 kWh / ~2 kWh Marktspanne> (hinterlegt: <…>)
> GRENZEN: <WR-Watt / Modul-Wp> (hinterlegt: 800 W / 2.000 Wp) — geändert? ja/nein
> ANMELDUNG: <Regel> — geändert? ja/nein
> QUELLEN: <URLs, ADAC/test.de/Verbraucherzentrale/BNetzA/VDE zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung` bei den Preisen:** Set- und Speicher-Preise sind Markt-
  Richtwerte (kein Ermessens-/Rechtsfall) → `sets[].price` bzw. `storage[].price`
  in `lib/balkon-config.ts` anpassen, `validFrom`/`reviewBy` hochsetzen,
  `npm run build` + `npm test` grün (`lib/__tests__/balkon.test.ts`), committen.
- **Bei `abweichung` bei den Grenzen/Anmeldung (Gesetzesänderung):** das ist ein
  Rechtsfall → **kein Auto-Fix**. Council (`scripts/council-verify.md`) laufen
  lassen, Befund mailen, erst nach Freigabe `inverterW`/Modulleistungen und die
  Ergebnis-Texte anpassen. Der Quartals-`solar-check-legal-waechter` fängt solche
  Novellen zusätzlich mit ab.
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Jahr setzen.
