// Das Amortisations-Rennen: ein Haushalt, einmal ohne und einmal mit Anlage,
// 25 Jahre, Monat für Monat mit dem Wetter, wie es wirklich war.
//
// Reine Rechenschicht ohne UI. Sie erfindet KEIN eigenes Fundament (CLAUDE.md,
// „Geteilte Rechen-Basis"): Der Jahresverbrauch kommt aus PERSONEN + den
// Großverbrauchern, die Anschaffung aus estimateCost, der Eigenverbrauch aus
// dem HTW-Power-Law, und der Nutzen der Anlage ist exakt die Amortisations-
// rechnung des Rechners (`calc`), Monat für Monat. Damit kann das Rennen nie
// etwas anderes behaupten als der Rechner daneben.
//
// Das Wetter kommt aus der DWD-Strahlungsreihe (lib/strahlungsjahre.ts): Die
// letzten 25 Kalenderjahre laufen als Betriebsjahre 1–25 noch einmal ab, jeder
// Monat so, wie er war. Normiert auf das Mittel dieses Fensters — die MENGE
// über 25 Jahre bleibt die des Rechners (Referenzertrag × 25), nur ihre
// Verteilung ist echt. Welche Strahlung dem Referenzertrag absolut entspricht,
// ist nicht belegt; belegt ist nur, wie die Jahre und Monate um ihr Mittel
// streuen.
//
// Ein „Läufer" ist eine Haushaltskonfiguration; `kwp: 0` heißt „keine Anlage".

import { PERSONEN, YEARS, YEAR, NATIONAL_AVG_YIELD, CONSUMPTION_MONTHLY } from "./constants";
import { calc, calcEigenverbrauch, calcWeightedFeedIn, estimateCost, batteryReplaceCost, type JahresVerlauf } from "./calc";
import { calcExtraConsumption } from "./consumption";
import { monthlyFromAnnual } from "./balkon-sim";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";
import { STRAHLUNG_JAHRE } from "./strahlungsjahre";

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
   * `"dwd"` (Voreinstellung): jeder Monat mit der Strahlung des wiederholten
   * Kalenderjahrs. `"referenz"`: jedes Jahr dasselbe Referenz-Monatsprofil —
   * das glatte Modell des Rechners, für Tests und Vergleiche.
   */
  wetter?: "dwd" | "referenz";
  /** Weitere jahresweise Abweichungen (Preispfad), an calc() durchgereicht. */
  verlauf?: JahresVerlauf;
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
  /** Kumulierte Stromausgaben, Index = Jahr 0..YEARS (Jahr 0 = Anschaffung). */
  kumuliert: number[];
  /** Dieselbe Größe in Monatsschritten, Index = Monat 0..12·YEARS. */
  monatlich: number[];
  /**
   * Was die Anlage bis dahin EINGEBRACHT hat, Monat 0..12·YEARS: Ersparnis
   * plus Einspeisevergütung, minus Akku-Tausch — der kumulierte Nutzen aus
   * calc() ab null, ohne die Anschaffung. Erreicht er die Investition, ist die
   * Anlage bezahlt. Ohne Anlage konstant 0.
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
  /** Je Anlage: erstes Jahr, ab dem sie dauerhaft weniger gekostet hat als die Referenz — null, wenn nie. */
  ueberholJahr: Record<string, number | null>;
  /** Wie `ueberholJahr`, als Monatsindex (1..12·YEARS): der Monat, in dem die Anlage bezahlt ist. */
  ueberholMonat: Record<string, number | null>;
  /** Welche Kalenderjahre als Wetter durchlaufen (null beim Referenzprofil). */
  wetterFenster: { von: number; bis: number } | null;
  annahmen: {
    strompreisCt: number;
    steigerungPct: number;
    ertragKwp: number;
    einspeisungCt: number;
    /** Ein Satz zum Wetter, der zur Rechnung passt. */
    wetter: string;
  };
}

// Derselbe Beispielhaushalt wie in /ratgeber/lohnt-sich-pv-mit-speicher —
// 3–4 Personen, teils im Homeoffice. Zwei Fassungen desselben Haushalts auf
// einer Seite wären ein Widerspruch, den man erst beim Vergleich zweier Zahlen
// bemerkt.
const TYPISCH = { personenIdx: 2, nutzungIdx: 1 } as const;

/**
 * Die Aufstellung: derselbe Haushalt ohne und mit Anlage — 10 kWp ohne
 * Speicher, die Voreinstellung des Rechners.
 */
