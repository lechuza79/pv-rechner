// ─── Feed-In Tariff Configuration (shared between server + client) ───────────
import { feedInArchivRates } from "./feedin-archiv";

export interface FeedInRates {
  teilUnder10: number;   // ct/kWh, Teileinspeisung ≤10 kWp
  teilOver10: number;    // ct/kWh, Teileinspeisung >10 kWp
  vollUnder10: number;   // ct/kWh, Volleinspeisung ≤10 kWp
  vollOver10: number;    // ct/kWh, Volleinspeisung >10 kWp
  thresholdKwp: number;  // kWp threshold (EEG: 10)
  validFrom: string;     // ISO date string
  source: string | null;
  /**
   * Visible provenance caveat, rendered on /datenstand while it is set. Only
   * used when a period's rates are derived from the statute before the
   * Bundesnetzagentur has published its (declaratory) list. Cleared again once
   * the official table is out — see scripts/eeg-verify.md.
   */
  note?: string | null;
}

/**
 * EEG feed-in rates by commissioning period. This config is the de-facto
 * source: the Supabase `feed_in_rates` table is not provisioned, so the API
 * always falls back here.
 *
 * The rates drop by a fixed 1 % every half-year (Feb 1 / Aug 1, § 49 Abs. 1 EEG
 * 2023) — that is a schedule, not an event. Keeping the periods side by side
 * means the switch happens on its own at the cutoff instead of depending on
 * someone deploying that morning (same reasoning as the absolute calendar years
 * in lib/co2-config.ts).
 *
 * DERIVATION (the rule, so no one has to guess a value again):
 *   anzulegender Wert  = Basiswert × 0,99^n, gerundet auf 2 Nachkommastellen
 *   Einspeisevergütung = anzulegender Wert − 0,40 ct/kWh (§ 53 Abs. 1 EEG)
 *   Basiswerte (§ 48 Abs. 2 / Abs. 2a EEG 2023, Gebäude):
 *     Teileinspeisung 8,60 (≤10 kWp) / 7,50 (≤40 kWp)
 *     Volleinspeisung 13,40 (≤10 kWp) / 11,30 (≤40 kWp)
 *   n = Zahl der Halbjahresschritte seit 2024-02-01 (n = 1 für 02/2024).
 *
 * Critical: § 49 Abs. 1 Satz 2 requires the UNROUNDED value to be carried
 * forward. Degressing the already-rounded published rate instead drifts and
 * misses 11 of the officially published cells — e.g. Teileinspeisung ≤40 kWp in
 * 02/2026 (7,13 amtlich vs. 7,15 verdriftet). That same shortcut produces the
 * 10,25 that circulates for Volleinspeisung ≤40 kWp ab 08/2026; the statutory
 * chain gives 10,24. lib/__tests__/feedin-config.test.ts pins this down against
 * every published half-year.
 */
export const FEED_IN_SCHEDULE: FeedInRates[] = [
  {
    teilUnder10: 7.78,
    teilOver10: 6.73,
    vollUnder10: 12.34,
    vollOver10: 10.35,
    thresholdKwp: 10,
    validFrom: "2026-02-01",
    source: "Bundesnetzagentur, §§ 48/49 EEG (gültig 02–07/2026)",
  },
  {
    teilUnder10: 7.7,
    teilOver10: 6.66,
    vollUnder10: 12.22,
    vollOver10: 10.24,
    thresholdKwp: 10,
    validFrom: "2026-08-01",
    source: "Bundesnetzagentur, §§ 48/49 EEG (gültig 08/2026–01/2027)",
  },
];

/**
 * Tag, an dem ein Wächter-Lauf die Sätze zuletzt gegen die Bundesnetzagentur
 * gelesen hat — NICHT der Stichtag, ab dem sie gelten (der steht je Periode in
 * `validFrom`). Beides zu vermischen wäre für eines von beidem gelogen: Der
 * Stichtag kommt aus dem Gesetz und wandert von selbst, das Prüfdatum nur, wenn
 * jemand die amtliche Liste wirklich aufgeschlagen hat.
 *
 * Startwert: der [auto]-Lauf vom 01.08.2026, der die abgeleiteten Sätze gegen
 * die BNetzA-Veröffentlichung bestätigt und den Herkunfts-Vorbehalt gestrichen
 * hat. Der halbjährliche EEG-Wächter zieht das Datum bei jedem erreichten Lauf
 * nach, auch wenn sich kein Satz geändert hat (scripts/eeg-verify.md).
 * Sichtbar auf /photovoltaik-rechner und /einspeiseverguetung-rechner über
 * lib/stand.ts.
 */
