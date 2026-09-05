// Das Stromkosten-Rennen: mehrere Haushalte, dieselben 25 Jahre — wer hat am
// Ende wie viel für Strom ausgegeben?
//
// Reine Rechenschicht ohne UI. Sie erfindet KEIN eigenes Fundament (CLAUDE.md,
// „Geteilte Rechen-Basis"): Der Jahresverbrauch kommt aus PERSONEN + den
// Großverbrauchern, die Anschaffung aus estimateCost, der Eigenverbrauch aus
// dem HTW-Power-Law, und der jährliche Nutzen einer Anlage ist exakt die
// Amortisationsrechnung des Rechners (`calc`). Damit kann das Rennen nie etwas
// anderes behaupten als der Rechner daneben: Die kumulierten Stromkosten eines
// PV-Haushalts sind die Kosten desselben Haushalts ohne Anlage MINUS der
// kumulierte Gewinn aus `calc` (der die Anschaffung als negativen Start trägt).
//
// Ein „Läufer" ist eine Haushaltskonfiguration; `kwp: 0` heißt „keine Anlage".
// Varianten (andere Haushaltsgröße, Speicher, E-Auto, Wärmepumpe) sind weitere
// Läufer — nicht weitere Rechenwege.

import { PERSONEN, YEARS, YEAR, NATIONAL_AVG_YIELD } from "./constants";
import { calc, calcEigenverbrauch, calcWeightedFeedIn, estimateCost, batteryReplaceCost } from "./calc";
import { calcExtraConsumption } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

export interface RennHaushalt {
  /** Stabiler Schlüssel (Farbe, Sortierung, Tests). */
  key: string;
  /** Vollständige Beschriftung („Mit PV-Anlage"). */
  label: string;
  /** Kurzform für enge Stellen („Mit PV"). */
  kurz: string;
  /** Index in PERSONEN (Jahresverbrauch). */
  personenIdx: number;
  /** Index in NUTZUNG (Tagquote → Eigenverbrauch). */
  nutzungIdx: number;
  /** Anlagengröße; 0 = keine Anlage. */
  kwp: number;
  speicherKwh: number;
  wp?: "nein" | "ja";
  ea?: "nein" | "ja";
  eaKm?: number;
}

export interface RennParameter {
  prices?: PriceConfig;
  feedIn?: FeedInRates;
  /** Standort-Ertrag kWh/kWp (Optimum); ohne Angabe der Bundesschnitt. */
  ertragKwp?: number;
  /** Strompreis-Anstieg p. a.; ohne Angabe der Wert der Preis-Config. */
  stromSteigerung?: number;
}

export interface RennLaeufer {
  key: string;
  label: string;
  kurz: string;
  hatPv: boolean;
  kwp: number;
  speicherKwh: number;
  /** Anschaffung im Jahr 0 (0 ohne Anlage). */
  investition: number;
  /** Jahresverbrauch des Haushalts, kWh. */
  verbrauchKwh: number;
  /** Eigenverbrauchsanteil in %, null ohne Anlage. */
  eigenverbrauchPct: number | null;
  /**
   * Kumulierte Stromausgaben, Index = Jahr 0..YEARS. Jahr 0 ist die
   * Anschaffung (ohne Anlage: 0). Enthält Netzstrom, minus Einspeise-Erlös,
   * plus Akku-Tausch — alles, was auch der Rechner rechnet.
   */
  kumuliert: number[];
}

export interface Kostenrennen {
  startJahr: number;
  /** Zahl der gerechneten Jahre (Index 0..jahre). */
  jahre: number;
  laeufer: RennLaeufer[];
  /** Schlüssel des Läufers OHNE Anlage, gegen den verglichen wird. */
  referenzKey: string;
  /**
   * Je Läufer mit Anlage: das erste Jahr, ab dem er dauerhaft weniger
   * ausgegeben hat als die Referenz — null, wenn nie. Für denselben Haushalt
   * ist das exakt die Amortisation des Rechners (per Test festgenagelt).
   */
  ueberholJahr: Record<string, number | null>;
  annahmen: {
    strompreisCt: number;
    steigerungPct: number;
    ertragKwp: number;
    einspeisungCt: number;
  };
}

// Derselbe Beispielhaushalt wie in /ratgeber/lohnt-sich-pv-mit-speicher —
// 3–4 Personen, teils im Homeoffice. Zwei Fassungen desselben Haushalts auf
// einer Seite wären ein Widerspruch, den man erst beim Vergleich zweier Zahlen
// bemerkt.
const TYPISCH = { personenIdx: 2, nutzungIdx: 1 } as const;

/**
 * Die Grundaufstellung: derselbe Haushalt ohne und mit Anlage — 10 kWp ohne
 * Speicher, die Voreinstellung des Rechners.
 *
 * Bewusst OHNE Speicher: Mit 5 oder 10 kWh läuft der Eigenverbrauch des
 * Power-Laws für diesen Haushalt an seine physikalische Kappung (Verbrauch ÷
 * Ertrag), und der Einspeise-Erlös übersteigt dann die restliche Stromrechnung —
 * die kumulierten Netto-Ausgaben SINKEN Jahr für Jahr, bis der Akku-Tausch sie
 * wieder anhebt. Das ist im Modell konsistent (gemessen 05.09.2026: 18.000 →
 * 12.273 € nach 20 Jahren), aber als Rennen unlesbar: ein Balken, der
 * rückwärts läuft. Speicher-Varianten sind weitere Läufer; das Widget muss
 * schrumpfende Balken darstellen können.
 */
