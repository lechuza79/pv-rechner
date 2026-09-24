// ─── Gewerke der Angebotsprüfung ──────────────────────────────────────────────
//
// Die Prüfung ist nicht auf Wärmepumpen zugeschnitten, sondern auf ein GEWERK.
// Ein Gewerk bringt mit, woran gemessen wird: welche Positionen ein
// vollständiges Angebot nennen sollte, in welchen Preisbändern vergleichbare
// Anlagen liegen, und in welcher Einheit die Größe steht.
//
// WARUM DIESE TRENNUNG VON ANFANG AN: Photovoltaik und Wärmepumpe stellen
// dieselben drei Fragen — passt die Größe, ist alles drin, wie liegt der Preis —
// und beantworten sie aus verschiedenen Quellen. Wer das erst nachträglich
// trennt, hat bis dahin die Wärmepumpen-Referenz im Prüfmodul stehen und baut
// für die zweite Technik eine Kopie.
//
// WAS EIN GEWERK NICHT MITBRINGT: die Urteilslogik. Die ist für beide dieselbe.

import {
  ANGEBOT_REFERENZ_STAND,
  ANGEBOTS_POSITIONEN,
  GESAMTKOSTEN,
  GROESSEN_TOLERANZ,
  SPEZ_KOSTEN,
  SPEZ_KOSTEN_BAENDER,
  type AngebotsPosition,
} from "./angebot-check-config";
import { DEFAULT_PRICES } from "./prices-config";

export type GewerkId = "waermepumpe" | "pv";

/** Ein Preisband für eine Größenklasse. */
export interface SpezBand {
  /** Obergrenze der Klasse in der Einheit des Gewerks. */
  bisGroesse: number;
  von: number;
  bis: number;
  beschriftung: string;
}

export interface Gewerk {
  id: GewerkId;
  /** Wie die Anlage im Text heißt. */
  name: string;
  /** Einheit der Anlagengröße — kW bei der Wärmepumpe, kWp bei Photovoltaik. */
  einheit: string;
  /** In welcher Rolle der Meister liest. */
  rolle: string;
  /** Positionen, die ein vollständiges Angebot nennen sollte. */
  positionen: AngebotsPosition[];
  /** Preisbänder je Größenklasse. */
  baender: SpezBand[];
  /** Mittelwert über alle Vergleichsangebote, als Zusatz — nie als Maßstab. */
  medianAlle: number | null;
  /**
   * Spanne der GESAMTkosten vergleichbarer Angebote. Die Rückfallebene, wenn
   * ein Angebot seine Leistung nicht nennt — was regelmäßig vorkommt, weil sie
   * oft nur in der Typenbezeichnung steht. `null`, wo es keine solche Erhebung
   * gibt.
   */
  gesamtkosten: { min: number; max: number; median: number; anzahl: number } | null;
  /** Toleranz bei der Größe. */
  toleranz: { knappAb: number; passendBis: number; reichlichBis: number };
  /** Was die Bänder sind, sichtbar für den Nutzer. */
  vergleichsgruppe: string;
  /** Stand der Referenz. */
  stand: { validFrom: string; geprueftIso: string; quelleKurz: string };
}

export const WAERMEPUMPE: Gewerk = {
  id: "waermepumpe",
  name: "Wärmepumpe",
  einheit: "kW",
  rolle: "erfahrener Heizungsbaumeister",
  positionen: ANGEBOTS_POSITIONEN,
  baender: SPEZ_KOSTEN_BAENDER.map((b) => ({
    bisGroesse: b.bisKw,
    von: b.von,
    bis: b.bis,
    beschriftung: b.beschriftung,
  })),
  medianAlle: SPEZ_KOSTEN.median,
  gesamtkosten: { min: GESAMTKOSTEN.min, max: GESAMTKOSTEN.max, median: GESAMTKOSTEN.median, anzahl: GESAMTKOSTEN.anzahl },
  toleranz: GROESSEN_TOLERANZ,
  vergleichsgruppe: `${SPEZ_KOSTEN.anzahl} Angebote für Ein- und Zweifamilienhäuser aus Rheinland-Pfalz, eingereicht bei der Verbraucherzentrale`,
  stand: {
    validFrom: ANGEBOT_REFERENZ_STAND.validFrom,
    geprueftIso: ANGEBOT_REFERENZ_STAND.geprueftIso,
    quelleKurz: ANGEBOT_REFERENZ_STAND.quelleKurz,
  },
};

