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
  /** Waehlt die Satzvariante — stabil je Gemeinde. */
  regionId?: string;
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
  return UEBERSCHRIFTEN[variante(regionId, UEBERSCHRIFTEN.length)](name);
}

/**
 * Ortssatz der PV-Karte: der Standort-Ertrag gegen den Bundesschnitt. Bewusst
 * OHNE Zahlenwert und Einheit — beides steht schon in der Parameterzeile der
 * Karte, und Einheiten werden im Projekt nie zweimal getippt.
 */
export function pvErtragSatz(name: string, ertragKwhKwp: number | null, regionId?: string): string | null {
  if (ertragKwhKwp === null || !Number.isFinite(ertragKwhKwp) || ertragKwhKwp <= 0) return null;
  const dev = ertragKwhKwp / NATIONAL_AVG_YIELD - 1;
  const pct = Math.round(Math.abs(dev) * 100);
  const formen =
    dev >= DEUTLICH
      ? [
          `Der Standort liegt ${pct} % über dem Bundesschnitt — dieselbe Anlage bringt in ${name} mehr als anderswo.`,
          `In ${name} scheint die Sonne ergiebiger als im Bundesschnitt: ${pct} % mehr Ertrag je Anlage.`,
          `${name} liegt ${pct} % über dem Bundesschnitt — ein Dach hier arbeitet besser als der Durchschnitt.`,
        ]
      : dev <= -DEUTLICH
        ? [
            `Der Standort liegt ${pct} % unter dem Bundesschnitt — in der Rechnung ist das schon berücksichtigt.`,
            `In ${name} fällt der Ertrag ${pct} % geringer aus als im Bundesschnitt; die Beträge oben sind entsprechend gerechnet.`,
            `${name} liegt ${pct} % unter dem Bundesschnitt — die Zahl daneben hält das bereits aus.`,
          ]
        : [
            `Der Standort ${name} liegt im Bundesschnitt.`,
            `In ${name} entspricht der Ertrag ziemlich genau dem Bundesschnitt.`,
            `${name} liegt beim Ertrag auf Höhe des Bundesschnitts.`,
          ];
  return formen[variante(regionId ?? name, formen.length)];
}

/** Stabile Variantenwahl: gleicher Ort → gleicher Satz, bei jedem Aufbau. */
function variante(schluessel: string, anzahl: number): number {
  let summe = 0;
  for (let i = 0; i < schluessel.length; i++) summe += schluessel.charCodeAt(i);
  return summe % anzahl;
}

function balkonSatz(k: SzenarioKontext): string | null {
  if (k.balkonCount === null) return null;
  const n = k.balkonCount;
  const formen =
    n === 0
      ? [
          `In ${k.name} ist bisher kein einziges gemeldet.`,
          `Gemeldet ist in ${k.name} bislang keines.`,
          `${k.name} hat bisher kein einziges im Register.`,
        ]
      : n === 1
        ? [
            `In ${k.name} ist bisher genau eines gemeldet.`,
            `Gemeldet ist in ${k.name} bislang genau eines.`,
            `${k.name} hat bisher genau eines im Register.`,
          ]
        : [
            `In ${k.name} sind bisher ${nf(n)} gemeldet.`,
            `Gemeldet sind in ${k.name} bislang ${nf(n)}.`,
            `${k.name} hat ${nf(n)} davon im Register.`,
          ];
  return formen[variante(k.regionId ?? k.name, formen.length)];
}