export const RENNEN_OHNE_MIT_PV: RennHaushalt[] = [
  { key: "ohne", label: "Ohne PV-Anlage", kurz: "Ohne PV", ...TYPISCH, kwp: 0, speicherKwh: 0 },
  { key: "mit", label: "Mit PV-Anlage (10 kWp)", kurz: "Mit PV", ...TYPISCH, kwp: 10, speicherKwh: 0 },
];

function jahresverbrauch(h: RennHaushalt): number {
  return PERSONEN[h.personenIdx].verbrauch + calcExtraConsumption(h.wp ?? "nein", h.ea ?? "nein", h.eaKm ?? 0);
}

export function kostenrennen(haushalte: RennHaushalt[], p: RennParameter = {}): Kostenrennen {
  const prices = p.prices ?? DEFAULT_PRICES;
  const feedIn = p.feedIn ?? DEFAULT_FEED_IN;
  const ertragKwp = p.ertragKwp ?? NATIONAL_AVG_YIELD;
  const steigerung = p.stromSteigerung ?? prices.electricityIncrease;
  const strompreis = prices.electricityPrice;

  const referenz = haushalte.find((h) => h.kwp <= 0);
  if (!referenz) throw new Error("Kostenrennen braucht einen Haushalt ohne Anlage als Referenz");

  const laeufer: RennLaeufer[] = haushalte.map((h) => {
    const verbrauchKwh = jahresverbrauch(h);
    // Stromrechnung ohne Anlage — derselbe Preispfad wie in calc():
    // Jahr i zahlt strompreis × (1 + steigerung)^i.
    const ohne: number[] = [0];
    for (let i = 1; i <= YEARS; i++) {
      ohne.push(ohne[i - 1] + verbrauchKwh * strompreis * Math.pow(1 + steigerung, i));
    }
    if (h.kwp <= 0) {
      return {
        key: h.key, label: h.label, kurz: h.kurz, hatPv: false, kwp: 0, speicherKwh: 0,
        investition: 0, verbrauchKwh, eigenverbrauchPct: null,
        kumuliert: ohne.map((x) => Math.round(x)),
      };
    }
    const ev = calcEigenverbrauch({
      personenIdx: h.personenIdx, nutzungIdx: h.nutzungIdx, speicherKwh: h.speicherKwh,
      wp: h.wp ?? "nein", ea: h.ea ?? "nein", eaKm: h.eaKm ?? 0,
      kwp: h.kwp, ertragKwp,
    });
    const kosten = estimateCost(h.kwp, h.speicherKwh, prices);
    const einspeisung = calcWeightedFeedIn(h.kwp, feedIn.teilUnder10, feedIn.teilOver10, feedIn.thresholdKwp);
    const ergebnis = calc({
      kwp: h.kwp, kosten, strompreis, eigenverbrauch: ev, einspeisung,
      stromSteigerung: steigerung, ertragKwp, monthly: null,
      batteryReplace: h.speicherKwh > 0 ? batteryReplaceCost(h.speicherKwh, prices) : 0,
    });
    // Kosten mit Anlage = Kosten ohne Anlage − kumulierter Gewinn. `kum` startet
    // bei −kosten, also steht im Jahr 0 genau die Anschaffung.
    const kumuliert = ohne.map((x, i) => Math.round(x - ergebnis.years[i].kum));
    return {
      key: h.key, label: h.label, kurz: h.kurz, hatPv: true, kwp: h.kwp, speicherKwh: h.speicherKwh,
      investition: kosten, verbrauchKwh, eigenverbrauchPct: ev, kumuliert,
    };
  });

  const ref = laeufer.find((l) => l.key === referenz.key)!;
  const ueberholJahr: Record<string, number | null> = {};
  for (const l of laeufer) {
    if (!l.hatPv) continue;
    const idx = l.kumuliert.findIndex(
      (_, i) => i > 0 && l.kumuliert.slice(i).every((k, j) => k < ref.kumuliert[i + j]),
    );
    ueberholJahr[l.key] = idx > 0 ? idx : null;
  }

  const pvKwp = haushalte.find((h) => h.kwp > 0)?.kwp ?? 10;
  return {
    startJahr: YEAR,
    jahre: YEARS,
    laeufer,
    referenzKey: referenz.key,
    ueberholJahr,
    annahmen: {
      strompreisCt: Math.round(strompreis * 1000) / 10,
      steigerungPct: Math.round(steigerung * 1000) / 10,
      ertragKwp,
      einspeisungCt: Math.round(calcWeightedFeedIn(pvKwp, feedIn.teilUnder10, feedIn.teilOver10, feedIn.thresholdKwp) * 100) / 100,
    },
  };
}
