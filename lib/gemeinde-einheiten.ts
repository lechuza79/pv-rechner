/**
 * Einheiten der Ortsseite: Zahl und Einheit getrennt, Einheit nach der Größe
 * des Orts.
 *
 * GEMESSEN am 22.09.2026 über alle 10.764 Ortspakete: In 1.049 Orten (10 %)
 * stand in der Mitte des Monatsdiagramms „0 GWh" für einen Monat, in dem die
 * Anlagen 20–50 MWh erzeugt haben, und in 106 Orten trug die Skala daneben
 * „0,0002 MW". Dieselbe Klasse traf die Kennzahlen: ein Dorf mit einem
 * Balkonkraftwerk zeigte „0,0 MWp" installierte Leistung und „0,0 MWh"
 * Speicherkapazität. Eine Null behauptet, es gebe dort nichts — das ist
 * derselbe Fehler wie eine falsche Einheit, nur schwerer zu bemerken.
 *
 * Die Schwellen sind dieselben wie im Atlas-Formatierer (ab vier Stellen die
 * nächstgrößere Einheit); eine zweite Schwellen-Fassung wäre eine zweite
 * Wahrheit. Eigene Funktionen sind es trotzdem, weil hier ERZEUGTE Energie und
 * MOMENTANLEISTUNG gemeint sind — nicht Speicherkapazität und nicht
 * Peak-Leistung.
 */
export type Messgroesse = { value: string; unit: string };

const de = (wert: number, stellen: number) => wert.toLocaleString("de-DE", { maximumFractionDigits: stellen });

/** Erzeugte Energie eines Tages, Monats oder Jahres. */
export function energieTeile(mwh: number): Messgroesse {
  if (mwh >= 1000) return { value: de(mwh / 1000, 1), unit: "GWh" };
  if (mwh >= 1) return { value: de(mwh, 1), unit: "MWh" };
  return { value: de(mwh * 1000, 0), unit: "kWh" };
}

/** Momentanleistung — kW/MW, nie „Peak": gemeint ist, was gerade fließt. */
export function leistungTeile(mw: number): Messgroesse {
  if (mw >= 1) return { value: mw.toLocaleString("de-DE", { maximumSignificantDigits: 2 }), unit: "MW" };
  return { value: (mw * 1000).toLocaleString("de-DE", { maximumSignificantDigits: 2 }), unit: "kW" };
}

/**
 * Maßstab für eine Kennzahl-REIHE: Die Einheit hängt am heutigen Wert und gilt
 * dann für alle Monate der Reihe — sonst stünde derselbe Verlauf mal in kWp,
 * mal in MWp, und die Kurve spränge ohne Anlass.
 */
export function reihenMassstab(
  heute: number,
  klein: string,
  gross: string,
): { teiler: number; unit: string; digits: number } {
  if (heute >= 1000) return { teiler: 1000, unit: gross, digits: 1 };
  // Unter zehn zählt die Nachkommastelle: ein halbes Kilowatt als „1 kWp"
  // zu runden verdoppelt die Anlage des Dorfes.
  return { teiler: 1, unit: klein, digits: heute < 10 ? 1 : 0 };
}
