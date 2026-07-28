// Die Sätze unter „Was das für Sie bedeutet", je Gemeinde verschieden.
//
// Warum: Der Block stand mit denselben Sätzen auf 11.000 Seiten. Die Beträge
// darin waren schon standortabhängig, der Text nicht — und genau der Text ist
// es, den ein Leser als „ist das über uns oder über irgendwen?" liest.
//
// ZWEI REGELN, an denen die erste Fassung gescheitert ist:
//
// 1. Nichts wiederholen, was die Einleitung oben schon sagt. Dort stehen bereits
//    Anlagenzahl, Speicher, Rang im Kreis, Zubau und der Pro-Kopf-Abstand zum
//    Land. Ein Satz, der den Pro-Kopf-Abstand ein zweites Mal bringt, liest sich
//    als Textbaustein-Panne, nicht als Personalisierung. Übrig bleiben zwei
//    Fakten, die die Einleitung NICHT verwendet: der Standort-Ertrag und die
//    Zahl der gemeldeten Balkonkraftwerke.
//
// 2. Nichts behaupten, wofür keine Daten vorliegen. Zur Heizung weiß das
//    Marktstammdatenregister nichts — keine Wärmepumpe ist dort erfasst, und wie
//    viele Häuser einer Gemeinde mit Gas heizen, steht nirgends in unseren
//    Daten. Die Wärmepumpen-Karte bekommt deshalb bewusst KEINEN Ortssatz,
//    statt einen zu erfinden.
//
// Nebenwirkung von Regel 1, die den Ausschlag gab: Der Pro-Kopf-Abstand ist bei
// Gemeinden mit einem Solarpark grotesk („Riedenheim liegt 4.935 % über dem
// Schnitt") — der Standort-Ertrag ist es nie.

import { NATIONAL_AVG_YIELD } from "./constants";

export type SzenarioKontext = {
  name: string;
  /** Gemeldete Balkonkraftwerke in der Gemeinde. */
  balkonCount: number | null;
};

export type SzenarioTexte = {
  /** Steht erst, wenn der Standort-Ertrag geladen ist (siehe pvErtragSatz). */
  balkon: string | null;
};

const nf = (n: number) => n.toLocaleString("de-DE");

/** Ab hier ist ein Abstand zum Bundesschnitt eine Aussage und kein Rauschen. */
const DEUTLICH = 0.05;

export function gemeindeSzenarioTexte(k: SzenarioKontext): SzenarioTexte {
  return { balkon: balkonSatz(k) };
}

// Überschrift-Varianten. Bewusst OHNE Einwohnerbezeichnung („Stuttgarter",
// „Höchberger"): die lässt sich aus dem Ortsnamen nicht zuverlässig bilden —
// Bremen→Bremer, Halle→Hallenser, Kassel→Kasseler folgen keiner Regel, und ein
// falsch gebildeter Einwohnername ist auf der Seite der eigenen Gemeinde
// peinlicher als gar keiner. Diese drei Formen tragen jeden Ortsnamen.
const UEBERSCHRIFTEN = [
  (n: string) => `Was das für Menschen in ${n} bedeutet`,
  (n: string) => `Was das für Haushalte in ${n} bedeutet`,
  (n: string) => `Was das für die Bewohner von ${n} bedeutet`,
];

/**
 * Überschrift des Blocks, je Gemeinde verschieden — aber stabil: die Variante
 * hängt am Gebietsschlüssel, nicht am Zufall. Ein Zufallswert würde bei jedem
 * Aufbau eine andere Überschrift zeigen (und im Server-Render eine andere als
 * im Browser).
 */
export function szenarioUeberschrift(name: string, regionId: string): string {
  let summe = 0;
  for (let i = 0; i < regionId.length; i++) summe += regionId.charCodeAt(i);
  return UEBERSCHRIFTEN[summe % UEBERSCHRIFTEN.length](name);
}

/**
 * Ortssatz der PV-Karte: der Standort-Ertrag gegen den Bundesschnitt. Bewusst
 * OHNE Zahlenwert und Einheit — beides steht schon in der Parameterzeile der
 * Karte, und Einheiten werden im Projekt nie zweimal getippt.
 */
export function pvErtragSatz(name: string, ertragKwhKwp: number | null): string | null {
  if (ertragKwhKwp === null || !Number.isFinite(ertragKwhKwp) || ertragKwhKwp <= 0) return null;
  const dev = ertragKwhKwp / NATIONAL_AVG_YIELD - 1;
  const pct = Math.round(Math.abs(dev) * 100);
  if (dev >= DEUTLICH) {
    return `Der Standort liegt ${pct} % über dem Bundesschnitt — dieselbe Anlage bringt in ${name} mehr als anderswo.`;
  }
  if (dev <= -DEUTLICH) {
    return `Der Standort liegt ${pct} % unter dem Bundesschnitt — gerechnet ist das hier schon berücksichtigt.`;
  }
  return `Der Standort ${name} liegt im Bundesschnitt.`;
}

function balkonSatz(k: SzenarioKontext): string | null {
  if (k.balkonCount === null) return null;
  if (k.balkonCount === 0) return `In ${k.name} ist bisher kein einziges gemeldet.`;
  if (k.balkonCount === 1) return `In ${k.name} ist bisher genau eines gemeldet.`;
  return `In ${k.name} sind bisher ${nf(k.balkonCount)} gemeldet.`;
}
