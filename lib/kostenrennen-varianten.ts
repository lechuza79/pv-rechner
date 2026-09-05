// Die Aufstellungen des Stromkosten-Rennens: dieselben zwei Haushalte, drei
// Wege in die Zukunft. Das glatte Modell (der Rechner), ein historisches
// Wetter (die letzten 25 Sonnenjahre nacheinander) und ein historischer
// Strompreis (die Sprünge der letzten Jahre nacheinander).
//
// Beide Rückblicke sind BEISPIELE, keine Prognosen: Sie zeigen, wie ruppig ein
// realer Verlauf gegen die glatte Kurve aussieht — nicht, was kommt. Deshalb
// stehen sie als eigene, benannte Aufstellung neben dem Modell, nie darin.

import { kostenrennen, RENNEN_OHNE_MIT_PV, type Kostenrennen, type RennHaushalt, type RennParameter } from "./kostenrennen";
import { STRAHLUNG_JAHRE } from "./strahlungsjahre";
import { PRICE_HOUSEHOLD, PRICE_YEARS } from "./strommix-history";
import { YEARS } from "./constants";
import { DEFAULT_PRICES } from "./prices-config";

export interface RennVariante {
  key: "modell" | "wetter" | "preis";
  label: string;
  kurz: string;
  /** Ein Satz für die Seite und das Bild: was diese Aufstellung annimmt. */
  erklaerung: string;
  rennen: Kostenrennen;
}

/** Erstes Jahr der Wetter-Wiederholung: die letzten YEARS Jahre der DWD-Reihe. */
export function wetterFenster(): { von: number; bis: number } {
  const bis = STRAHLUNG_JAHRE[STRAHLUNG_JAHRE.length - 1].jahr;
  return { von: bis - YEARS + 1, bis };
}

/**
 * Ertragsfaktor je Betriebsjahr: Strahlung des wiederholten Kalenderjahrs ÷
 * Mittel des Fensters. Normiert auf das FENSTER, nicht auf einen absoluten
 * Anker: Welche Strahlung unserem Referenzertrag entspricht, ist nicht
 * belegt — belegt ist nur, wie stark die Jahre um ihr Mittel streuen. So
 * bleibt die Menge über 25 Jahre die des Rechners, nur ihre Verteilung ist echt.
 */
export function wetterFaktoren(): number[] {
  const { von, bis } = wetterFenster();
  const reihe = STRAHLUNG_JAHRE.filter((r) => r.jahr >= von && r.jahr <= bis).map((r) => r.kwhM2);
  if (reihe.length !== YEARS) throw new Error(`Wetterfenster ${von}–${bis} hat ${reihe.length} statt ${YEARS} Jahre`);
  const mittel = reihe.reduce((a, b) => a + b, 0) / reihe.length;
  return reihe.map((v) => v / mittel);
}

/**
 * Preisfaktor je Betriebsjahr gegenüber heute: die Veränderung des
 * Haushaltsstrompreises seit dem ersten Jahr der Eurostat-Reihe, Jahr für
 * Jahr — inklusive des Sprungs 2022/23. Die Reihe ist kürzer als 25 Jahre;
 * danach läuft der Preis mit der Steigerung des Modells weiter.
 */
export function preisFaktoren(steigerung = DEFAULT_PRICES.electricityIncrease): { faktoren: number[]; von: number; bis: number } {
  const basis = PRICE_HOUSEHOLD[0];
  const faktoren: number[] = [];
  for (let i = 1; i <= YEARS; i++) {
    if (i < PRICE_HOUSEHOLD.length) faktoren.push(PRICE_HOUSEHOLD[i] / basis);
    else faktoren.push(faktoren[faktoren.length - 1] * (1 + steigerung));
  }
  return { faktoren, von: PRICE_YEARS[0], bis: PRICE_YEARS[PRICE_YEARS.length - 1] };
}

export function kostenrennenVarianten(
  haushalte: RennHaushalt[] = RENNEN_OHNE_MIT_PV,
  p: RennParameter = {},
): RennVariante[] {
  const prices = p.prices ?? DEFAULT_PRICES;
  const steigerung = p.stromSteigerung ?? prices.electricityIncrease;
  const wf = wetterFaktoren();
  const { von: wVon, bis: wBis } = wetterFenster();
  const pf = preisFaktoren(steigerung);
  return [
    {
      key: "modell",
      label: "Glattes Modell",
      kurz: "Modell",
      erklaerung: "So rechnet der Rechner: jedes Jahr derselbe Ertrag, der Strompreis steigt gleichmäßig.",
      rennen: kostenrennen(haushalte, p),
    },
    {
      key: "wetter",
      label: `Wetter wie ${wVon}–${wBis}`,
      kurz: "Wetterjahre",
      erklaerung: `Die Sonnenjahre ${wVon}–${wBis} laufen nacheinander noch einmal ab (Deutscher Wetterdienst): Das beste Jahr bringt rund ein Fünftel mehr Ertrag als das schlechteste. Die Gesamtmenge über 25 Jahre bleibt die des Modells.`,
      rennen: kostenrennen(haushalte, {
        ...p,
        verlauf: { ertragsfaktorImJahr: (i) => wf[i - 1] ?? 1 },
        verlaufText: { wetter: `Verteilung wie die Sonnenjahre ${wVon}–${wBis} (Gebietsmittel Deutschland, DWD), Gesamtmenge wie im Modell` },
      }),
    },
    {
      key: "preis",
      label: `Strompreis wie ${pf.von}–${pf.bis}`,
      kurz: "Preissprünge",
      erklaerung: `Der Strompreis macht die Sprünge der Jahre ${pf.von}–${pf.bis} noch einmal (Eurostat, Haushaltsstrom): jahrelang fast flach, dann 2023 auf einmal gut ein Fünftel mehr. Danach steigt er wie im Modell weiter.`,
      rennen: kostenrennen(haushalte, {
        ...p,
        verlauf: { strompreisImJahr: (i) => prices.electricityPrice * (pf.faktoren[i - 1] ?? 1) },
        verlaufText: { preis: `Verlauf wie ${pf.von}–${pf.bis} (Eurostat), danach ${(Math.round(steigerung * 1000) / 10).toLocaleString("de-DE")} % pro Jahr` },
      }),
    },
  ];
}
