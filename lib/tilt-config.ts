// ─── Neigung × Ausrichtung: relativer PV-Ertrag (Anteil vom Optimum) ─────────
//
// DATENHERKUNFT (kein Schätzwert, keine Literatur-Tabelle): am 04.08.2026 per
// PVGIS v5.2 PVcalc (Europäische Kommission, JRC) selbst abgerufen — dieselbe
// Quelle, aus der die Rechner ihre Standort-Erträge beziehen. Referenzstandort
// ist die geographische Mitte Deutschlands (lat 51.16, lon 10.45), 1 kWp,
// 14 % Systemverluste (PVGIS-Default). Bester Wert der Matrix: 1.050 kWh/kWp
// bei Süd / 40° — alle Prozentwerte sind auf dieses Optimum normiert und aus
// den ROHWERTEN gerundet (kein doppeltes Runden über Zwischenprozente).
//
// Südost/Südwest sowie Ost/West sind je Paar gemittelt: die Rohwerte weichen
// am Referenzstandort um höchstens einen Prozentpunkt voneinander ab.
//
// Die Solargeometrie ändert sich nicht — diese Tabelle braucht keinen Wächter.
// Sie beschreibt die FORM des Zusammenhangs (relative Prozente); der absolute
// Ertrag eines konkreten Standorts kommt weiterhin live aus /api/pvgis.
// Realitäts-Anker: lib/__tests__/tilt-config.test.ts.

export type TiltOrientation = "sued" | "suedostwest" | "ostwest" | "nord";

export interface TiltRow {
  /** Dachneigung in Grad (0 = Flachdach, 90 = Fassade). */
  angle: number;
  sued: number;
  suedostwest: number;
  ostwest: number;
  nord: number;
}

export const TILT_REFERENCE = {
  lat: 51.16,
  lon: 10.45,
  fetchedIso: "2026-08-04",
  method: "PVGIS v5.2 PVcalc, 1 kWp, 14 % Systemverluste",
  /** Jahresertrag des Optimums (Süd, 40°) am Referenzstandort, kWh je kWp. */
  optimumKwhKwp: 1050,
} as const;

export const TILT_ORIENTATIONS: ReadonlyArray<{ key: TiltOrientation; label: string }> = [
  { key: "sued", label: "Süd" },
  { key: "suedostwest", label: "Südost / Südwest" },
  { key: "ostwest", label: "Ost / West" },
  { key: "nord", label: "Nord" },
];

/** Anteil vom optimalen Ertrag in Prozent, je Neigung und Ausrichtung. */
export const TILT_TABLE: ReadonlyArray<TiltRow> = [
  { angle: 0, sued: 85, suedostwest: 85, ostwest: 85, nord: 85 },
  { angle: 10, sued: 92, suedostwest: 89, ostwest: 84, nord: 76 },
  { angle: 15, sued: 94, suedostwest: 91, ostwest: 84, nord: 72 },
  { angle: 20, sued: 96, suedostwest: 93, ostwest: 83, nord: 67 },
  { angle: 25, sued: 98, suedostwest: 94, ostwest: 82, nord: 63 },
  { angle: 30, sued: 99, suedostwest: 94, ostwest: 81, nord: 58 },
  { angle: 35, sued: 100, suedostwest: 94, ostwest: 80, nord: 54 },
  { angle: 40, sued: 100, suedostwest: 94, ostwest: 79, nord: 49 },
  { angle: 45, sued: 100, suedostwest: 93, ostwest: 77, nord: 45 },
  { angle: 50, sued: 98, suedostwest: 92, ostwest: 75, nord: 41 },
  { angle: 60, sued: 95, suedostwest: 88, ostwest: 70, nord: 34 },
  { angle: 70, sued: 89, suedostwest: 82, ostwest: 64, nord: 28 },
  { angle: 90, sued: 71, suedostwest: 66, ostwest: 50, nord: 19 },
];

/** Der Optimalbereich, wie ihn die Tabelle tatsächlich zeigt (100 %-Zellen). */
export const TILT_OPTIMUM = { orientation: "sued" as TiltOrientation, minAngle: 35, maxAngle: 45 };

/** Prozentwert für eine Ausrichtung + Neigung — nächstliegende Tabellenzeile.
 *  Grundlage des Schnell-Checks; bewusst keine Interpolation (die Tabelle ist
 *  in 5–10°-Schritten dicht genug, und interpolierte Scheingenauigkeit würde
 *  mehr suggerieren, als eine Referenzstandort-Tabelle hergibt). */
export function tiltPct(orientation: TiltOrientation, angle: number): number {
  let bestRow = TILT_TABLE[0];
  for (const row of TILT_TABLE) {
    if (Math.abs(row.angle - angle) < Math.abs(bestRow.angle - angle)) bestRow = row;
  }
  return bestRow[orientation];
}
