import { describe, it, expect } from "vitest";
import { DEFAULT_FEED_IN, FEED_IN_SCHEDULE, feedInDegressionSteps, feedInEndIso, feedInPeriodsSince2022, feedInRatesFor, feedInRatesForCommissioning, naechsteDegressionIso, halbjahresBeginnIso } from "../feedin-config";

/**
 * Realitäts-Anker für die EEG-Einspeisevergütung (Wächter-Gate, Regel 7).
 *
 * Die Sätze werden halbjährlich automatisch gepflegt. Damit kein Wert per Hand
 * "plausibel gemacht" werden kann, rechnet dieser Test die gesetzliche Kette
 * unabhängig nach und hält sie gegen die von der Bundesnetzagentur
 * VERÖFFENTLICHTEN Halbjahre. Schlägt einer dieser Vergleiche fehl, stimmt
 * entweder die Kette nicht mehr (Gesetzesänderung) oder jemand hat einen Wert
 * frei gesetzt.
 *
 * Diese Datei implementiert die Kette bewusst ein zweites Mal statt sie aus
 * feedin-config zu importieren — ein Anker, der dieselbe Funktion aufruft, die
 * er prüfen soll, prüft nichts.
 */

// § 48 Abs. 2 / Abs. 2a EEG 2023, Gebäude und Lärmschutzwände (ct/kWh).
const BASIS = {
  teilUnder10: 8.6,
  teilOver10: 7.5,
  vollUnder10: 13.4,
  vollOver10: 11.3,
} as const;

const ABZUG_53 = 0.4; // § 53 Abs. 1 EEG: Einspeisevergütung statt Marktprämie

/**
 * Kaufmännisch auf zwei Nachkommastellen. Der Umweg über toFixed fängt die
 * Binärdarstellung ab: 7,5 × 0,99 liegt knapp UNTER 7,425, ein nacktes
 * Math.round(x * 100) ergäbe dort 7,42 statt der amtlichen 7,43.
 */
const round2 = (x: number) => Math.round(Number((x * 100).toFixed(6))) / 100;

/** Anzulegender Wert nach n Halbjahresschritten (§ 49 Satz 1: 1 %, ungerundet fortgeschrieben). */
const anzulegenderWert = (basis: number, n: number) => round2(basis * Math.pow(0.99, n));

/** Einspeisevergütung = anzulegender Wert − 0,4 ct. */
const verguetung = (basis: number, n: number) => round2(anzulegenderWert(basis, n) - ABZUG_53);

const satzFuer = (n: number) => ({
  teilUnder10: verguetung(BASIS.teilUnder10, n),
  teilOver10: verguetung(BASIS.teilOver10, n),
  vollUnder10: verguetung(BASIS.vollUnder10, n),
  vollOver10: verguetung(BASIS.vollOver10, n),
});

/**
 * Amtlich veröffentlichte Einspeisevergütung, Gebäude, je Inbetriebnahme-
 * Halbjahr — abgeschrieben aus den Tabellen der Bundesnetzagentur
 * ("Anzulegende Werte für Solaranlagen", Archiv), geprüft am 01.08.2026.
 * n = Zahl der Degressionsschritte seit dem 01.02.2024.
 *
 * Volltext des zuletzt erschienenen Halbjahres liegt im Repo:
 * docs/quellen/bnetza-verguetungssaetze-aug2026-jan2027.xlsx
 */
