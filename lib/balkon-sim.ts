// Balkon-PV — Stunden-Simulation über ein Jahr.
//
// Rechnet auf der GETEILTEN Basis (siehe CLAUDE.md „Geteilte Rechen-Basis"):
//   - Standort-Ertrag: PVGIS-Monatswerte (12 × kWh/kWp) — dieselbe Quelle wie der PV-Rechner
//   - Haushaltslast:   calcHourlyConsumption() (BDEW H0 / VDI 4655) — dieselbe wie die Live-Simulation
//   - Kalender:        DAYS_IN_MONTH aus lib/consumption.ts
//
// Warum überhaupt simulieren statt Jahressummen: Bei Balkon-PV passiert alles
// Entscheidende INNERHALB eines Tages und zwischen den Jahreszeiten —
//   1. Der Wechselrichter kappt die Mittagsspitze (nicht die Jahresmenge).
//   2. Ein Speicher lädt mittags und entlädt abends.
//   3. Im Sommer gibt es Überschuss satt, im Winter praktisch keinen.
// Mit Jahressummen ist all das unsichtbar: Der Standort wirkte bei gedeckelten
// Anlagen gar nicht, und ein größerer Speicher brachte rechnerisch nie etwas.
// Deshalb fallen Clipping, Eigenverbrauch und Speicher-Nutzen hier als ERGEBNIS
// an, statt als kalibrierte Konstanten angenommen zu werden.

import { calcHourlyConsumption, type HouseholdProfile } from "./consumption";
import { SOLAR_YEAR_DE, referenceMonthKwh } from "./solar-year";

// Die PVGIS-Monatswerte des Standorts (/api/pvgis) gelten fuer OPTIMALE Neigung.
// Der Vergleich mit derselben Ausrichtung in der Referenzreihe ergibt, wie viel
// ergiebiger dieser Standort ist — dieser Faktor gilt dann fuer jede Ausrichtung.
const LOCATION_REFERENCE = "sued_flach";

export interface BalkonSimInput {
  moduleKwp: number;
  inverterKw: number;
  /** 12 × kWh/kWp aus PVGIS (Monatsprofil des Standorts). */
  monthlyYieldPerKwp: number[];
  /** Ausrichtung — waehlt die passende Referenzreihe (eigener Tagesverlauf!). */
  orientation: string;
  household: HouseholdProfile;
  /** Nutzbare Speicherkapazität in kWh (0 = ohne Speicher). */
  batteryKwh: number;
  /** Lade-/Entlade-Wirkungsgrad (0–1). */
  roundtrip: number;
}

export interface BalkonSimResult {
  /** Ertrag nach Wechselrichter-Deckelung (kWh/a) — das, was im Haus ankommt. */
  annualYield: number;
  /** Ertrag, den die Module ohne Deckel geliefert hätten (kWh/a). */
  rawYield: number;
  /** Vom Wechselrichter gekappte Energie (kWh/a). */
  clippedKwh: number;
  /** Selbst genutzt, direkt + aus dem Speicher (kWh/a). */
  selfUsedKwh: number;
  /** Nur direkt genutzt, ohne Speicher-Beitrag (kWh/a). */
  directUsedKwh: number;
  /** Unvergüteter Überschuss ins Netz (kWh/a). */
  feedInKwh: number;
}

/** Simuliert ein volles Jahr stündlich (12 Monate × Tage × 24 h).
 *  Der Speicher-Ladestand läuft über die Tage durch. */
export function simulateBalkonYear(input: BalkonSimInput): BalkonSimResult {
  let annualYield = 0, rawYield = 0, clippedKwh = 0;
  let selfUsedKwh = 0, directUsedKwh = 0, feedInKwh = 0;
  let soc = 0; // Speicher-Ladestand (kWh)

  const months = SOLAR_YEAR_DE[input.orientation] ?? SOLAR_YEAR_DE[LOCATION_REFERENCE];

  for (let m = 0; m < 12; m++) {
    // Die Referenzreihe liefert VERTEILUNG und Ausrichtung (welche Tage sonnig
    // sind, wie hoch und wann die Spitze steht). Der PVGIS-Monatswert liefert die
    // MENGE am Standort: Er gilt fuer optimale Neigung, also vergleichen wir ihn
    // mit derselben Ausrichtung in der Referenz — der so gewonnene Standortfaktor
    // gilt dann fuer jede Ausrichtung. Damit wandern die Spitzen mit: ein
    // sonnigerer Ort erzeugt hoehere Spitzen und clippt mehr.
    const refOptimal = referenceMonthKwh(LOCATION_REFERENCE, m);
    const locationScale = refOptimal > 0 ? input.monthlyYieldPerKwp[m] / refOptimal : 0;
    const scale = locationScale * input.moduleKwp;

    for (const dayType of months[m]) {
      for (let d = 0; d < dayType.days; d++) {
        for (let h = 0; h < 24; h++) {
        // Referenz ist W je kWp → /1000 = kWh in dieser Stunde je kWp.
        const dcKwh = (dayType.w[h] / 1000) * scale;
        const acKwh = Math.min(dcKwh, input.inverterKw); // Wechselrichter-Deckel
        rawYield += dcKwh;
        annualYield += acKwh;
        clippedKwh += dcKwh - acKwh;

        const loadKwh = calcHourlyConsumption(input.household, h, m) / 1000;

        // Direktverbrauch zuerst — er ist immer verlustfrei.
        const direct = Math.min(acKwh, loadKwh);
        directUsedKwh += direct;
        selfUsedKwh += direct;
        let surplus = acKwh - direct;
        const deficit = loadKwh - direct;

        // Überschuss in den Speicher, soweit Platz ist.
        if (surplus > 0 && input.batteryKwh > 0) {
          const charge = Math.min(surplus, input.batteryKwh - soc);
          soc += charge;
          surplus -= charge;
        }
        // Restbedarf aus dem Speicher decken (Wirkungsgrad beim Entladen).
        if (deficit > 0 && soc > 0) {
          const needed = deficit / input.roundtrip;
          const taken = Math.min(needed, soc);
          soc -= taken;
          selfUsedKwh += taken * input.roundtrip;
        }
        feedInKwh += surplus;
        }
      }
    }
  }

  return {
    annualYield: Math.round(annualYield),
    rawYield: Math.round(rawYield),
    clippedKwh: Math.round(clippedKwh),
    selfUsedKwh: Math.round(selfUsedKwh),
    directUsedKwh: Math.round(directUsedKwh),
    feedInKwh: Math.round(feedInKwh),
  };
}

/** Fallback-Monatsprofil, wenn keine PLZ gesetzt ist.
 *
 *  Nimmt die Monatsverteilung der Referenzreihe selbst (echtes deutsches Jahr) und
 *  skaliert sie auf die gewünschte Jahressumme. Damit gibt es keine zweite,
 *  erfundene Verteilung — ohne PLZ rechnen wir schlicht mit der Mitte Deutschlands.
 *  Sobald eine PLZ da ist, kommen die echten Monatswerte von PVGIS. */
export function monthlyFromAnnual(annualPerKwp: number): number[] {
  const ref = Array.from({ length: 12 }, (_, m) => referenceMonthKwh(LOCATION_REFERENCE, m));
  const refYear = ref.reduce((a, b) => a + b, 0);
  return refYear > 0 ? ref.map(v => (v / refYear) * annualPerKwp) : ref;
}
