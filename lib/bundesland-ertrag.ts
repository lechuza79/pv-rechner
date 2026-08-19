// Typischer PV-Jahresertrag (kWh je kWp) pro Bundesland.
//
// Einzige Quelle dieser Werte im Projekt: PVGIS-Bundesland-Durchschnitte
// (optimale Ausrichtung), vorher als privater Fallback in lib/pvgis.ts.
// Herausgezogen, weil das Server-Modul (Supabase-Import) in Client-Komponenten
// nicht ladbar ist — die Ranking-Tabelle des Atlas rechnet im Browser mit
// denselben Zahlen. lib/pvgis.ts importiert von hier; eine zweite Kopie wäre
// ein Fehler, kein Duplikat.

import { NATIONAL_AVG_YIELD } from "./constants";

/** kWh/kWp und Jahr, PVGIS-Durchschnitt je Bundesland (optimale Ausrichtung). */
export const BL_ERTRAG: Record<string, number> = {
  BW: 1123, BY: 1123, BE: 1055, BB: 1052, HB: 991, HH: 985,
  HE: 1079, MV: 1022, NI: 1017, NW: 1035, RP: 1100, SL: 1089,
  SN: 1067, ST: 1074, SH: 983, TH: 1041,
};

// Amtlicher Gemeindeschlüssel: die ersten zwei Stellen sind das Bundesland.
const AGS_BL: Record<string, string> = {
  "01": "SH", "02": "HH", "03": "NI", "04": "HB", "05": "NW", "06": "HE",
  "07": "RP", "08": "BW", "09": "BY", "10": "SL", "11": "BE", "12": "BB",
  "13": "MV", "14": "SN", "15": "ST", "16": "TH",
};

/**
 * Typischer Jahresertrag für eine Atlas-Region (Bundesland, Kreis oder
 * Gemeinde) über den Bundesland-Anteil ihres Schlüssels. Bewusst auf
 * Bundesland-Auflösung: das ist der dominante Nord-Süd-Gradient; eine feinere
 * Auflösung je Gemeinde bräuchte materialisierte PVGIS-Abrufe (offener Punkt).
 */
export function ertragForRegionId(regionId: string): number {
  const bl = AGS_BL[regionId.slice(0, 2)];
  return (bl && BL_ERTRAG[bl]) || NATIONAL_AVG_YIELD;
}