const AMTLICH: Array<{ n: number; zeitraum: string; teilUnder10: number; teilOver10: number; vollUnder10: number; vollOver10: number }> = [
  { n: 1, zeitraum: "02–07/2024",    teilUnder10: 8.11, teilOver10: 7.03, vollUnder10: 12.87, vollOver10: 10.79 },
  { n: 2, zeitraum: "08/2024–01/25", teilUnder10: 8.03, teilOver10: 6.95, vollUnder10: 12.73, vollOver10: 10.68 },
  { n: 3, zeitraum: "02–07/2025",    teilUnder10: 7.94, teilOver10: 6.88, vollUnder10: 12.60, vollOver10: 10.56 },
  { n: 4, zeitraum: "08/2025–01/26", teilUnder10: 7.86, teilOver10: 6.80, vollUnder10: 12.47, vollOver10: 10.45 },
  { n: 5, zeitraum: "02–07/2026",    teilUnder10: 7.78, teilOver10: 6.73, vollUnder10: 12.34, vollOver10: 10.35 },
  { n: 6, zeitraum: "08/2026–01/27", teilUnder10: 7.70, teilOver10: 6.66, vollUnder10: 12.22, vollOver10: 10.24 },
];

describe("EEG-Vergütung – Realitäts-Anker", () => {
  it.each(AMTLICH)(
    "die Gesetzeskette trifft die veröffentlichten Sätze für $zeitraum",
    ({ n, teilUnder10, teilOver10, vollUnder10, vollOver10 }) => {
      expect(satzFuer(n)).toEqual({ teilUnder10, teilOver10, vollUnder10, vollOver10 });
    },
  );

  it("die hinterlegten Sätze je Stichtag stammen aus derselben Kette", () => {
    // 02–07/2026 (n=5) und ab 08/2026 (n=6) — beide Stichtage aus dem Plan.
    const juli = feedInRatesFor(new Date("2026-07-31T12:00:00Z"));
    const august = feedInRatesFor(new Date("2026-08-01T12:00:00Z"));

    expect(juli.validFrom).toBe("2026-02-01");
    expect({
      teilUnder10: juli.teilUnder10, teilOver10: juli.teilOver10,
      vollUnder10: juli.vollUnder10, vollOver10: juli.vollOver10,
    }).toEqual(satzFuer(5));

    expect(august.validFrom).toBe("2026-08-01");
    expect({
      teilUnder10: august.teilUnder10, teilOver10: august.teilOver10,
      vollUnder10: august.vollUnder10, vollOver10: august.vollOver10,
    }).toEqual(satzFuer(6));
  });

  it("schreibt NICHT den bereits gerundeten Vergütungssatz fort", () => {
    // Der verbreitete Kurzschluss (10,35 × 0,99 → 10,25) verstößt gegen § 49
    // Abs. 1 Satz 2 und verfehlt 11 der amtlich veröffentlichten Zellen. Zwei
    // Belege aus der amtlichen Reihe, an denen sich beide Wege trennen:
    expect(satzFuer(6).vollOver10).toBe(10.24);
    expect(round2(10.35 * 0.99)).toBe(10.25); // so entstünde der falsche Wert
    expect(satzFuer(5).teilOver10).toBe(6.73); // Kurzschluss aus n=4 ergäbe 6,74
  });

  it("der Stichtags-Plan liefert immer einen Satz, auch vor dem ersten Eintrag", () => {
    const frueh = feedInRatesFor(new Date("2020-01-01T12:00:00Z"));
    expect(frueh.teilUnder10).toBeGreaterThan(0);
    expect(frueh.thresholdKwp).toBe(10);
  });

  it("bleibt in einer plausiblen Spanne und behält die EEG-Staffelung", () => {
    const r = DEFAULT_FEED_IN;
    // Volleinspeisung liegt über Teileinspeisung, kleine Anlagen über großen.
    expect(r.vollUnder10).toBeGreaterThan(r.teilUnder10);
    expect(r.vollOver10).toBeGreaterThan(r.teilOver10);
    expect(r.teilUnder10).toBeGreaterThan(r.teilOver10);
    expect(r.vollUnder10).toBeGreaterThan(r.vollOver10);
    // Kein Satz kann durch die 1-%-Degression je aus diesem Korridor laufen.
    for (const wert of [r.teilUnder10, r.teilOver10, r.vollUnder10, r.vollOver10]) {
      expect(wert).toBeGreaterThan(3);
      expect(wert).toBeLessThan(15);
    }
  });

  it("nennt die Behörde erst, seit ihre Liste erschienen ist — und trägt dann keinen Vorbehalt mehr", () => {
    // Bis zum 31.07.2026 waren diese Sätze aus dem Gesetz abgeleitet, also mit
    // sichtbarem Herkunfts-Vorbehalt und OHNE die Behörde als Urheberin. Seit
    // die Bundesnetzagentur ihre Tabelle veröffentlicht hat (abgerufen am
    // 01.08.2026, Volltext in docs/quellen/), gilt das Gegenteil: Zuschreibung
    // an die Behörde, kein Vorbehalt. Beide Fehlrichtungen sind hier zu.
    const august = feedInRatesFor(new Date("2026-08-01T12:00:00Z"));
    expect(august.note ?? null).toBeNull();
    expect(august.source).toMatch(/Bundesnetzagentur/);
    expect(august.source).not.toMatch(/Eigene Berechnung/);
  });

  it("ein Satz mit Herkunfts-Vorbehalt schreibt sich nie der Behörde zu", () => {
    // Die Regel selbst, unabhängig vom aktuellen Halbjahr: Der Vorbehalt und
    // die amtliche Zuschreibung schließen einander aus. Greift beim nächsten
    // Mal, wenn wir einem Halbjahr vorausrechnen (Stichtag 01.02.2027).
    for (const satz of FEED_IN_SCHEDULE) {
      if (satz.note) expect(satz.source ?? "").not.toMatch(/Bundesnetzagentur/);
    }
  });
});