export const FEED_IN_GEPRUEFT_ISO = "2026-08-01";

/**
 * The rates for a given day — the last period whose start date has been
 * reached. Server surfaces that must flip at the cutoff without waiting for a
 * deploy (the /api/feedin route the calculator reads) call this per request;
 * everything else uses DEFAULT_FEED_IN below.
 */
export function feedInRatesFor(now: Date = new Date()): FeedInRates {
  const today = now.toISOString().slice(0, 10);
  let current = FEED_IN_SCHEDULE[0];
  for (const period of FEED_IN_SCHEDULE) {
    if (period.validFrom <= today) current = period;
  }
  return current;
}

export const DEFAULT_FEED_IN: FeedInRates = feedInRatesFor();

// ─── Sätze nach Inbetriebnahme-Halbjahr (für Bestandsanlagen) ────────────────
//
// Dieselbe gesetzliche Kette wie oben, aber rückwärts bis zum Beginn der
// EEG-2023-Basiswerte (30.07.2022). Davor gelten andere Basiswerte und
// Degressionsregeln (monatlich, EEG 2021 und älter) — die modellieren wir
// bewusst NICHT: Wer eine ältere Anlage hat, trägt den Satz aus seinem
// Bescheid selbst ein (der Rechner bietet das Feld an).
// Realitäts-Anker: lib/__tests__/feedin-config.test.ts prüft die abgeleiteten
// Halbjahre gegen die von der Bundesnetzagentur veröffentlichten Zellen.

/** § 48 Abs. 2 / Abs. 2a EEG 2023 (Gebäude), gültig ab 30.07.2022. */
export const FEED_IN_BASIS = {
  teilUnder10: 8.6,
  teilOver10: 7.5,
  vollUnder10: 13.4,
  vollOver10: 11.3,
  validFromIso: "2022-07-30",
} as const;

/** Kaufmännisch auf zwei Stellen; toFixed fängt die Binärdarstellung ab
 *  (7,5 × 0,99 liegt knapp UNTER 7,425 — nacktes Math.round ergäbe 7,42
 *  statt der amtlichen 7,43). Gleiche Implementierung wie im Anker-Test. */
const round2 = (x: number) => Math.round(Number((x * 100).toFixed(6))) / 100;

/** Nächster Degressions-Stichtag nach § 49 EEG (1.2. / 1.8.) NACH dem
 *  übergebenen Tag — dieselbe Stichtags-Regel wie feedInDegressionSteps, an
 *  einer Stelle kodiert (der Ratgeber zeigt „nächste planmäßige Absenkung"). */
export function naechsteDegressionIso(todayIso: string): string {
  const y = Number(todayIso.slice(0, 4));
  for (const c of [`${y}-02-01`, `${y}-08-01`, `${y + 1}-02-01`]) {
    if (c > todayIso) return c;
  }
  return `${y + 1}-02-01`;
}

/** Degressionsschritte seit dem 01.02.2024 für ein Inbetriebnahme-Datum
 *  (§ 49 Abs. 1 EEG: 1 % je Halbjahr, Stichtage 1.2. und 1.8.). */
export function feedInDegressionSteps(dateIso: string): number {
  if (dateIso < "2024-02-01") return 0;
  const [y, m] = dateIso.split("-").map(Number);
  if (m >= 2 && m <= 7) return (y - 2024) * 2 + 1;
  if (m >= 8) return (y - 2024) * 2 + 2;
  return (y - 2024) * 2; // Januar zählt noch zum August-Halbjahr des Vorjahres
}

/** Einspeisevergütung für eine Anlage nach Inbetriebnahme-Datum. Vor dem
 *  30.07.2022 übernimmt die historische Monatstabelle (04/2012–07/2022,
 *  lib/feedin-archiv.ts); davor gibt es bewusst keinen Wert (null). */
