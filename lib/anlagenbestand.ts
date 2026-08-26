// Der deutsche Solaranlagen-Bestand als Antwort auf die Bestandsfragen.
//
// Rein und ohne Datenbank-Import — dieselbe Trennung wie bei den Social-Posts
// (lib/social-posts.ts rein, lib/social-kennzahlen.ts server-only). Das Laden
// steht in lib/anlagenbestand-server.ts; hier stehen die Typen und alles, was
// sich aus den Zahlen ABLEITEN lässt, damit ein Test die Aussagen gegen die
// Zahlen halten kann, ohne einen Server-Kontext zu brauchen.
//
// WARUM DIE ABLEITUNGEN NICHT IN DER SEITE STEHEN: Seite und Widget zeigen
// dieselben Größen. Ein Anteil, der an zwei Stellen gerechnet wird, ist eine
// zweite Fassung derselben Angabe — dieselbe Fehlerklasse wie zwei Formatter für
// eine Einheit.

import type { Segment } from "./mastr-data";

export type BestandSegmentZeile = {
  segment: Exclude<Segment, "n/a">;
  /** Wie das Segment auf der Seite heißt. Gleiche Wörter wie im Solar-Atlas. */
  label: string;
  /** Was in dieses Segment fällt — die Einordnung stammt aus dem Register. */
  erklaerung: string;
  anzahl: number;
  kwp: number;
  /** Bestand am 31.12. des Stichtagsjahres — die Vergleichsbasis. */
  anzahlStichtag: number;
  kwpStichtag: number;
};

export type BestandLandZeile = {
  ags: string;
  name: string;
  einwohner: number;
  /** Alle Solaranlagen im Land, einschließlich Steckersolar. */
  anlagen: number;
  kwp: number;
  balkon: number;
};

export type Anlagenbestand = {
  /** Datenstand des Registerauszugs (ISO-Datum). */
  standIso: string;
  /**
   * Das Jahr, dessen 31.12. die Vergleichsbasis ist.
   *
   * NICHT „vor zwölf Monaten": Das Register führt je Anlage nur das Jahr der
   * Inbetriebnahme. Ableitbar ist der Bestand zum Jahresende, und der Abstand
   * zum Datenstand ist so lang, wie das laufende Jahr alt ist.
   */
  stichtagJahr: number;
  gesamt: { anzahl: number; kwp: number; anzahlStichtag: number; kwpStichtag: number };
  segmente: BestandSegmentZeile[];
  laender: BestandLandZeile[];
};

/** Beschriftung und Einordnung je Segment. Eine Quelle für Seite und Widget. */
export const BESTAND_SEGMENT_TEXT: Record<Exclude<Segment, "n/a">, { label: string; erklaerung: string }> = {
  steckersolar: {
    label: "Balkonkraftwerke",
    erklaerung:
      "Steckerfertige Geräte bis 800 Watt Einspeiseleistung, die in eine normale Steckdose gehen. Viele Stück, wenig Leistung.",
  },
  privat_dach: {
    label: "Private Dächer",
    erklaerung:
      "Dachanlagen, die im Register als Haushalts-Anlage geführt sind — typischerweise ein Einfamilienhaus.",
  },
  gewerbe_dach: {
    label: "Gewerbliche Dächer",
    erklaerung: "Dachanlagen auf Hallen, Ställen, Bürogebäuden und öffentlichen Gebäuden.",
  },
  freiflaeche: {
    label: "Freiflächen",
    erklaerung:
      "Solarparks auf dem Boden. Die kleinste Gruppe nach Stückzahl und zugleich die größte nach Leistung.",
  },
};

/** Anteil einer Teilmenge am Ganzen, als Anteil zwischen 0 und 1. */
export function anteil(teil: number, ganzes: number): number {
  return ganzes > 0 ? teil / ganzes : 0;
}

/** Eine Zeile der Register-Auswertung: Segment × Jahr, mit Anzahl und Leistung. */
export type BestandRohzeile = { segment: string; year: number; count: number; kwp: number };

export type BestandStand = { anzahl: number; kwp: number };
export type BestandSegmentSumme = BestandStand & {
  segment: Exclude<Segment, "n/a">;
  stichtag: BestandStand;
};
export type BestandSummen = {
  gesamt: BestandStand;
  stichtagGesamt: BestandStand;
  segmente: BestandSegmentSumme[];
};

/** Stabile Anzeigereihenfolge: vom kleinsten zum größten Anlagentyp. */
const SEGMENT_REIHENFOLGE: Record<string, number> = {
  steckersolar: 0,
  privat_dach: 1,
  gewerbe_dach: 2,
  freiflaeche: 3,
};

/**
 * Die Rohzeilen zu Bundessummen verdichten — Gesamtbestand und Bestand zum
 * Jahresstichtag, je Segment und über alles.
 *
 * Rein und hier, damit sie ohne Datenbank prüfbar ist. In der Ladeschicht war
 * sie es nicht: Ein Fehler im Stichtagsfilter — die häufigste Stelle, an der so
 * etwas kippt — wäre nur an einer Zahl auf der fertigen Seite aufgefallen, und
 * dort sieht man ihm nichts an.
 *
 * BEIDE SUMMEN LAUFEN ÜBER DIESELBEN ZEILEN. Das ist der Grund, warum sie in
 * einer Funktion stehen und nicht in zwei: Zwei Durchläufe über zwei Abfragen
 * wären zwei Quellen für zusammengehörige Zahlen, und die driften.
 */
