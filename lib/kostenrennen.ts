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

import { PERSONEN, YEARS, YEAR, NATIONAL_AVG_YIELD, CONSUMPTION_MONTHLY } from "./constants";
import { calc, calcEigenverbrauch, calcWeightedFeedIn, estimateCost, batteryReplaceCost, type JahresVerlauf } from "./calc";
import { calcExtraConsumption } from "./consumption";
import { monthlyFromAnnual } from "./balkon-sim";
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
  /**
   * 12 Monatswerte kWh/kWp (PVGIS-Profil des Standorts). Ohne Angabe das
   * deutsche Referenzjahr — dieselbe Form, die die Stundensimulation ohne PLZ
   * benutzt. Die MENGE kommt immer aus `ertragKwp`, das Profil gibt nur die
   * Verteilung über das Jahr.
   */
  monatsprofil?: number[];
  /**
   * Jahresweise Abweichungen vom glatten Modell (Preispfad, Wetterjahre) —
   * dieselbe Struktur, die calc() nimmt, damit Anlage UND Referenzhaushalt
   * denselben Strompreis eines Jahres sehen. Ohne Angabe: glattes Modell.
   */
  verlauf?: JahresVerlauf;
  /** Klartext für die Annahmen-Zeile, wenn `verlauf` gesetzt ist. */
  verlaufText?: { preis?: string; wetter?: string };
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
  /**
   * Dieselbe Größe in Monatsschritten, Index = Monat 0..12·YEARS (0 = Start).
   * Jeder zwölfte Wert ist der Jahreswert aus `kumuliert`. Der Winter ist hier
   * sichtbar: Die Anlage liefert im Dezember ein Zehntel des Juli-Ertrags, die
   * Stromrechnung ist im Winter am höchsten (BDEW-Lastprofil).
   */
  monatlich: number[];
  /**
   * Was die Anlage bis dahin EINGEBRACHT hat, Monat 0..12·YEARS: Ersparnis
   * plus Einspeisevergütung, minus Akku-Tausch — der kumulierte Nutzen aus
   * calc() ab null, ohne die Anschaffung. Erreicht er die Investition, ist die
   * Anlage bezahlt. Ohne Anlage konstant 0. Das ist die Größe des Rennens: Alle
   * Läufer starten bei null, die Achse wächst mit ihnen, und jede Schwankung
   * (Winter, Wetterjahr, Preissprung) ist sichtbar — in den kumulierten Kosten
   * versteckt die Anschaffung sie.
   */
  nutzen: number[];
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
  /** Wie `ueberholJahr`, aber als Monatsindex (1..12·YEARS) — für die Marke im Chart. */
  ueberholMonat: Record<string, number | null>;
  annahmen: {
    strompreisCt: number;
    steigerungPct: number;
    ertragKwp: number;
    einspeisungCt: number;
    /** Wie sich der Strompreis entwickelt — ein Satz, der zur Rechnung passt. */
    preis: string;
    /** Wie der Ertrag über die Jahre verteilt ist — ein Satz, der zur Rechnung passt. */
    wetter: string;
  };
}

// Derselbe Beispielhaushalt wie in /ratgeber/lohnt-sich-pv-mit-speicher —
// 3–4 Personen, teils im Homeoffice. Zwei Fassungen desselben Haushalts auf
// einer Seite wären ein Widerspruch, den man erst beim Vergleich zweier Zahlen
// bemerkt.
const TYPISCH = { personenIdx: 2, nutzungIdx: 1 } as const;

/**
 * Die Grundaufstellung: derselbe Haushalt ohne Anlage (Referenz für die
 * Stromrechnung), mit 10 kWp ohne Speicher (die Voreinstellung des Rechners)
 * und mit 10 kWp plus 10 kWh Speicher. Die beiden Anlagen laufen im Rennen
 * gegeneinander: Der Speicher bringt jedes Jahr mehr ein, kostet aber 4.000 €
 * mehr und wird nach 15 Jahren getauscht — dort knickt seine Kurve.
 *
 * Zum Speicher-Haushalt gehört eine Eigenheit des Modells: Sein
 * Eigenverbrauch läuft an die physikalische Kappung (Verbrauch ÷ Ertrag), der
 * Einspeise-Erlös übersteigt dann die restliche Stromrechnung — seine
 * kumulierten NETTO-Kosten sinken sogar (gemessen 05.09.2026: 18.000 →
 * 12.273 € nach 20 Jahren). Im Rennen um den eingebrachten Nutzen ist das kein
 * Problem mehr; in einer Kostendarstellung wäre es ein Balken, der rückwärts läuft.
 */