export const RENNEN_OHNE_MIT_PV: RennHaushalt[] = [
  { key: "ohne", label: "Ohne PV-Anlage", kurz: "Ohne PV", ...TYPISCH, kwp: 0, speicherKwh: 0 },
  { key: "mit", label: "Mit PV-Anlage (10 kWp)", kurz: "Mit PV", ...TYPISCH, kwp: 10, speicherKwh: 0 },
];

/** Die letzten YEARS vollständigen Kalenderjahre der DWD-Reihe. */
export function wetterFenster(): { von: number; bis: number } {
  const bis = STRAHLUNG_JAHRE[STRAHLUNG_JAHRE.length - 1].jahr;
  return { von: bis - YEARS + 1, bis };
}

/**
 * Monatsprofil (kWh/kWp) des Betriebsjahrs i aus dem echten Wetter des
 * wiederholten Kalenderjahrs, normiert auf das Fenstermittel: Über die 25
 * Jahre summiert sich der Ertrag zu YEARS × ertragKwp, wie im Rechner.
 */
export function wetterMonatsprofile(ertragKwp: number): number[][] {
  const { von, bis } = wetterFenster();
  const jahre = STRAHLUNG_JAHRE.filter((r) => r.jahr >= von && r.jahr <= bis);
  if (jahre.length !== YEARS) throw new Error(`Wetterfenster ${von}–${bis} hat ${jahre.length} statt ${YEARS} Jahre`);
  const mittel = jahre.reduce((a, r) => a + r.kwhM2, 0) / jahre.length;
  return jahre.map((r) => r.monate.map((m) => (m / mittel) * ertragKwp));
}

function jahresverbrauch(h: RennHaushalt): number {
  return PERSONEN[h.personenIdx].verbrauch + calcExtraConsumption(h.wp ?? "nein", h.ea ?? "nein", h.eaKm ?? 0);
}

export function kostenrennen(haushalte: RennHaushalt[], p: RennParameter = {}): Kostenrennen {
  const prices = p.prices ?? DEFAULT_PRICES;
  const feedIn = p.feedIn ?? DEFAULT_FEED_IN;
  const ertragKwp = p.ertragKwp ?? NATIONAL_AVG_YIELD;
  const steigerung = p.stromSteigerung ?? prices.electricityIncrease;
  const strompreis = prices.electricityPrice;
  const wetter = p.wetter ?? "dwd";
  const preisImJahr = (i: number) => p.verlauf?.strompreisImJahr?.(i) ?? strompreis * Math.pow(1 + steigerung, i);

  const referenz = haushalte.find((h) => h.kwp <= 0);
  if (!referenz) throw new Error("Kostenrennen braucht einen Haushalt ohne Anlage als Referenz");

  // Verbrauchsanteil je Monat (BDEW H0: Winter über, Sommer unter dem Mittel).
  const cSum = CONSUMPTION_MONTHLY.reduce((a, b) => a + b, 0);
  const cAnteil = CONSUMPTION_MONTHLY.map((f) => f / cSum);
  const profile = wetter === "dwd" ? wetterMonatsprofile(ertragKwp) : null;
  const verlauf: JahresVerlauf = {
    ...p.verlauf,
    ...(profile ? { monatsprofilImJahr: (i: number) => profile[i - 1] ?? profile[profile.length - 1] } : {}),
  };
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
      stromSteigerung: steigerung, ertragKwp, monthly: monthlyFromAnnual(ertragKwp),
      batteryReplace: h.speicherKwh > 0 ? batteryReplaceCost(h.speicherKwh, prices) : 0,
      verlauf,
    });
    if (!ergebnis.monate) throw new Error("calc() lieferte kein Monatsprofil");
    // Kosten mit Anlage = Kosten ohne Anlage − Nutzen der Anlage. Monat 0 ist
    // die Anschaffung; der Nutzen läuft ab null.
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
  const fenster = profile ? wetterFenster() : null;
  return {
    startJahr: YEAR,
    jahre: YEARS,
    laeufer,
    referenzKey: referenz.key,
    ueberholJahr,
    ueberholMonat,
    wetterFenster: fenster,
    annahmen: {
      strompreisCt: Math.round(strompreis * 1000) / 10,
      steigerungPct: Math.round(steigerung * 1000) / 10,
      ertragKwp,
      einspeisungCt: Math.round(calcWeightedFeedIn(pvKwp, feedIn.teilUnder10, feedIn.teilOver10, feedIn.thresholdKwp) * 100) / 100,
      wetter: fenster
        ? `Sonne Monat für Monat wie in den Jahren ${fenster.von}–${fenster.bis} (Gebietsmittel Deutschland, Deutscher Wetterdienst), Gesamtmenge über 25 Jahre wie im Rechner`
        : "jedes Jahr dasselbe Referenz-Monatsprofil, nur die Alterung der Module zieht ab",
    },
  };
}
