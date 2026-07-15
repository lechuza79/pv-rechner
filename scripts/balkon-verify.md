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
- `storage[].kwh` + `storage[].price` — Größen UND Aufpreise der Nachrüst-Speicher.
  **Nicht nur die Preise prüfen, sondern ob die Größen den Markt noch abbilden** —
  das Segment wandert nach oben (unter ~1,5 kWh ist als Einstieg verschwunden,
  Zendure AB1000 nur noch Altbestand). Quelle: ADAC, Stiftung Warentest, heise
  Bestenliste, Preisvergleiche. Stand 2026-07:
  - ~1,6 kWh: Anker Solarbank 2 Pro ~410–460 € (hinterlegt: 430 €)
  - ~2,7 kWh: Anker Solarbank 3 Pro ab ~890 € (hinterlegt: 890 €, Testsieger)
  - Quervergleich: Growatt Noah 2000 (2,0 kWh, ab 600 €), Zendure SolarFlow 800 Pro
    (1,9 kWh, ab 730 €); Marktspanne reiner Balkonspeicher 400–1.500 €.
  Preise fallen und Größen wachsen — deshalb der Quartals-Rhythmus.
- `sets[].inverterW` / Modulgrenze — die **800-W-Wechselrichter-Grenze** und die
  **2.000-Wp-Modulgrenze** (§ 8 Abs. 5a EEG). Das ist das **Gesetz** — prüfen, ob
  es unverändert gilt.
- `schukoMaxWp` (960) — die **Schuko-Grenze der VDE-Vornorm** DIN VDE V 0126-95
  (seit 01.12.2025, = 800 W + 20 %). **Achtung, häufig verwechselt:** Das ist
  **kein Gesetz**, sondern eine **freiwillige Vornorm** und eine **Produktnorm**
  (Adressat: Hersteller). Sie gilt ausdrücklich **nur für Geräte ohne Speicher**.
  Als Vornorm ("V") wird sie **spätestens nach drei Jahren** (also bis Ende 2028)
  überprüft — dann kann sie zur Norm werden, sich ändern oder ersatzlos entfallen.
  **Deshalb hier führen.** Quelle: DKE-Normauslegung vom 17.12.2025.
  Prüfen: Gilt die Vornorm noch? Wurde sie zur Norm? Hat sich die 960 geändert?
  Ist inzwischen eine Speicher-Norm erschienen (war 2026 in Arbeit)?
- `energySocketCostMin/Max` (100–300 €) — Marktkosten für die spezielle
  Energiesteckvorrichtung inkl. Elektrofachkraft. Marktangabe, keine Normgröße.
- Anmelde-Regel (Text im Ergebnis): weiterhin nur Marktstammdatenregister, keine
  Netzbetreiber-Genehmigung? (BNetzA)

**Nicht prüfen (Modell-/Physik-Konstanten):**
- `specificYield` — PVGIS-Fallback, greift nur ohne PLZ
- `storageRoundtrip` / `storageLifeYears` / `storageRecommendMaxPayback` —
  Speicher-Physik und Empfehl-Schwelle. **Offener Punkt:** die HTW misst 82,5 %
  Wirkungsgrad, wir rechnen mit 90 % (Details im Kommentar in `balkon-config.ts`).
- `lifetimeYears` / `degradation` / `gridCo2PerKwh` (Konvention/Physik; CO2-Faktor
  identisch zum WP-/Klima-Rechner)

> **Stand 07/2026:** Dieser Abschnitt listete früher `maxFullLoadHours`,
> `orientations[].factor`, `refYieldKwh`, `sizeExp`, `selfShareMin/Max`,
> `storageEffCyclesPerYear` und `storageSelfShareCap`. Alle sieben existieren nicht
> mehr — der Rechner leitet Clipping, Eigenverbrauch und Speicher-Nutzen seit dem
> Umbau auf `lib/balkon-sim.ts` aus einer Stunden-Simulation her, statt sie als
> kalibrierte Konstanten anzunehmen. Es gibt hier also nichts mehr zu kalibrieren.

## Modell-Validierung (nicht quartalsweise — nur bei Modelländerungen)

Das Modell wurde 07/2026 gegen den **HTW Berlin Stecker-Solar-Simulator** validiert
(das öffentliche Standardwerkzeug für Balkon-PV). Ergebnis und Herleitung stehen als
Kommentar in `lib/balkon-sim.ts`; die PVGIS-Treue der Ertragsreihen ist als
Regressionstest in `lib/__tests__/balkon.test.ts` festgenagelt.

Kurzfassung: Auf der Südachse decken sich beide Werkzeuge (−0,1 % / −1,8 %). Der
Eigenverbrauch liegt bei uns 3–9 % höher (BDEW H0 vs. gemessene Lastprofile), bei
Ost/West und Nord divergieren PVGIS und HTW im Strahlungsmodell — dort ist unsere
Zahl die belegbar nähere (gemessene Nordfassade HZB Berlin: 25 % der Südfassade,
PVGIS 24,7 %, HTW 53,8 %).

