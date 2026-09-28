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

// One formatter per option set, built once (28.09.2026). `toLocaleString` with
// options builds a new Intl.NumberFormat on EVERY call; the monitor charts call
// this for every day of a year, and the profile of a district page showed this
// one line as the largest single cost of its server render (≈ 230 ms over seven
// pages). Same locale, same options, therefore the same strings.
const FORMATTER = {
  stellen0: new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }),
  stellen1: new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }),
  signifikant2: new Intl.NumberFormat("de-DE", { maximumSignificantDigits: 2 }),
};
const de = (wert: number, stellen: 0 | 1) => (stellen === 1 ? FORMATTER.stellen1 : FORMATTER.stellen0).format(wert);

/** Erzeugte Energie eines Tages, Monats oder Jahres. */
export function energieTeile(mwh: number): Messgroesse {
  if (mwh >= 1000) return { value: de(mwh / 1000, 1), unit: "GWh" };
  if (mwh >= 1) return { value: de(mwh, 1), unit: "MWh" };
  return { value: de(mwh * 1000, 0), unit: "kWh" };
}

/** Momentanleistung — kW/MW, nie „Peak": gemeint ist, was gerade fließt. */
export function leistungTeile(mw: number): Messgroesse {
  if (mw >= 1) return { value: FORMATTER.signifikant2.format(mw), unit: "MW" };
  return { value: FORMATTER.signifikant2.format(mw * 1000), unit: "kW" };
}

/**
 * Maßstab für eine Kennzahl-REIHE: Die Einheit hängt am heutigen Wert und gilt
 * dann für alle Monate der Reihe — sonst stünde derselbe Verlauf mal in kWp,
 * mal in MWp, und die Kurve spränge ohne Anlass.
 *
 * Die dritte Stufe (`riesig`, ab einer Million) kam mit den Länder- und
 * Deutschland-Seiten: Ohne sie stand dort „33.482,1 MWh" statt „33,5 GWh" und
 * die Solarleistung in MWp neben „129,2 GWp" aus dem Formatierer der Seite.
 * Dieselbe Schwelle wie in lib/atlas-format.ts.
 */
export function reihenMassstab(
  heute: number,
  klein: string,
  gross: string,
  riesig?: string,
): { teiler: number; unit: string; digits: number } {
  if (riesig && heute >= 1_000_000) return { teiler: 1_000_000, unit: riesig, digits: 1 };
  if (heute >= 1000) return { teiler: 1000, unit: gross, digits: 1 };
  // Unter zehn zählt die Nachkommastelle: ein halbes Kilowatt als „1 kWp"
  // zu runden verdoppelt die Anlage des Dorfes.
  return { teiler: 1, unit: klein, digits: heute < 10 ? 1 : 0 };
}
