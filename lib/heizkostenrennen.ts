// Das Heizkosten-Rennen: EIN Haus, neue Gasheizung gegen Wärmepumpe, 20 Jahre,
// Tag für Tag. Beide Linien zeichnen, was das Haus bis dahin fürs Heizen
// ausgegeben hat — jede startet mit ihrer Anschaffung (die Wärmepumpe nach
// Förderung vorn, die Gasheizung billiger), dann zählt jeder Tag Brennstoff
// bzw. Strom, Grundpreis und Wartung. Wo die Gas-Linie die Wärmepumpen-Linie
// kreuzt, ist der Mehrpreis der Wärmepumpe zurück — dasselbe Jahr wie die
// Amortisation des Wärmepumpen-Rechners (per Test festgenagelt).
//
// Die MENGE kommt vollständig aus dem Wärmepumpen-Rechner (calcHeatPump,
// Feld kostenJeJahr) — hier wird nichts nachgerechnet, nur verteilt. Die FORM
// kommt vom Wetter: Der Heizanteil eines Jahres verteilt sich nach den
// Gradtagen des wiederholten Kalendertags (lib/temperatur-tage.ts, DWD-Tages-
// mittel als Stationsmittel), und die Jahre untereinander wiegen nach ihrer
// Gradtagzahl, normiert auf das Mittel des Fensters. Warmwasser, Grundpreis
// und Wartung laufen gleichmäßig über die Tage. Ein Referenzprofil für alle
// Jahre sähe aus wie erfunden (dieselbe Lehre wie beim Stromkosten-Rennen).
//
// Was das Modell NICHT tut: die Arbeitszahl im Winter absenken. Das wäre eine
// neue Modellannahme, die der Rechner nicht kennt — beide Seiten folgen
// derselben Gradtag-Form, die Jahresmenge bleibt die des Rechners.

import { calcHeatPump, heatPumpScenarioAdj, type HeatPumpInputs, type HeatPumpResult } from "./heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { PERSONEN, HAUSTYP_WP, INSULATION_BESTAND, YEAR } from "./constants";
import { TEMPERATUR_TAGE, TEMPERATUR_TAGE_META } from "./temperatur-tage";

/** Gradtagzahl nach VDI 2067 / DIN 4108-6: Heiztag, wenn das Tagesmittel unter
 *  der Heizgrenze liegt; gezählt wird die Differenz zur Raumtemperatur (G20/15). */
export const HEIZGRENZE_C = 15;
export const RAUMTEMPERATUR_C = 20;

/** Dasselbe Muster-Haus wie die „unsaniert"-Variante des Grüngas-Widgets auf
 *  derselben Seite — zwei Häuser auf einer Seite wären ein Widerspruch. */
export const HEIZKOSTENRENNEN_HAUS: HeatPumpInputs = {
  situation: "bestand", wohnflaeche: 140, insulationIdx: 0,
  personen: PERSONEN[2].count, heizsystem: "hk_alt", wpType: "lwwp",
  haustypFaktor: HAUSTYP_WP[0].faktor, override: { klimaBonus: true },
  // Eine NEUE Gasheizung im Bestand unterliegt der Beimischungspflicht
  // (§ 43 GModG) — die Regel, ob sie greift, steht in lib/fossil-reference.ts.
  greenGas: true,
};

export interface HeizLaeufer {
  key: "gas" | "wp";
  label: string;
  kurz: string;
  /** Anschaffung am Tag null (Wärmepumpe nach Förderung). */
  investition: number;
  /** Aufgelaufene Heizkosten je Tag (Index 0 = Start = Anschaffung). */
  kosten: Float64Array;
}

