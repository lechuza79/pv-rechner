// Der Tagesverlauf des Amortisations-Rennens: aus den Monatswerten der Rechnung
// (lib/kostenrennen.ts) wird eine Kurve je Tag — damit die Linie die Textur
// echter Tage bekommt (Regenwoche flach, Hochdrucklage steil), ohne dass das
// Geld je Monat vom Rechner abweicht.
//
// Regel: Die Stromrechnung eines Monats verteilt sich gleichmäßig auf seine
// Tage; der Nutzen der Anlage (Ersparnis + Vergütung) nach der Tagesstrahlung
// des wiederholten Kalendertags (lib/strahlung-tage.ts, DWD-Stationsmittel).
// Die Summe je Monat ist exakt der Monatswert — per Test festgenagelt. Fehlt
// für einen Monat die Tagesstrahlung, gelten gleiche Gewichte; nichts wird
// erfunden.
//
// Bewusst NICHT im Rechenkern: calc() rechnet monatlich, und das ist dort auch
// die ehrliche Auflösung des Modells. Die Tage sind eine Darstellung der
// Verteilung, keine neue Rechnung — deshalb ein eigenes Modul, das die Monats-
// werte nimmt und nur aufteilt.

import type { Kostenrennen, RennLaeufer } from "./kostenrennen";
import { STRAHLUNG_TAGE } from "./strahlung-tage";

export interface Tagesverlauf {
  /** Kalenderjahr je Tagesindex (Betriebsjahr 1 = startJahr + 1, wie im Rechner-Chart). */
  jahre: number;
  /** Zahl der Tage insgesamt (Index 0 = Start, dann Tag 1 … tage). */
  tage: number;
  /** Tagesindex → Monatsindex 1..12·jahre, für Beschriftung und Marken. */
  monatVonTag: Uint16Array;
  /** Tagesindex des ersten Tags jedes Monats (Index 0 = Start). */
  ersterTag: number[];
  /** Je Läufer: kumulierte Stromkosten je Tag (Index 0 = Start). */
  kosten: Record<string, Float64Array>;
  /** Welche Kalenderjahre die Tagesform liefern (null, wenn keine Tagesdaten). */
  fenster: { von: number; bis: number } | null;
}

function tageImMonat(jahr: number, monat: number): number {
  return new Date(Date.UTC(jahr, monat + 1, 0)).getUTCDate();
}

/**
 * Tagesgewichte eines Monats aus der Tagesstrahlung des Kalenderjahrs; gleiche
 * Gewichte, wenn Werte fehlen. Summe = 1.
 */
export function tagesgewichte(kalenderJahr: number, monat: number): number[] {
  const n = tageImMonat(kalenderJahr, monat);
  const jahr = STRAHLUNG_TAGE.find((r) => r.jahr === kalenderJahr);
  const gleich = Array.from({ length: n }, () => 1 / n);
  if (!jahr) return gleich;
  const start = Math.round((Date.UTC(kalenderJahr, monat, 1) - Date.UTC(kalenderJahr, 0, 1)) / 86_400_000);
  const werte = jahr.tage.slice(start, start + n);
  const summe = werte.reduce((a, b) => a + b, 0);
  if (werte.length !== n || summe <= 0 || werte.some((w) => w <= 0)) return gleich;
  return werte.map((w) => w / summe);
}

export function tagesverlauf(rennen: Kostenrennen): Tagesverlauf {
  const fenster = rennen.wetterFenster;
  const M = 12 * rennen.jahre;
  const monatVonTag: number[] = [0];
  const ersterTag: number[] = [0];
  const kosten: Record<string, number[]> = {};
  for (const l of rennen.laeufer) kosten[l.key] = [l.monatlich[0]];
  const referenz = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;

  for (let k = 1; k <= M; k++) {
    const i = Math.ceil(k / 12);
    const m = (k - 1) % 12;
    // Kalenderjahr der Tagesform: Betriebsjahr i ↔ fenster.von + i − 1; ohne
    // Fenster ein Schaltjahr-neutrales Referenzjahr (gleiche Gewichte).
    const kalenderJahr = fenster ? fenster.von + i - 1 : 2001;
    const gewichte = fenster ? tagesgewichte(kalenderJahr, m) : Array.from({ length: tageImMonat(2001, m) }, (_, __, a = tageImMonat(2001, m)) => 1 / a);
    const n = gewichte.length;
    ersterTag.push(monatVonTag.length);
    for (let d = 0; d < n; d++) monatVonTag.push(k);

    for (const l of rennen.laeufer) {
      const reihe = kosten[l.key];
      const rechnungMonat = referenz.monatlich[k] - referenz.monatlich[k - 1]; // dieselbe Rechnung für alle (gleicher Verbrauch)
      const eigeneRechnung = l.hatPv ? rechnungMonat * (l.verbrauchKwh / referenz.verbrauchKwh) : rechnungMonat;
      const nutzenMonat = l.hatPv ? l.nutzen[k] - l.nutzen[k - 1] : 0;
      // Was die Monatsdifferenz an Kosten NICHT über Rechnung und Nutzen erklärt
      // (Rundung), landet gleichmäßig auf den Tagen — die Monatssumme stimmt exakt.
      const rest = (l.monatlich[k] - l.monatlich[k - 1]) - (eigeneRechnung - nutzenMonat);
      let stand = reihe[reihe.length - 1];
      for (let d = 0; d < n; d++) {
        stand += eigeneRechnung / n - nutzenMonat * gewichte[d] + rest / n;
        reihe.push(stand);
      }
    }
  }

  const out: Record<string, Float64Array> = {};
  for (const l of rennen.laeufer) out[l.key] = Float64Array.from(kosten[l.key]);
  return {
    jahre: rennen.jahre,
    tage: monatVonTag.length - 1,
    monatVonTag: Uint16Array.from(monatVonTag),
    ersterTag,
    kosten: out,
    fenster,
  };
}

/** Kalenderdatum eines Tagesindex im Verlauf (Betriebsjahr i → startJahr + i). */
export function tagDatum(v: Tagesverlauf, startJahr: number, tagIdx: number): { jahr: number; monat: number; tag: number } {
  const k = v.monatVonTag[Math.min(tagIdx, v.tage)] || 1;
  const i = Math.ceil(k / 12);
  const monat = (k - 1) % 12;
  const tag = Math.max(1, tagIdx - v.ersterTag[k] + 1);
  return { jahr: startJahr + i, monat, tag };
}

export type { RennLaeufer };