describe("Der Stichtags-Plan läuft nicht aus (Council 05.09.2026)", () => {
  // Der Plan endete mit dem Halbjahr 08/2026–01/2027. Ab dem 01.02.2027 lieferte
  // feedInRatesFor() den alten Satz weiter (7,70 ct), während die Nachschlage-
  // Tabelle aus der Gesetzeskette schon 7,62 ct zeigte — zwei Sätze für denselben
  // Tag auf zwei Seiten, und der Rechner mit dem falschen. Gefangen wird das nur
  // mit Datums-Injektion: Am Tag der Prüfung stimmen beide immer überein.
  const letzter = FEED_IN_SCHEDULE[FEED_IN_SCHEDULE.length - 1];

  it("am letzten Tag des geplanten Halbjahrs gilt der Plan-Satz ohne Vorbehalt", () => {
    const tag = new Date(naechsteDegressionIso(letzter.validFrom) + "T11:00:00Z");
    tag.setUTCDate(tag.getUTCDate() - 1);
    const satz = feedInRatesFor(tag);
    expect(satz).toBe(letzter);
    expect(satz.note ?? null).toBeNull();
  });

  it("nach dem Ende des Plans fällt der Rechner auf die Gesetzeskette zurück — mit Vorbehalt, ohne Behörde", () => {
    const stichtag = naechsteDegressionIso(letzter.validFrom);
    for (const tagIso of [stichtag, naechsteDegressionIso(stichtag), "2029-03-15"]) {
      const satz = feedInRatesFor(new Date(tagIso + "T11:00:00Z"));
      const kette = feedInRatesForCommissioning(tagIso)!;
      expect(satz.teilUnder10).toBe(kette.teilUnder10);
      expect(satz.vollOver10).toBe(kette.vollOver10);
      expect(satz.teilUnder10).toBeLessThan(letzter.teilUnder10);
      expect(satz.validFrom).toBe(halbjahresBeginnIso(tagIso));
      expect(satz.note).toBeTruthy();
      expect(satz.source ?? "").not.toMatch(/Bundesnetzagentur,/);
    }
  });

  it("die Ableitung kennt die konkrete Zelle: 01.02.2027 = 7,62 / 12,09 ct", () => {
    // n = 7 Halbjahresschritte: 8,60 × 0,99^7 = 8,019 → 8,02 − 0,40 = 7,62.
    const satz = feedInRatesFor(new Date("2027-02-01T11:00:00Z"));
    expect(satz.teilUnder10).toBe(7.62);
    expect(satz.vollUnder10).toBe(12.09);
  });

  it("Halbjahresbeginn folgt der 1.2./1.8.-Regel, Januar gehört zum Vorjahr", () => {
    expect(halbjahresBeginnIso("2027-02-01")).toBe("2027-02-01");
    expect(halbjahresBeginnIso("2027-07-31")).toBe("2027-02-01");
    expect(halbjahresBeginnIso("2027-08-01")).toBe("2027-08-01");
    expect(halbjahresBeginnIso("2028-01-15")).toBe("2027-08-01");
  });
});