export interface Heizkostenrennen {
  startJahr: number;
  jahre: number;
  /** Zahl der Tage (Index 0 = Start, dann Tag 1 … tage). */
  tage: number;
  /** Tagesindex des ersten Tags jedes Monats (Index 0 = Start). */
  ersterTag: number[];
  /** Tagesindex → Monatsindex 1..12·jahre. */
  monatVonTag: Uint16Array;
  gas: HeizLaeufer;
  wp: HeizLaeufer;
  /** Erster Tag, ab dem die Gas-Linie DAUERHAFT über der Wärmepumpe liegt (null = nie). */
  bezahltTag: number | null;
  /** Welche Kalenderjahre als Wetter durchlaufen (null ohne Wetter). */
  wetterFenster: { von: number; bis: number } | null;
  /** Das Rechner-Ergebnis, aus dem alles stammt (für Texte und Tests). */
  rechner: HeatPumpResult;
  haus: { wohnflaeche: number; daemmung: string; personen: number };
}

function tageImJahr(jahr: number): number {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 366 : 365;
}

/** Gradtage je Tag eines Kalenderjahrs aus dem DWD-Stationsmittel; null, wenn
 *  das Jahr fehlt oder einen Tag ohne Wert hat — dann gilt gleiche Verteilung,
 *  nichts wird erfunden. */
export function gradtageJeTag(kalenderJahr: number): number[] | null {
  const jahr = TEMPERATUR_TAGE.find((r) => r.jahr === kalenderJahr);
  if (!jahr || jahr.tage.length !== tageImJahr(kalenderJahr) || jahr.tage.some((t) => t === null)) return null;
  return jahr.tage.map((zehntel) => {
    const t = (zehntel as number) / 10;
    return t < HEIZGRENZE_C ? RAUMTEMPERATUR_C - t : 0;
  });
}

/** Die letzten 20 vollen Kalenderjahre der Temperaturreihe — so viele, wie der Rechner Jahre rechnet. */
export function heizWetterFenster(jahre: number = DEFAULT_HEATPUMP_CONFIG.years): { von: number; bis: number } {
  const bis = TEMPERATUR_TAGE_META.letztesJahr;
  return { von: bis - jahre + 1, bis };
}

export interface HeizkostenrennenOptionen {
  /** false = gleiche Verteilung ohne Wetter (für den Abgleich mit dem Rechner). */
  wetter?: boolean;
}

