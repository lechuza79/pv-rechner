import { describe, expect, it } from "vitest";
import {
  FEED_IN_ALT_END,
  FEED_IN_ALT_START,
  FEED_IN_ARCHIV_ALT,
  altFeedInRatesFor,
  blendRoofRate,
} from "../feedin-archiv-alt";
import { FEED_IN_ARCHIV, FEED_IN_ARCHIV_START } from "../feedin-archiv";

/**
 * Realitäts-Anker für die Einspeisevergütung 2007 – 03/2012.
 *
 * Die Tests prüfen bewusst EIGENSCHAFTEN, die aus dem Gesetz folgen
 * (Degression fällt, Dach zahlt mehr als Freifläche, Bänder), nicht die
 * Tabelle gegen sich selbst. Wer eine Zeile ändert, muss diese Eigenschaften
 * wieder treffen — "sieht plausibel aus" gilt nicht (Wächter-Gate Regel 7).
 */

describe("Feed-in-Archiv vor 04/2012 — Struktur", () => {
  it("ist chronologisch sortiert und beginnt/endet an den deklarierten Grenzen", () => {
    const froms = FEED_IN_ARCHIV_ALT.map((r) => r.from);
    expect(froms).toEqual([...froms].sort());
    expect(froms[0]).toBe(FEED_IN_ALT_START);
    expect(froms[froms.length - 1] < FEED_IN_ALT_END).toBe(true);
  });

  it("jede Zeile nennt ihre Fundstelle", () => {
    for (const row of FEED_IN_ARCHIV_ALT) {
      expect(row.source.length).toBeGreaterThan(20);
    }
  });
});

describe("Feed-in-Archiv vor 04/2012 — Realitäts-Anker", () => {
  it("alle Sätze liegen im Band 15–55 ct/kWh", () => {
    for (const row of FEED_IN_ARCHIV_ALT) {
      for (const wert of [row.roofUpTo30, row.roofUpTo100, row.groundMounted]) {
        expect(wert).toBeGreaterThanOrEqual(15);
        expect(wert).toBeLessThanOrEqual(55);
      }
    }
  });

  it("die Sätze fallen über die Zeit monoton (Degression, nie eine Erhöhung)", () => {
    for (let i = 1; i < FEED_IN_ARCHIV_ALT.length; i++) {
      const prev = FEED_IN_ARCHIV_ALT[i - 1];
      const cur = FEED_IN_ARCHIV_ALT[i];
      expect(cur.roofUpTo30).toBeLessThan(prev.roofUpTo30);
      expect(cur.roofUpTo100).toBeLessThan(prev.roofUpTo100);
      expect(cur.groundMounted).toBeLessThan(prev.groundMounted);
    }
  });

  it("Dach zahlt in jedem Zeitraum mehr als Freifläche, kleine Klasse mehr als große", () => {
    for (const row of FEED_IN_ARCHIV_ALT) {
      expect(row.roofUpTo30).toBeGreaterThan(row.roofUpTo100);
      expect(row.roofUpTo100).toBeGreaterThan(row.groundMounted);
    }
  });

  it("2011 gab es unterjährig KEINE Kürzung — genau ein Stichtag im Jahr 2011", () => {
    // BNetzA-Blatt "ab dem 1. Juli 2011 bzw. 1. September 2011": Degression 0 %.
    const stichtage2011 = FEED_IN_ARCHIV_ALT.filter((r) => r.from.startsWith("2011"));
    expect(stichtage2011).toHaveLength(1);
    expect(stichtage2011[0].from).toBe("2011-01-01");
    expect(altFeedInRatesFor("2011-12-31")?.roofUpTo30).toBe(28.74);
  });

  it("2010 hatte drei Stichtage — die beiden Kürzungen der PV-Novelle 2010", () => {
    // § 20 Abs. 4 EEG 2009 i. d. F. v. 11.08.2010: Dach −13 %, ab Oktober −3 %
    // weitere; Freifläche −12 % bzw. −3 %. Gerundet erst am Ende (§ 20 Abs. 5).
    const jan = altFeedInRatesFor("2010-01-01")!;
    const jul = altFeedInRatesFor("2010-07-01")!;
    const okt = altFeedInRatesFor("2010-10-01")!;

    expect(jul.roofUpTo30).toBeCloseTo(round2(jan.roofUpTo30 * 0.87), 2);
    expect(jul.roofUpTo100).toBeCloseTo(round2(jan.roofUpTo100 * 0.87), 2);
    expect(jul.groundMounted).toBeCloseTo(round2(jan.groundMounted * 0.88), 2);

    expect(okt.roofUpTo30).toBeCloseTo(round2(jan.roofUpTo30 * 0.87 * 0.97), 2);
    expect(okt.roofUpTo100).toBeCloseTo(round2(jan.roofUpTo100 * 0.87 * 0.97), 2);
    expect(okt.groundMounted).toBeCloseTo(round2(jan.groundMounted * 0.88 * 0.97), 2);
  });
});