// ─── Photovoltaik ────────────────────────────────────────────────────────────
//
// DIE REFERENZ IST EINE ANDERE, UND DAS MUSS MAN SEHEN. Für Wärmepumpen gibt es
// eine Auswertung echter Angebote; für Photovoltaik haben wir das nicht. Was wir
// haben, sind unsere eigenen monatlich erhobenen Marktpreise — also ein
// ANGEBOTSPREIS aus dem Handel, nicht die Streuung dessen, was Betriebe
// tatsächlich verlangen.
//
// Folge, und sie ist der Grund für die weiten Bänder unten: Ein Handwerkerpreis
// liegt regelmäßig über dem Marktpreis, weil Planung, Gerüst, Anmeldung und
// Gewährleistung darin stecken. Ein Band, das eng um den Marktpreis läge, würde
// jedes zweite reale Angebot als „zu teuer" melden.
//
// KEINE HÄUFIGKEITEN. Bei der Wärmepumpe steht an jeder Position, in wie viel
// Prozent der Angebote sie enthalten war — das ist gezählt. Für Photovoltaik
// zählt das niemand, also steht dort nichts. Eine geschätzte Häufigkeit wäre
// eine erfundene Zahl an genau der Stelle, an der der Nutzer sie für belegt hält.

/** Was ein vollständiges Photovoltaik-Angebot nennen sollte. */
export const PV_POSITIONEN: AngebotsPosition[] = [
  { id: "module", name: "Solarmodule", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer" },
  { id: "wechselrichter", name: "Wechselrichter", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer" },
  { id: "montagesystem", name: "Montagesystem / Unterkonstruktion", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer" },
  { id: "dc-installation", name: "Verkabelung auf dem Dach", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer" },
  {
    id: "ac-installation", name: "Elektroarbeiten und Zählerschrank",
    anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer",
    folge: "Reicht der vorhandene Zählerschrank nicht, wird der Umbau nachträglich beauftragt — dieselbe Nachforderung wie bei der Wärmepumpe.",
  },
  { id: "geruest", name: "Gerüst", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "meistens" },
  {
    id: "anmeldung", name: "Anmeldung bei Netzbetreiber und Marktstammdatenregister",
    anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer",
    folge: "Ohne Anmeldung im Marktstammdatenregister gibt es keine Einspeisevergütung; die Frist beträgt einen Monat nach Inbetriebnahme.",
  },
  { id: "inbetriebnahme", name: "Inbetriebnahme", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "immer" },
  { id: "speicher", name: "Batteriespeicher", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "je-nach-fall" },
  { id: "wallbox", name: "Wallbox", anteilEnthalten: null, medianKosten: null, medianBasis: null, pflicht: "je-nach-fall" },
];

/**
 * Preisbänder Photovoltaik, abgeleitet aus unserem eigenen Marktpreis-Stand.
 *
 * Die Spanne reicht bewusst vom Marktpreis bis rund zum Doppelten: Unten steht,
 * was die Hardware im Handel kostet, oben ein voll ausgestattetes Angebot mit
 * Gerüst, Anmeldung und Gewährleistung. Wer die Anlage darunter angeboten
 * bekommt, sollte prüfen, was fehlt — wer darüber liegt, sollte nachfragen.
 *
 * ABGELEITET, NICHT GEMESSEN. Anders als bei der Wärmepumpe steht dahinter keine
 * Auswertung echter Angebote. Sobald es eine gibt, gehören diese Bänder ersetzt.
 */
export const PV_BAENDER: SpezBand[] = [
  { bisGroesse: DEFAULT_PRICES.pvThresholdKwp, von: DEFAULT_PRICES.pvPriceSmall, bis: Math.round(DEFAULT_PRICES.pvPriceSmall * 2), beschriftung: `bis ${DEFAULT_PRICES.pvThresholdKwp} kWp` },
  { bisGroesse: Infinity, von: DEFAULT_PRICES.pvPriceLarge, bis: Math.round(DEFAULT_PRICES.pvPriceLarge * 2), beschriftung: `über ${DEFAULT_PRICES.pvThresholdKwp} kWp` },
];

export const PHOTOVOLTAIK: Gewerk = {
  id: "pv",
  name: "Photovoltaik-Anlage",
  einheit: "kWp",
  rolle: "erfahrener Elektromeister mit Schwerpunkt Photovoltaik",
  positionen: PV_POSITIONEN,
  baender: PV_BAENDER,
  // Bewusst null: Ein „Median über alle Angebote" existiert für Photovoltaik
  // nicht. Den Marktpreis als Median auszugeben wäre eine andere Größe unter
  // demselben Namen.
  medianAlle: null,
  // Für Photovoltaik gibt es keine Erhebung von Gesamtkosten echter Angebote —
  // eine Spanne wäre hier erfunden. Ohne Leistung entfällt das Preis-Urteil.
  gesamtkosten: null,
  toleranz: GROESSEN_TOLERANZ,
  vergleichsgruppe: "unsere monatlich erhobenen Marktpreise für Anlagen dieser Größe — keine Auswertung echter Handwerkerangebote",
  stand: {
    validFrom: DEFAULT_PRICES.validFrom,
    geprueftIso: DEFAULT_PRICES.validFrom,
    quelleKurz: "eigene Marktpreis-Erhebung",
  },
};

export const GEWERKE: Record<GewerkId, Gewerk> = {
  waermepumpe: WAERMEPUMPE,
  pv: PHOTOVOLTAIK,
};

export function gewerkVon(id: string): Gewerk | null {
  return id in GEWERKE ? GEWERKE[id as GewerkId] : null;
}