**Wenn die Reihen in `lib/solar-year.ts` neu erzeugt werden:** die PVGIS-Direktabfrage
im Test (`matches a direct PVGIS query per orientation`) ist die Kontrolle — schlägt
sie an, wurde mit falschem Winkel oder Azimut abgerufen.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Balkonkraftwerk-Prüfung."**
(Der Quartals-Wächter ruft sie zusammen mit der Klimaanlagen-Prüfung auf.)

## Agent-Prompt (Vorlage)

> Du prüfst die Markt- und Rechtsannahmen des Balkonkraftwerk-Rechners von
> solar-check.io. Heute ist {DATUM}.
>
> Hinterlegt (aus lib/balkon-config.ts): Set-Preise 1 Modul {single.price} €,
> 2 Module {duo.price} €, 4 Module {max.price} €; Speicher {small.kwh} kWh
> {small.price} € / {large.kwh} kWh {large.price} €; Wechselrichter-Grenze {inverterW} W,
> Modulgrenze 2.000 Wp.
>
> Vorgehen (WebSearch + WebFetch):
> 1. Aktuelle Set-Preise (Komplett-Set inkl. Halterung): 1 Modul (~400–500 Wp),
>    2 Module (~800–1.000 Wp, 800-W-WR), 4 Module (~2.000 Wp, 800-W-WR).
>    Verbraucherzentrale / test.de / Preisvergleiche.
> 2. Aktuelle Nachrüst-Speicher-Preise (Aufpreis inkl. Batterie-Wechselrichter):
>    Prüfe BEIDES: sind die hinterlegten Größen noch marktüblich (Einstieg wandert
>    nach oben!) und stimmen die Preise? ADAC / Stiftung Warentest / heise
>    Bestenliste / Preisvergleiche.
> 3. 800-W-Einspeisegrenze + 2.000-Wp-Modulgrenze weiterhin gültig? (Solarpaket I,
>    VDE, BNetzA). Prüfen, ob eine Novelle die Grenzen verändert hat.
> 4. Anmeldung weiterhin nur Marktstammdatenregister?
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> SET-PREISE: <1/2/4 Module Marktspanne> (hinterlegt: <…>)
> SPEICHER: <marktübliche Größen + Preisspannen> (hinterlegt: <…>) — Größen noch aktuell? ja/nein
> GRENZEN: <WR-Watt / Modul-Wp> (hinterlegt: 800 W / 2.000 Wp) — geändert? ja/nein
> ANMELDUNG: <Regel> — geändert? ja/nein
> QUELLEN: <URLs, ADAC/test.de/Verbraucherzentrale/BNetzA/VDE zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung` bei den Preisen:** Set- und Speicher-Preise sind Markt-
  Richtwerte (kein Ermessens-/Rechtsfall) → `sets[].price` bzw. `storage[].price`
  in `lib/balkon-config.ts` anpassen, `validFrom`/`reviewBy` hochsetzen,
  `npm run build` + `npm test` grün (`lib/__tests__/balkon.test.ts`), committen.
- **Bei `abweichung` bei den Grenzen/Anmeldung (Gesetzes-/Normänderung):** das ist
  ein Rechtsfall → **kein Auto-Fix**. Council (`scripts/council-verify.md`) laufen
  lassen, Befund mailen, erst nach Freigabe `inverterW`/Modulleistungen/`schukoMaxWp`
  und die Ergebnis-Texte anpassen. Der Quartals-`solar-check-legal-waechter` fängt
  solche Novellen zusätzlich mit ab.

  **Lehre aus dem Council-Lauf 07/2026 — beim Prüfen sauber trennen:**
  Der Wächter meldete damals die 960-Wp-Schwelle als geltende Regel. Der
  adversariale Prüfer deckte auf, dass das **eine freiwillige Vornorm** ist und
  **kein Gesetz** — hätten wir den Befund direkt umgesetzt, wäre eine falsche
  Rechtsaussage („Pflicht", „nur mit Wieland erlaubt") live gegangen. Deshalb bei
  jeder Grenze **drei Fragen** beantworten, bevor irgendwas in die UI wandert:
  1. **Gesetz oder Norm?** (Norm ≠ Recht. Gesetz hier: § 8 Abs. 5a EEG.)
  2. **Norm oder Vornorm?** („V" = vorläufig, Überprüfung in ≤3 Jahren.)
  3. **Wer ist Adressat — Hersteller oder Betreiber?** (Produktnorm bindet den
     Verbraucher nicht.)
  Und: **Markennamen nicht als Anforderung übernehmen** — die Norm sagt
  technologieoffen „spezielle Energiesteckvorrichtung", nicht „Wieland".
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Jahr setzen.