describe("Anschluss an die Monatstabelle ab 04/2012", () => {
  it("zwischen 01/2012 und 04/2012 liegt ein echter Gesetzesbruch von rund 20 %", () => {
    // ACHTUNG, KEIN DATENFEHLER: Zum 01.04.2012 trat die PV-Novelle 2012
    // (Gesetz vom 17.08.2012, rückwirkend ab 01.04.2012) in Kraft. Sie senkte
    // die Sätze in einem Schritt drastisch UND schnitt die Leistungsklassen neu
    // (vorher ≤ 30 / ≤ 100 kW, danach ≤ 10 / ≤ 40 kW). Der Sprung von 24,43 ct
    // auf 19,50 ct ist also zweierlei zugleich: echte Kürzung und Klassenwechsel.
    // Wer die beiden Tabellen ohne diesen Hinweis aneinanderklebt, liest den
    // Sprung als Fehler — er ist die Gesetzesänderung selbst.
    const letzterAlt = FEED_IN_ARCHIV_ALT[FEED_IN_ARCHIV_ALT.length - 1];
    const ersterNeu = FEED_IN_ARCHIV[0];

    expect(letzterAlt.from).toBe("2012-01-01");
    expect(ersterNeu.ym).toBe(FEED_IN_ARCHIV_START);
    expect(FEED_IN_ARCHIV_START).toBe("2012-04");
    expect(`${FEED_IN_ARCHIV_START}-01`).toBe(FEED_IN_ALT_END);

    const bruch = 1 - ersterNeu.u10 / letzterAlt.roofUpTo30;
    expect(bruch).toBeGreaterThan(0.15);
    expect(bruch).toBeLessThan(0.3);
  });

  it("es gibt keine Lücke und keine Überlappung zwischen beiden Tabellen", () => {
    expect(altFeedInRatesFor("2012-03-31")?.from).toBe("2012-01-01");
    expect(altFeedInRatesFor("2012-04-01")).toBeNull();
  });
});

describe("altFeedInRatesFor — Grenzen", () => {
  it("liefert vor 2007 null", () => {
    expect(altFeedInRatesFor("2006-12-31")).toBeNull();
    expect(altFeedInRatesFor("2004-07-31")).toBeNull();
    expect(altFeedInRatesFor("1999-01-01")).toBeNull();
  });

  it("liefert ab 04/2012 null", () => {
    expect(altFeedInRatesFor("2012-04")).toBeNull();
    expect(altFeedInRatesFor("2013-06-15")).toBeNull();
    expect(altFeedInRatesFor("2026-01-01")).toBeNull();
  });

  it("liefert innerhalb des Bereichs den zum Datum gültigen Stichtag", () => {
    expect(altFeedInRatesFor("2007-01-01")?.roofUpTo30).toBe(49.21);
    expect(altFeedInRatesFor("2008-06-30")?.groundMounted).toBe(35.49);
    expect(altFeedInRatesFor("2009-12-31")?.roofUpTo100).toBe(40.91);
    expect(altFeedInRatesFor("2010-06-30")?.roofUpTo30).toBe(39.14);
    expect(altFeedInRatesFor("2010-09-30")?.roofUpTo30).toBe(34.05);
    expect(altFeedInRatesFor("2010-10-01")?.roofUpTo30).toBe(33.03);
  });

  it("akzeptiert auch Monatsangaben und weist Müll ab", () => {
    expect(altFeedInRatesFor("2009-05")?.roofUpTo30).toBe(43.01);
    expect(altFeedInRatesFor("2009")).toBeNull();
    expect(altFeedInRatesFor("Mai 2009")).toBeNull();
    expect(altFeedInRatesFor("")).toBeNull();
  });
});

describe("blendRoofRate — anteilige Staffel statt Sprungtarif", () => {
  // EEG 2004 § 12 Abs. 2 Satz 1 / EEG 2009 § 18 Abs. 1: die Vergütung bestimmt
  // sich anteilig nach der Leistung im Verhältnis zum Schwellenwert.
  const row = altFeedInRatesFor("2009-01-01")!;

  it("bis 30 kW ist es schlicht der kleine Satz", () => {
    expect(blendRoofRate(row, 10)).toBe(row.roofUpTo30);
    expect(blendRoofRate(row, 30)).toBe(row.roofUpTo30);
  });

  it("darüber liegt der Mischsatz echt zwischen beiden Klassen", () => {
    const mix = blendRoofRate(row, 40)!;
    expect(mix).toBeLessThan(row.roofUpTo30);
    expect(mix).toBeGreaterThan(row.roofUpTo100);
    // 30/40 × 43,01 + 10/40 × 40,91
    expect(mix).toBeCloseTo(42.485, 3);
  });

  it("gibt außerhalb des abgebildeten Bereichs null statt eines geratenen Satzes", () => {
    expect(blendRoofRate(row, 0)).toBeNull();
    expect(blendRoofRate(row, 250)).toBeNull();
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