export function feedInRatesForCommissioning(dateIso: string): FeedInRates | null {
  if (dateIso < FEED_IN_BASIS.validFromIso) return feedInArchivRates(dateIso);
  const n = feedInDegressionSteps(dateIso);
  const satz = (basis: number) => round2(round2(basis * Math.pow(0.99, n)) - 0.4);
  return {
    teilUnder10: satz(FEED_IN_BASIS.teilUnder10),
    teilOver10: satz(FEED_IN_BASIS.teilOver10),
    vollUnder10: satz(FEED_IN_BASIS.vollUnder10),
    vollOver10: satz(FEED_IN_BASIS.vollOver10),
    thresholdKwp: 10,
    validFrom: dateIso,
    source: "§§ 48/49/53 EEG (Kette ab Basiswerten 2022)",
  };
}

/**
 * DER ct/kWh-Formatter der Einspeise-Oberflächen (deutsche Schreibweise,
 * mindestens zwei Nachkommastellen; amtliche Werte mit mehr Stellen — etwa der
 * Jahresmarktwert Solar 4,508 — behalten ihre Präzision). Eine Quelle statt
 * der vier Inline-Kopien, die der Konventions-Check am 06.08.2026 fand.
 */
export const fmtCt = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2 });

// ─── Halbjahres-Perioden seit dem 30.07.2022 (Nachschlage-Tabelle) ───────────

export interface FeedInPeriod {
  /** Erster Tag der Periode (Inbetriebnahme ab …). */
  fromIso: string;
  /** Letzter Tag der Periode — null für die laufende Periode. */
  toIso: string | null;
  rates: FeedInRates;
}

/**
 * Alle Vergütungs-Perioden der EEG-2023-Kette vom 30.07.2022 bis heute, für
 * die Nachschlage-Tabelle im Einspeisevergütungs-Ratgeber. Die Sätze kommen
 * unverändert aus feedInRatesForCommissioning (Anker-Test: feedin-config.test
 * prüft die Kette gegen die amtlich veröffentlichten Zellen); diese Funktion
 * liefert nur die Periodengrenzen dazu. Benachbarte Perioden mit identischen
 * Sätzen werden zusammengefasst — bis zum 31.01.2024 setzte die Degression aus
 * (siehe feedInDegressionSteps), die Basiswerte galten durchgehend.
 * Zukünftige Stichtage erscheinen bewusst NICHT (kein Blick über heute hinaus).
 */
export function feedInPeriodsSince2022(now: Date = new Date()): FeedInPeriod[] {
  const today = now.toISOString().slice(0, 10);
  const starts: string[] = [FEED_IN_BASIS.validFromIso];
  outer: for (let y = 2023; ; y++) {
    for (const md of ["02-01", "08-01"]) {
      const d = `${y}-${md}`;
      if (d > today) break outer;
      starts.push(d);
    }
  }
  const dayBefore = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const merged: FeedInPeriod[] = [];
  for (let i = 0; i < starts.length; i++) {
    const rates = feedInRatesForCommissioning(starts[i]) as FeedInRates;
    const toIso = i + 1 < starts.length ? dayBefore(starts[i + 1]) : null;
    const prev = merged[merged.length - 1];
    const same =
      prev &&
      prev.rates.teilUnder10 === rates.teilUnder10 &&
      prev.rates.teilOver10 === rates.teilOver10 &&
      prev.rates.vollUnder10 === rates.vollUnder10 &&
      prev.rates.vollOver10 === rates.vollOver10;
    if (same) prev.toIso = toIso;
    else merged.push({ fromIso: starts[i], toIso, rates });
  }
  return merged;
}

/**
 * Letzter Vergütungstag nach § 25 EEG 2023: Die Zahlung läuft 20 Jahre ab
 * Inbetriebnahme UND verlängert sich bei Anlagen, deren anzulegender Wert
 * gesetzlich bestimmt wird (= die feste Einspeisevergütung nach § 48, also
 * genau der Fall dieses Rechners — nicht: Ausschreibungsanlagen), bis zum
 * 31. Dezember des zwanzigsten Jahres. Ergebnis: 31.12.(Inbetriebnahmejahr+20).
 * Wortlaut geprüft am 04.08.2026, gesetze-im-internet.de/eeg_2014/__25.html.
 */
export function feedInEndIso(commissioningIso: string): string {
  return `${Number(commissioningIso.slice(0, 4)) + 20}-12-31`;
}