export function heizkostenrennen(opts: HeizkostenrennenOptionen = {}): Heizkostenrennen {
  const cfg = DEFAULT_HEATPUMP_CONFIG;
  const wetter = opts.wetter ?? true;
  const r = calcHeatPump(HEIZKOSTENRENNEN_HAUS, cfg, heatPumpScenarioAdj("realistic"));
  const jahre = cfg.years;
  const fenster = wetter ? heizWetterFenster(jahre) : null;
  const heizAnteil = r.qGes > 0 ? r.qHeiz / r.qGes : 0;
  const wwAnteil = 1 - heizAnteil;

  // Gradtage je Fensterjahr; die Jahresgewichte normieren auf das Fenster-
  // Mittel, damit die Menge über 20 Jahre die des Rechners bleibt.
  const gradtage: (number[] | null)[] = [];
  for (let i = 0; i < jahre; i++) gradtage.push(fenster ? gradtageJeTag(fenster.von + i) : null);
  const summen = gradtage.map((g) => (g ? g.reduce((a, b) => a + b, 0) : null));
  const gueltig = summen.filter((s): s is number => s !== null);
  const mittel = gueltig.length > 0 ? gueltig.reduce((a, b) => a + b, 0) / gueltig.length : 0;

  const k = r.kostenJeJahr;
  const gas: number[] = [k.fossil.invest];
  const wp: number[] = [k.wp.invest];
  const ersterTag: number[] = [0];
  const monatVonTag: number[] = [0];

  for (let i = 0; i < jahre; i++) {
    const kalenderJahr = fenster ? fenster.von + i : 2001; // ohne Wetter ein Nicht-Schaltjahr
    const g = gradtage[i];
    const n = g ? g.length : tageImJahr(kalenderJahr);
    const jahresgewicht = g && mittel > 0 ? (summen[i] as number) / mittel : 1;
    const gSumme = g ? (summen[i] as number) : 0;
    // Monatsgrenzen aus dem Kalender dieses Jahres.
    let tagImJahr = 0;
    for (let m = 0; m < 12; m++) {
      const tageM = new Date(Date.UTC(kalenderJahr, m + 1, 0)).getUTCDate();
      ersterTag.push(monatVonTag.length);
      for (let d = 0; d < tageM; d++) monatVonTag.push(12 * i + m + 1);
      tagImJahr += tageM;
    }
    if (tagImJahr !== n) throw new Error(`Kalender ${kalenderJahr}: ${tagImJahr} Tage gegen ${n} in der Wetterreihe`);

    const gasJahr = k.fossil.brennstoff[i];
    const stromJahr = k.wp.strom[i];
    const gasGleich = (gasJahr * wwAnteil + k.fossil.neben) / n;
    const wpGleich = (stromJahr * wwAnteil + k.wp.neben - k.wp.pvNutzen[i]) / n;
    let gStand = gas[gas.length - 1];
    let wStand = wp[wp.length - 1];
    for (let d = 0; d < n; d++) {
      const heizGewicht = g && gSumme > 0 ? (g[d] / gSumme) * jahresgewicht : 1 / n;
      gStand += gasJahr * heizAnteil * heizGewicht + gasGleich;
      wStand += stromJahr * heizAnteil * heizGewicht + wpGleich;
      gas.push(gStand);
      wp.push(wStand);
    }
  }

  const T = gas.length - 1;
  // Bezahlt = ab wann die Gas-Linie dauerhaft oben liegt (dieselbe Regel wie
  // die Amortisation des Rechners: ein Kreuzen, das wieder verschwindet, zählt nicht).
  let bezahltTag: number | null = null;
  for (let d = T; d >= 0; d--) {
    if (gas[d] >= wp[d]) bezahltTag = d; else break;
  }
  if (bezahltTag === 0 && gas[0] < wp[0]) bezahltTag = null;

  const daemmung = INSULATION_BESTAND[HEIZKOSTENRENNEN_HAUS.insulationIdx].label.toLowerCase();
  return {
    startJahr: YEAR,
    jahre,
    tage: T,
    ersterTag,
    monatVonTag: Uint16Array.from(monatVonTag),
    gas: { key: "gas", label: "Neue Gasheizung", kurz: "Gas", investition: k.fossil.invest, kosten: Float64Array.from(gas) },
    wp: { key: "wp", label: "Wärmepumpe", kurz: "Wärmepumpe", investition: k.wp.invest, kosten: Float64Array.from(wp) },
    bezahltTag,
    wetterFenster: fenster,
    rechner: r,
    haus: { wohnflaeche: HEIZKOSTENRENNEN_HAUS.wohnflaeche, daemmung, personen: HEIZKOSTENRENNEN_HAUS.personen },
  };
}

/** Kalenderdatum eines Tagesindex. Betriebsjahr 1 = startJahr: Der Rechner
 *  preist Jahr i mit dem Kalenderjahr YEAR + i − 1 (Grüngas-Stufen, CO₂-Pfad), und
 *  das Grüngas-Widget auf derselben Seite beschriftet genauso — die Stufe 2029
 *  muss im Rennen auf 2029 fallen, nicht ein Jahr daneben. */
export function heizTagDatum(r: Heizkostenrennen, tagIdx: number): { jahr: number; monat: number; tag: number } {
  const k = r.monatVonTag[Math.min(tagIdx, r.tage)] || 1;
  const i = Math.ceil(k / 12);
  const monat = (k - 1) % 12;
  const tag = Math.max(1, tagIdx - r.ersterTag[k] + 1);
  return { jahr: r.startJahr + i - 1, monat, tag };
}