describe("Sätze nach Inbetriebnahme (Bestandsanlagen-Ableitung)", () => {
  // Ein Datum mitten in jedem amtlich veröffentlichten Halbjahr — die
  // Ableitung aus der Config muss jede BNetzA-Zelle treffen (gleiche Quelle
  // wie AMTLICH oben, docs/quellen/).
  const DATUM_JE_N: Record<number, string> = {
    1: "2024-03-15",
    2: "2024-09-01",
    3: "2025-02-01",
    4: "2025-08-15",
    5: "2026-02-15",
    6: "2026-08-04",
  };

  it.each(AMTLICH)(
    "Inbetriebnahme im Zeitraum $zeitraum bekommt die veröffentlichten Sätze",
    ({ n, teilUnder10, teilOver10, vollUnder10, vollOver10 }) => {
      const r = feedInRatesForCommissioning(DATUM_JE_N[n]);
      expect(r).not.toBeNull();
      expect({
        teilUnder10: r!.teilUnder10, teilOver10: r!.teilOver10,
        vollUnder10: r!.vollUnder10, vollOver10: r!.vollOver10,
      }).toEqual({ teilUnder10, teilOver10, vollUnder10, vollOver10 });
    },
  );

  it("das eingefrorene Halbjahr 30.07.2022–31.01.2024 bekommt die Basiswerte minus 0,4 ct", () => {
    // Amtlich veröffentlichte Vergütung dieser Periode (BNetzA-Archiv):
    // 8,20 / 7,10 (Teileinspeisung) bzw. 13,00 / 10,90 (Volleinspeisung).
    const r = feedInRatesForCommissioning("2023-06-15");
    expect(r).not.toBeNull();
    expect(r!.teilUnder10).toBe(8.2);
    expect(r!.teilOver10).toBe(7.1);
    expect(r!.vollUnder10).toBe(13.0);
    expect(r!.vollOver10).toBe(10.9);
  });

  it("Januar zählt zum August-Halbjahr des Vorjahres", () => {
    expect(feedInDegressionSteps("2025-01-15")).toBe(2);
    expect(feedInDegressionSteps("2025-02-01")).toBe(3);
    expect(feedInRatesForCommissioning("2025-01-15")!.teilUnder10).toBe(8.03);
  });

  it("vor dem 30.07.2022 übernimmt das BNetzA-Monatsarchiv, vor 04/2012 gibt es bewusst nichts", () => {
    // Die Kette gilt erst ab den EEG-2023-Basiswerten; davor liefert die
    // amtliche Monatstabelle (lib/feedin-archiv.ts), und vor April 2012 wäre
    // ein erfundener Wert schlimmer als keiner (Zahlen-Korrektheit).
    expect(feedInRatesForCommissioning("2022-07-29")!.teilUnder10).toBe(6.24);
    expect(feedInRatesForCommissioning("2015-01-01")!.teilUnder10).toBe(12.56);
    expect(feedInRatesForCommissioning("2012-03-31")).toBeNull();
    expect(feedInRatesForCommissioning("2005-06-01")).toBeNull();
  });

  it("die Ableitung und der Stichtags-Plan liefern für heute dieselben Zahlen", () => {
    const heute = new Date("2026-08-04T12:00:00Z");
    const plan = feedInRatesFor(heute);
    const kette = feedInRatesForCommissioning("2026-08-04")!;
    expect(kette.teilUnder10).toBe(plan.teilUnder10);
    expect(kette.teilOver10).toBe(plan.teilOver10);
    expect(kette.vollUnder10).toBe(plan.vollUnder10);
    expect(kette.vollOver10).toBe(plan.vollOver10);
  });

  it("die Perioden-Tabelle deckt lückenlos 30.07.2022 bis heute ab und erfindet keine Zukunft", () => {
    // Die Ratgeber-Tabelle zeigt genau diese Perioden. Grenzen falsch = ein
    // Nutzer liest für seinen Inbetriebnahme-Monat den falschen Satz ab.
    const heute = new Date("2026-08-04T12:00:00Z");
    const perioden = feedInPeriodsSince2022(heute);
    // Bis 31.01.2024 setzte die Degression aus → eine zusammengefasste Periode.
    expect(perioden[0].fromIso).toBe("2022-07-30");
    expect(perioden[0].toIso).toBe("2024-01-31");
    expect(perioden[0].rates.teilUnder10).toBe(8.2);
    expect(perioden[0].rates.vollUnder10).toBe(13.0);
    // Danach halbjährlich: 02/2024, 08/2024, 02/2025, 08/2025, 02/2026, 08/2026.
    expect(perioden.map((p) => p.fromIso)).toEqual([
      "2022-07-30", "2024-02-01", "2024-08-01",
      "2025-02-01", "2025-08-01", "2026-02-01", "2026-08-01",
    ]);
    // Lückenlos: jede Periode endet am Vortag der nächsten.
    for (let i = 0; i + 1 < perioden.length; i++) {
      const next = new Date(`${perioden[i].toIso}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      expect(next.toISOString().slice(0, 10)).toBe(perioden[i + 1].fromIso);
    }
    // Laufende Periode: offen und identisch mit dem Stichtags-Plan.
    const letzte = perioden[perioden.length - 1];
    expect(letzte.toIso).toBeNull();
    expect(letzte.rates.teilUnder10).toBe(feedInRatesFor(heute).teilUnder10);
    // Sätze kommen 1:1 aus der geprüften Kette (keine zweite Rechenquelle).
    for (const p of perioden) {
      expect(p.rates).toEqual(feedInRatesForCommissioning(p.fromIso));
    }
    // Vor einem Stichtag taucht die künftige Periode nicht auf.
    const vorStichtag = feedInPeriodsSince2022(new Date("2026-07-31T12:00:00Z"));
    expect(vorStichtag[vorStichtag.length - 1].fromIso).toBe("2026-02-01");
  });

  it("der nächste Degressions-Stichtag folgt der 1.2./1.8.-Regel (auch an den Kanten)", () => {
    expect(naechsteDegressionIso("2026-08-06")).toBe("2027-02-01");
    expect(naechsteDegressionIso("2026-08-01")).toBe("2027-02-01"); // am Stichtag selbst: der nächste
    expect(naechsteDegressionIso("2026-07-31")).toBe("2026-08-01");
    expect(naechsteDegressionIso("2027-01-31")).toBe("2027-02-01");
    expect(naechsteDegressionIso("2026-12-31")).toBe("2027-02-01"); // Jahreswechsel
    expect(naechsteDegressionIso("2026-02-01")).toBe("2026-08-01");
  });

  it("die Vergütung endet am 31.12. des zwanzigsten Jahres (§ 25 EEG)", () => {
    // Gesetzlich bestimmter anzulegender Wert (feste Vergütung) → der
    // 20-Jahres-Zeitraum verlängert sich bis zum Jahresende. Wortlaut geprüft
    // am 04.08.2026 (gesetze-im-internet.de/eeg_2014/__25.html).
    expect(feedInEndIso("2023-03-15")).toBe("2043-12-31");
    expect(feedInEndIso("2010-01-01")).toBe("2030-12-31");
    expect(feedInEndIso("2026-08-04")).toBe("2046-12-31");
  });
});
