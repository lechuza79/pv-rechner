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
// Anlagen gar nicht, und ein größerer Speicher brachte rechnerisch nie einen
// Unterschied. Deshalb fallen Clipping, Eigenverbrauch und Speicher-Nutzen hier
// als ERGEBNIS an, statt als kalibrierte Konstanten angenommen zu werden.
//
// ─── Validiert gegen den HTW Stecker-Solar-Simulator (07/2026) ──────────────
// Gegenprobe gegen das oeffentliche Standardwerkzeug fuer Balkon-PV (HTW Berlin,
// Datenstand 08/2024). Damit Modelle und nicht Standorte verglichen werden, wurde
// unser Standort auf den HTW-Standort kalibriert (Lindenberg/Brandenburg, Wetter-
// jahr 2017): Sued 35 Grad, 800 Wp am 800-W-Wechselrichter = 791 kWh/a bei beiden.
// Referenzfall danach 800 Wp / 2.100 kWh Haushalt (HTW-Vorgabe fuer 2 Personen in
// der Wohnung) / tagQuote 0,30.
//
//   Ertrag Sued aufgestaendert   790 vs 791 kWh   (−0,1 %)
//   Ertrag Sued senkrecht        542 vs 552 kWh   (−1,8 %)
//   Nutzungsgrad Sued 35 Grad   50,0 % vs 48,3 %  (+3,5 %)
//   Nutzungsgrad Sued senkrecht 61,1 % vs 56,3 %  (+8,5 %)
//   Speicher 1 kWh, Zugewinn    +144 vs +165 kWh  (−13 %), Saettigung bei beiden ~1,5 kWh
//
// Die Ertraege auf der Suedachse decken sich also praktisch. Die verbleibenden
// Abweichungen sind ERKLAERBAR und laufen in bekannte Richtungen:
//
// 1. Eigenverbrauch etwas zu hoch (+3 bis +9 %): Wir rechnen mit dem BDEW-H0-
//    Standardlastprofil, die HTW mit 41 GEMESSENEN Haushaltsprofilen. H0 ist
//    geglaettet — echte Haushalte haben kurze harte Spitzen (Wasserkocher, Herd),
//    die eine 800-W-Anlage nicht decken kann. Glaetten schoent den Eigenverbrauch
//    also systematisch. Die Richtung ist erwartet, die Groesse klein; ein Wechsel
//    auf gemessene Profile waere ein Eingriff in die geteilte Rechen-Basis
//    (calcHourlyConsumption) und damit in JEDEN Rechner der Seite.
// 2. Speicher-Zugewinn etwas zu niedrig (−13 %): Folge von 1. — wo direkt schon
//    mehr genutzt wird, bleibt weniger Ueberschuss zum Einspeichern. Die
//    Saettigungsgrenze (ab ~1,5 kWh bringt mehr Kapazitaet fast nichts) ist bei
//    beiden Modellen dieselbe, und nur die traegt die Empfehlung.
// 3. Ost/West und Nord: siehe lib/solar-year.ts — dort divergieren PVGIS und die
//    HTW im Strahlungsmodell, das ist keine Eigenheit dieser Simulation.
//
// Nicht validiert: Verschattung (die HTW modelliert sie explizit, wir werfen sie
// mit Nord in eine Option) und Ertraege oberhalb von 800 Wp (die HTW-Werte fuer
// 2.000 Wp liegen 6,5 % unter unseren — teils die dokumentierte Verdichtungs-
// Abweichung von +3,5 % im haertesten Clipping-Fall, siehe lib/solar-year.ts).

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

        // Der Speicher haengt hier hinter dem Wechselrichter (AC-gekoppelt): Er
        // laedt aus dem GEDECKELTEN Ertrag, die gekappte Mittagsspitze ist fuer ihn
        // verloren. Reale Balkonspeicher (Anker, Zendure, Growatt) sind DC-gekoppelt
        // und koennten sie einfangen. Nachgerechnet (07/2026): Fuer die angebotenen
        // Groessen macht es exakt null Unterschied — 1,6 kWh sind aus dem normalen
        // Vormittags-Ueberschuss laengst voll, bevor mittags ueberhaupt gekappt wird.
        // Messbar wird es erst ab ~6 kWh (+46 kWh/a), und so grosse Speicher gibt es
        // am Balkon nicht. Deshalb bleibt die einfachere AC-Kopplung stehen; die HTW
        // modelliert an dieser Stelle ebenso.
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