export const RENNEN_OHNE_MIT_PV: RennHaushalt[] = [
  { key: "ohne", label: "Ohne PV-Anlage", kurz: "Ohne PV", ...TYPISCH, kwp: 0, speicherKwh: 0 },
  { key: "mit", label: "10 kWp ohne Speicher", kurz: "ohne Speicher", ...TYPISCH, kwp: 10, speicherKwh: 0 },
  { key: "mitSp", label: "10 kWp mit 10 kWh Speicher", kurz: "mit Speicher", ...TYPISCH, kwp: 10, speicherKwh: 10 },
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
  const preisImJahr = (i: number) => p.verlauf?.strompreisImJahr?.(i) ?? strompreis * Math.pow(1 + steigerung, i);

  const referenz = haushalte.find((h) => h.kwp <= 0);
  if (!referenz) throw new Error("Kostenrennen braucht einen Haushalt ohne Anlage als Referenz");

  // Verbrauchsanteil je Monat (BDEW H0: Winter über, Sommer unter dem Mittel).
  const cSum = CONSUMPTION_MONTHLY.reduce((a, b) => a + b, 0);
  const cAnteil = CONSUMPTION_MONTHLY.map((f) => f / cSum);
  const monatsprofil = p.monatsprofil ?? monthlyFromAnnual(ertragKwp);
  const M = 12 * YEARS;

  const laeufer: RennLaeufer[] = haushalte.map((h) => {
    const verbrauchKwh = jahresverbrauch(h);
    // Stromrechnung ohne Anlage, Monat für Monat — derselbe Preispfad wie in
    // calc(): Jahr i zahlt strompreis × (1 + steigerung)^i.
    const ohneMonat: number[] = [0];
    for (let k = 1; k <= M; k++) {
      const i = Math.ceil(k / 12);
      const m = (k - 1) % 12;
      ohneMonat.push(ohneMonat[k - 1] + verbrauchKwh * cAnteil[m] * preisImJahr(i));
    }
    const jahreswerte = (monat: number[]) => Array.from({ length: YEARS + 1 }, (_, i) => Math.round(monat[12 * i]));
    if (h.kwp <= 0) {
      return {
        key: h.key, label: h.label, kurz: h.kurz, hatPv: false, kwp: 0, speicherKwh: 0,
        investition: 0, verbrauchKwh, eigenverbrauchPct: null,
        kumuliert: jahreswerte(ohneMonat),
        monatlich: ohneMonat.map((x) => Math.round(x)),
        nutzen: ohneMonat.map(() => 0),
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
      stromSteigerung: steigerung, ertragKwp, monthly: monatsprofil,
      batteryReplace: h.speicherKwh > 0 ? batteryReplaceCost(h.speicherKwh, prices) : 0,
      verlauf: p.verlauf,
    });
    if (!ergebnis.monate) throw new Error("calc() lieferte kein Monatsprofil");
    // Kosten mit Anlage = Kosten ohne Anlage − kumulierter Nutzen der Anlage.
    // Monat 0 ist die Anschaffung; danach wächst jeder Monat um die
    // Stromrechnung minus das, was die Anlage in diesem Monat einbringt.
    const mitMonat: number[] = [kosten];
    const nutzen: number[] = [0];
    for (let k = 1; k <= M; k++) {
      mitMonat.push(mitMonat[k - 1] + (ohneMonat[k] - ohneMonat[k - 1]) - ergebnis.monate[k - 1]);
      nutzen.push(nutzen[k - 1] + ergebnis.monate[k - 1]);
    }
    return {
      key: h.key, label: h.label, kurz: h.kurz, hatPv: true, kwp: h.kwp, speicherKwh: h.speicherKwh,
      investition: kosten, verbrauchKwh, eigenverbrauchPct: ev,
      kumuliert: jahreswerte(mitMonat),
      monatlich: mitMonat.map((x) => Math.round(x)),
      nutzen: nutzen.map((x) => Math.round(x)),
    };
  });

  const ref = laeufer.find((l) => l.key === referenz.key)!;
  // Erster Zeitpunkt, ab dem der Läufer DAUERHAFT unter der Referenz liegt —
  // nicht das erste Unterschreiten: Der Akku-Tausch kann eine Kurve noch einmal
  // über die andere heben (dieselbe Regel wie die Amortisation in calc()).
  const erstesDauerhaftDarunter = (a: number[], b: number[]) => {
    const idx = a.findIndex((_, i) => i > 0 && a.slice(i).every((k, j) => k < b[i + j]));
    return idx > 0 ? idx : null;
  };
  const ueberholJahr: Record<string, number | null> = {};
  const ueberholMonat: Record<string, number | null> = {};
  for (const l of laeufer) {
    if (!l.hatPv) continue;
    ueberholJahr[l.key] = erstesDauerhaftDarunter(l.kumuliert, ref.kumuliert);
    ueberholMonat[l.key] = erstesDauerhaftDarunter(l.monatlich, ref.monatlich);
  }

  const pvKwp = haushalte.find((h) => h.kwp > 0)?.kwp ?? 10;
  return {
    startJahr: YEAR,
    jahre: YEARS,
    laeufer,
    referenzKey: referenz.key,
    ueberholJahr,
    ueberholMonat,
    annahmen: {
      strompreisCt: Math.round(strompreis * 1000) / 10,
      steigerungPct: Math.round(steigerung * 1000) / 10,
      ertragKwp,
      einspeisungCt: Math.round(calcWeightedFeedIn(pvKwp, feedIn.teilUnder10, feedIn.teilOver10, feedIn.thresholdKwp) * 100) / 100,
      preis: p.verlaufText?.preis ?? `Anstieg ${(Math.round(steigerung * 1000) / 10).toLocaleString("de-DE")} % pro Jahr`,
      wetter: p.verlaufText?.wetter ?? "jedes Jahr der gleiche Ertrag (Referenzjahr), nur die Alterung der Module zieht ab",
    },
  };
}
