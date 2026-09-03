// Die Techniken, für die man ein Förder-Abo abschließen kann.
//
// EIGENES MODUL, weil es beide Seiten der Grenze braucht: Die Ablage liest und
// schreibt sie (server-only), das Anmeldefenster zeigt sie als Häkchen (im
// Browser). Läge die Liste in der Ablage, zöge das Fenster deren
// Server-Sperre mit — der Build bricht dann, und zwar mit einer Meldung, die
// nicht auf die Ursache zeigt.
//
// Dieselbe Einteilung wie im Förderkatalog, hier NICHT neu erfunden. Wer eine
// vierte Technik einführt, führt sie dort ein.

export type AboTechnik = "pv" | "balkon" | "waermepumpe";

export const ABO_TECHNIKEN: AboTechnik[] = ["pv", "balkon", "waermepumpe"];

export const ABO_TECHNIK_LABEL: Record<AboTechnik, string> = {
  pv: "Solaranlage aufs Dach",
  balkon: "Balkonkraftwerk",
  waermepumpe: "Wärmepumpe",
};

/**
 * Aus einer Eingabe die gültigen Techniken herausfiltern. Freitext fällt weg.
 *
 * Leer heißt „alles" — wer nichts abwählt, will alles wissen, und ein Abo ohne
 * jede Technik bekäme nie eine Mail. Das wäre eine Anmeldung, die
 * stillschweigend ins Leere läuft.
 */
export function techniken(roh: unknown): AboTechnik[] {
  if (!Array.isArray(roh)) return [];
  const gefiltert = ABO_TECHNIKEN.filter((t) => roh.includes(t));
  return gefiltert.length ? gefiltert : [...ABO_TECHNIKEN];
}
