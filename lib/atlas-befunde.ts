// Zwei belegte Aussagen über den Solarausbau, gerechnet aus denselben Zahlen
// wie die Ranglisten — damit sie nie auseinanderlaufen.
//
// WARUM ALS AUSSAGE UND NICHT ALS RANGLISTE: Beide Kennzahlen sind über Gruppen
// robust und über einzelne Orte nicht.
//
// - Speicher je kWp Dach: Der Median steigt lückenlos mit der Ortsgröße. Die
//   SPITZE dagegen besteht aus Registerfehlern — der bekannte Fall Finsing
//   (Gewerbe-Batterie als privat gemeldet) stünde auf Platz 1, und auch nach dem
//   Ausreißer-Filter ist die Spitze noch 9- bis 12-mal der Median, mit
//   rechnerisch über 80 kWh je "Hausspeicher". Ein Median frisst solche Fehler,
//   eine Rangliste krönt sie.
// - Freiflächen-Anteil: Die Rangkorrelation mit der Ortsgröße ist positiv
//   (+0,34) und heißt trotzdem das Gegenteil dessen, wonach sie klingt — sie
//   misst "hat überhaupt eine", nicht "wie viel". Erst die Aufteilung nach
//   Vorhandensein und Anteil zeigt, was los ist.

import type { GemeindeStats } from "./awards";

/** Größenklassen für die Gruppen-Aussagen. Amtliche Systematik, auf vier
 *  Stufen vereinfacht — feiner trägt die kleinste Klasse nicht mehr. */
export const GROESSENKLASSEN: { label: string; min: number; max: number }[] = [
  { label: "unter 5.000", min: 0, max: 5_000 },
  { label: "5.000–20.000", min: 5_000, max: 20_000 },
  { label: "20.000–100.000", min: 20_000, max: 100_000 },
  { label: "ab 100.000", min: 100_000, max: Infinity },
];

/** Ab so vielen Orten trägt ein Median. */
const MIN_ORTE = 20;

function median(werte: number[]): number | null {
  if (werte.length < MIN_ORTE) return null;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export type KlassenBefund = {
  label: string;
  orte: number;
  /** Batteriekapazität je installiertem kWp Dachleistung, Median. */
  speicherJeKwp: number | null;
  /** Anteil der Orte, die überhaupt eine Freiflächenanlage haben (0..1). */
  mitFreiflaeche: number | null;
  /** Und wo eine steht: ihr Anteil an der gesamten Solarleistung, Median. */
  freiflaecheAnteil: number | null;
};

export function befundeNachGroesse(stats: GemeindeStats[]): KlassenBefund[] {
  return GROESSENKLASSEN.map(({ label, min, max }) => {
    const g = stats.filter((s) => s.population >= min && s.population < max);
    const mitDach = g.filter((s) => s.privatDachKwp > 0);
    const mitFf = g.filter((s) => s.freiflaecheKwp > 0);
    return {
      label,
      orte: g.length,
      speicherJeKwp: median(mitDach.map((s) => s.batteriePrivatKwh / s.privatDachKwp)),
      mitFreiflaeche: g.length >= MIN_ORTE ? mitFf.length / g.length : null,
      freiflaecheAnteil: median(
        mitFf.map((s) => {
          const ges = s.privatDachKwp + s.gewerbeDachKwp + s.freiflaecheKwp + s.balkonKwp;
          return ges > 0 ? s.freiflaecheKwp / ges : 0;
        }),
      ),
    };
  }).filter((b) => b.orte >= MIN_ORTE);
}

/** Wächst die Speicherquote von der kleinsten zur größten Klasse — und um wie
 *  viel? Gibt null, wenn eine Klasse fehlt oder die Reihe nicht steigt; dann
 *  behauptet die Seite nichts. */
export function speicherTrend(befunde: KlassenBefund[]): { klein: number; gross: number; plusProzent: number } | null {
  const mitWert = befunde.filter((b) => b.speicherJeKwp !== null);
  if (mitWert.length < 2) return null;
  const klein = mitWert[0].speicherJeKwp as number;
  const gross = mitWert[mitWert.length - 1].speicherJeKwp as number;
  if (!(gross > klein) || klein <= 0) return null;
  // Monoton? Sonst ist "steigt mit der Ortsgröße" zu viel behauptet.
  for (let i = 1; i < mitWert.length; i++) {
    if ((mitWert[i].speicherJeKwp as number) < (mitWert[i - 1].speicherJeKwp as number)) return null;
  }
  return { klein, gross, plusProzent: Math.round((gross / klein - 1) * 100) };
}