export function verdichteBestand(zeilen: BestandRohzeile[], stichtagJahr: number): BestandSummen {
  const gesamt: BestandStand = { anzahl: 0, kwp: 0 };
  const stichtagGesamt: BestandStand = { anzahl: 0, kwp: 0 };
  const proSegment = new Map<string, BestandSegmentSumme>();

  for (const r of zeilen) {
    // Zeilen ohne Segment gehören zu anderen Energieträgern und haben in einer
    // Solar-Aufteilung nichts verloren.
    if (r.segment === "n/a" || !(r.segment in SEGMENT_REIHENFOLGE)) continue;
    const s =
      proSegment.get(r.segment) ??
      ({ segment: r.segment as Exclude<Segment, "n/a">, anzahl: 0, kwp: 0, stichtag: { anzahl: 0, kwp: 0 } } as BestandSegmentSumme);
    s.anzahl += r.count;
    s.kwp += r.kwp;
    gesamt.anzahl += r.count;
    gesamt.kwp += r.kwp;
    // Fehlerhafte Baujahre (das Register führt 1900er-Einträge aus
    // Eingabefehlern) zählen im Bestand mit — die Anlage steht ja da — und
    // damit auch im Stichtagsbestand. Nur ein JÜNGERES Jahr als der Stichtag
    // fällt heraus.
    const y = Number(r.year);
    if (Number.isFinite(y) && y <= stichtagJahr) {
      s.stichtag.anzahl += r.count;
      s.stichtag.kwp += r.kwp;
      stichtagGesamt.anzahl += r.count;
      stichtagGesamt.kwp += r.kwp;
    }
    proSegment.set(r.segment, s);
  }

  const segmente = [...proSegment.values()].sort(
    (a, b) => (SEGMENT_REIHENFOLGE[a.segment] ?? 99) - (SEGMENT_REIHENFOLGE[b.segment] ?? 99),
  );
  return { gesamt, stichtagGesamt, segmente };
}

/**
 * Zuwachs seit dem Jahresstichtag — absolut und relativ.
 *
 * Gibt `null` zurück, wenn die Basis fehlt: Ein Wachstum gegen null ist keine
 * unendliche Steigerung, sondern eine fehlende Vergleichszahl, und die gehört
 * nicht als Prozentsatz auf eine Seite.
 */
export function zuwachs(jetzt: number, stichtag: number): { absolut: number; anteil: number } | null {
  if (!(stichtag > 0)) return null;
  return { absolut: jetzt - stichtag, anteil: jetzt / stichtag - 1 };
}

/**
 * Wie viele volle Monate zwischen dem Jahresstichtag und dem Datenstand liegen.
 *
 * Das ist der Grund, warum diese Funktion existiert: Der Vergleich sieht aus wie
 * ein Jahresvergleich und ist keiner. Wer ihn „in den letzten zwölf Monaten"
 * nennt, während der Datenstand im August liegt, behauptet einen Zeitraum, der
 * die Hälfte länger ist als der gemessene — genau die Fehlerklasse
 * „Beschriftung sagt etwas anderes, als die Zahl misst".
 */
export function monateSeitStichtag(standIso: string, stichtagJahr: number): number {
  const jahr = Number(standIso.slice(0, 4));
  const monat = Number(standIso.slice(5, 7));
  if (!Number.isFinite(jahr) || !Number.isFinite(monat)) return 0;
  return Math.max(0, (jahr - stichtagJahr - 1) * 12 + monat);
}

/**
 * Der Zeitraum in Worten: „in den ersten sieben Monaten des Jahres 2026".
 *
 * Steht hier und nicht in der Seite, weil Seite, Widget und Social-Post ihn
 * gleich nennen müssen.
 */
const MONATSWORT = [
  "null", "einem", "zwei", "drei", "vier", "fünf", "sechs",
  "sieben", "acht", "neun", "zehn", "elf", "zwölf",
];

export function zeitraumSeitStichtag(standIso: string, stichtagJahr: number): string {
  const m = monateSeitStichtag(standIso, stichtagJahr);
  if (m <= 0) return `seit Ende ${stichtagJahr}`;
  const wort = m < MONATSWORT.length ? MONATSWORT[m] : String(m);
  return m === 1 ? `im ersten Monat des Jahres ${stichtagJahr + 1}` : `in den ersten ${wort} Monaten des Jahres ${stichtagJahr + 1}`;
}

/** Die Länder nach installierter Leistung, absteigend. */
export function laenderNachLeistung(b: Anlagenbestand): BestandLandZeile[] {
  return [...b.laender].sort((a, c) => c.kwp - a.kwp);
}

/** Die Länder nach Balkonkraftwerken je 1.000 Einwohner, absteigend. */
export function laenderNachBalkonDichte(b: Anlagenbestand): (BestandLandZeile & { jeTausend: number })[] {
  return b.laender
    .map((l) => ({ ...l, jeTausend: l.einwohner > 0 ? (l.balkon / l.einwohner) * 1000 : 0 }))
    .sort((a, c) => c.jeTausend - a.jeTausend);
}

/** Solarleistung je Einwohner in Watt-Peak, absteigend. */
export function laenderNachProKopf(b: Anlagenbestand): (BestandLandZeile & { wpProKopf: number })[] {
  return b.laender
    .map((l) => ({ ...l, wpProKopf: l.einwohner > 0 ? (l.kwp * 1000) / l.einwohner : 0 }))
    .sort((a, c) => c.wpProKopf - a.wpProKopf);
}

export function segmentZeile(b: Anlagenbestand, segment: Exclude<Segment, "n/a">): BestandSegmentZeile | undefined {
  return b.segmente.find((s) => s.segment === segment);
}
