import { describe, it, expect } from "vitest";
import {
  ABRECHNUNGS_POSTEN,
  ABRUF_TAGE,
  BASIS_TAGE,
  MIN_AUFBAUTEN,
  MIN_SCHREIBVORGAENGE,
  MIN_VERGLEICHSTAGE,
  SPRUNG_FAKTOR,
  abrechnungVerspaetet,
  abrufZeitraum,
  beurteileKostenTag,
  groesstesVielfaches,
  median,
  tagesmengenAusAbrechnung,
  type Tagesmenge,
} from "../kostenwache";

// Was dieser Test hält — und warum er in BEIDE Richtungen gebaut ist:
//
// Die Projektanleitung nennt mehrere Fälle, in denen ein Wächter nichts sah und
// trotzdem grün meldete (der Datenbank-Wächter, der sechs von neun Aufrufen
// übersah; der Test, der einen falschen Gemeindeschlüssel mit sich selbst
// verglich). Ein Melder, der nur beweist, dass er bei Ruhe schweigt, beweist
// nichts. Deshalb steht neben jedem „schlägt nicht an" ein „schlägt an", mit
// echten Zahlen: dem gemessenen Normalbetrieb der beiden Projekte und dem
// Ausmaß des Vorfalls, um den es geht (+249 %, also das 3,49-fache).

const tag = (n: number) => new Date(Date.UTC(2026, 7, n)).toISOString().slice(0, 10);

/** Vierzehn Tage Normalbetrieb um ein Niveau herum, mit Wochenend-Schwankung. */
function normalReihe(basisLast: number, basisSchreiben: number): Tagesmenge[] {
  const schwankung = [1, 0.82, 1.14, 0.93, 1.21, 0.7, 1.06, 0.88, 1.17, 0.95, 1.28, 0.76, 1.09, 1.02];
  return schwankung.map((f, i) => ({
    tag: tag(i + 1),
    aufbauten: Math.round(basisLast * f),
    schreibvorgaenge: Math.round(basisSchreiben * f),
  }));
}

/** Abrechnungsdaten im Format der Plattform (FOCUS-JSONL), eine Zeile je Posten. */
function abrechnung(projectId: string, tage: [string, number, number][]): string {
  const zeilen: string[] = [];
  for (const [tag, aufrufe, schreiben] of tage) {
    const basis = { ChargePeriodStart: `${tag}T07:00:00.000Z`, ChargeCategory: "Usage", BilledCost: 0, Tags: { ProjectId: projectId } };
    zeilen.push(JSON.stringify({ ...basis, ServiceName: ABRECHNUNGS_POSTEN.aufbauten, ConsumedQuantity: aufrufe, ConsumedUnit: "Invocations" }));
    zeilen.push(JSON.stringify({ ...basis, ServiceName: ABRECHNUNGS_POSTEN.schreibvorgaenge, ConsumedQuantity: schreiben, ConsumedUnit: "Writes" }));
    zeilen.push(JSON.stringify({ ...basis, ServiceName: "CDN Requests", ConsumedQuantity: 999_999, ConsumedUnit: "Requests" }));
  }
  return zeilen.join("\n");
}

// ECHTE Abrechnung von solar-check.io, 19.09.–05.10.2026 (abgerufen 07.10.2026):
// Funktionsaufrufe und Cache-Schreibvorgänge je Abrechnungstag. Ab 02.10. der
// Crawler-Sturm, den die Wache melden muss — davor Normalbetrieb, den sie nicht
// melden darf.
const SOLAR_CHECK_ECHT: [string, number, number][] = [
  ["2026-09-19", 15111, 102331], ["2026-09-20", 9806, 67286], ["2026-09-21", 6530, 62589],
  ["2026-09-22", 11121, 122014], ["2026-09-23", 13767, 161838], ["2026-09-24", 12708, 105852],
  ["2026-09-25", 11322, 82406], ["2026-09-26", 11266, 139326], ["2026-09-27", 6306, 51878],
  ["2026-09-28", 10113, 93087], ["2026-09-29", 19217, 214546], ["2026-09-30", 10888, 109276],
  ["2026-10-01", 17237, 257675], ["2026-10-02", 79115, 466841], ["2026-10-03", 40531, 272789],
  ["2026-10-04", 67757, 399818], ["2026-10-05", 33402, 294969],
];

describe("Abrechnungsdaten lesen", () => {
  it("summiert genau die zwei Posten je Tag und nur für das gefragte Projekt", () => {
    const text = abrechnung("prj_a", [["2026-10-01", 100, 2000]]) + "\n" + abrechnung("prj_b", [["2026-10-01", 7, 7]]);
    expect(tagesmengenAusAbrechnung(text, "prj_a")).toEqual([
      { tag: "2026-10-01", aufbauten: 100, schreibvorgaenge: 2000 },
    ]);
  });

  it("sortiert die Tage aufsteigend und übergeht kaputte Zeilen", () => {
    const text = abrechnung("prj_a", [["2026-10-02", 1, 1], ["2026-10-01", 2, 2]]) + "\nkein json\n";
    expect(tagesmengenAusAbrechnung(text, "prj_a").map((t) => t.tag)).toEqual(["2026-10-01", "2026-10-02"]);
  });

  // Ein Tag ohne Daten FEHLT — er wird nicht als null Verkehr abgelegt. Eine
  // Null behauptete am Folgetag einen Sprung ins Unendliche.
  it("erfindet für einen fehlenden Tag keine Null", () => {
    const text = abrechnung("prj_a", [["2026-10-01", 5, 5], ["2026-10-03", 5, 5]]);
    expect(tagesmengenAusAbrechnung(text, "prj_a").map((t) => t.tag)).toEqual(["2026-10-01", "2026-10-03"]);
    expect(tagesmengenAusAbrechnung("", "prj_a")).toEqual([]);
  });
});

describe("Die echte Abrechnung: Normalbetrieb schweigt, der Sturm schlägt an", () => {
  const reihe = tagesmengenAusAbrechnung(abrechnung("prj_sc", SOLAR_CHECK_ECHT), "prj_sc");
  const urteil = (tag: string) => {
    const i = reihe.findIndex((t) => t.tag === tag);
    return beurteileKostenTag(reihe[i], reihe.slice(0, i));
  };

  it("meldet keinen Tag vor dem Sturm", () => {
    for (const t of reihe.filter((t) => t.tag < "2026-10-02").slice(MIN_VERGLEICHSTAGE)) {
      expect(urteil(t.tag).art, t.tag).toBe("ruhig");
    }
  });

  it("meldet den ersten Sturmtag, und zwar in beiden Größen", () => {
    const u = urteil("2026-10-02");
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.groessen.every((g) => g.gesprungen)).toBe(true);
  });
});

describe("Median als Vergleichsniveau", () => {
  it("nimmt die Mitte, nicht den Durchschnitt", () => {
    expect(median([1, 2, 3, 4, 100])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  // Der Grund für den Median: Ein Vorfall darf das Niveau nicht anheben, sonst
  // versteckt der erste den zweiten.
  it("lässt sich von einem Ausreißer nicht anheben", () => {
    const ruhig = median([100, 100, 100, 100, 100, 100, 100]);
    const mitVorfall = median([100, 100, 100, 100, 100, 100, 900]);
    expect(mitVorfall).toBe(ruhig);
  });
});

describe("Anlaufzeit: kein Urteil ist nicht „in Ordnung“", () => {
  it("urteilt nicht, solange weniger als sieben Vortage abgelegt sind", () => {
    const reihe = normalReihe(60000, 50000).slice(0, 6);
    const u = beurteileKostenTag({ tag: tag(7), aufbauten: 200000, schreibvorgaenge: 180000 }, reihe);
    // Ein dreifacher Wert — und trotzdem KEIN Alarm, weil es nichts gibt,
    // wogegen man ihn halten könnte. Das ist Absicht und muss so aussehen.
    expect(u.art).toBe("kein-urteil");
    if (u.art === "kein-urteil") {
      expect(u.grund).toMatch(/Vergleichsniveau/);
      expect(u.grund).toContain(String(MIN_VERGLEICHSTAGE));
    }
  });

  it("urteilt ab dem siebten Vortag", () => {
    const reihe = normalReihe(60000, 50000).slice(0, MIN_VERGLEICHSTAGE);
    const u = beurteileKostenTag({ tag: tag(8), aufbauten: 61000, schreibvorgaenge: 50500 }, reihe);
    expect(u.art).toBe("ruhig");
  });

  it("zählt nur Tage VOR dem beurteilten mit", () => {
    // Sieben Zeilen, aber eine davon ist der Tag selbst → sechs Vortage.
    const reihe = normalReihe(60000, 50000).slice(0, MIN_VERGLEICHSTAGE);
    const u = beurteileKostenTag({ tag: tag(5), aufbauten: 61000, schreibvorgaenge: 50500 }, reihe);
    expect(u.art).toBe("kein-urteil");
  });
});

describe("Normalbetrieb löst nicht aus", () => {
  // Normalbetrieb laut Abrechnung 19.09.–01.10.2026 (Median):
  // solar-check.io ~11.300 Aufrufe / ~105.000 Schreibvorgänge, Filmprojekt ~100.000 / ~200.000.
  it("schweigt bei gewöhnlicher Tagesschwankung (großes Projekt)", () => {
    const reihe = normalReihe(100000, 200000);
    for (const f of [0.7, 0.9, 1.0, 1.3, 1.6, 2.0, 2.3]) {
      const u = beurteileKostenTag(
        { tag: tag(20), aufbauten: Math.round(100000 * f), schreibvorgaenge: Math.round(200000 * f) },
        reihe,
      );
      expect(u.art, `Faktor ${f} hätte nicht anschlagen dürfen`).toBe("ruhig");
    }
  });

  it("schweigt bei gewöhnlicher Tagesschwankung (kleines Projekt)", () => {
    const reihe = normalReihe(11300, 105000);
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 22000, schreibvorgaenge: 230000 }, reihe);
    expect(u.art).toBe("ruhig");
  });

  // Die Mindestmengen: Bei einstelligen Werten ist jedes Vielfache Rauschen —
  // und es kostet auch nichts. Ohne sie hätte die wachsende Seite ständig
  // gemeldet (gemessen: im Normalbetrieb bis zum 9,59-fachen).
  it("schweigt bei winzigen Mengen, auch wenn sie sich verzehnfachen", () => {
    const klein: Tagesmenge[] = Array.from({ length: 10 }, (_, i) => ({
      tag: tag(i + 1),
      aufbauten: 3,
      schreibvorgaenge: 2,
    }));
    const u = beurteileKostenTag({ tag: tag(12), aufbauten: 30, schreibvorgaenge: 20 }, klein);
    expect(u.art).toBe("ruhig");
  });

  it("kennt die Mindestmengen als benannte Grenze, nicht als Zufall", () => {
    expect(MIN_AUFBAUTEN).toBeGreaterThan(0);
    expect(MIN_SCHREIBVORGAENGE).toBeGreaterThan(0);
  });
});

describe("Gegenprobe: ein erfundener Sprung MUSS anschlagen", () => {
  // Das Ausmaß des Vorfalls, um den es geht: +249 %, also das 3,49-fache.
  const VORFALL = 3.49;

  it("schlägt beim Ausmaß des bekannten Vorfalls an", () => {
    const reihe = normalReihe(100000, 200000);
    const u = beurteileKostenTag(
      { tag: tag(20), aufbauten: Math.round(100000 * VORFALL), schreibvorgaenge: Math.round(200000 * VORFALL) },
      reihe,
    );
    expect(u.art).toBe("sprung");
  });

  it("schlägt auch beim kleinen Projekt an", () => {
    const reihe = normalReihe(11300, 105000);
    const u = beurteileKostenTag(
      { tag: tag(20), aufbauten: Math.round(11300 * VORFALL), schreibvorgaenge: Math.round(105000 * VORFALL) },
      reihe,
    );
    expect(u.art).toBe("sprung");
  });

  it("liegt die Schwelle unter dem Vorfall und über der Schwankung", () => {
    expect(SPRUNG_FAKTOR).toBeLessThan(VORFALL);
    // 2,39 war die größte im Normalbetrieb gemessene Tagesschwankung (Film,
    // drei Wochen, 29.08.2026).
    expect(SPRUNG_FAKTOR).toBeGreaterThan(2.39);
  });
});

describe("Die zwei Größen werden unterschieden", () => {
  const reihe = normalReihe(100000, 200000);

  it("nennt es „Schreiben“, wenn nur die Cache-Schreibvorgänge springen", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 105000, schreibvorgaenge: 700000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Nur das Schreiben/);
    expect(u.groessen.find((g) => g.groesse === "schreibvorgaenge")!.gesprungen).toBe(true);
    expect(u.groessen.find((g) => g.groesse === "aufbauten")!.gesprungen).toBe(false);
  });

  it("nennt es „Last“, wenn nur die Zahl der Aufbauten springt", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 400000, schreibvorgaenge: 210000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Nur die Last/);
  });

  it("nennt beides, wenn beides springt — und sagt etwas anderes", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 400000, schreibvorgaenge: 700000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Last UND Schreiben/);
    expect(u.satz).not.toMatch(/Nur die/);
  });
});

describe("Kein Niveau, kein Vielfaches", () => {
  it("behauptet bei einem Nullniveau kein Vielfaches", () => {
    const reihe: Tagesmenge[] = Array.from({ length: 10 }, (_, i) => ({
      tag: tag(i + 1),
      aufbauten: 0,
      schreibvorgaenge: 0,
    }));
    const u = beurteileKostenTag({ tag: tag(12), aufbauten: 5000, schreibvorgaenge: 30000 }, reihe);
    // Division durch null ergäbe „unendlich" — das wäre eine Zahl, die niemand
    // gemessen hat. Stattdessen: kein Vielfaches, kein Sprung.
    if (u.art === "kein-urteil") throw new Error("hier sollte ein Urteil möglich sein");
    for (const g of u.groessen) expect(g.vielfaches).toBeNull();
    expect(u.art).toBe("ruhig");
  });
});

describe("Nachjustierung fußt auf gemessenen Werten", () => {
  it("nennt das größte bisher abgelegte Vielfache", () => {
    const reihe = normalReihe(1000, 1000);
    reihe.push({ tag: tag(20), aufbauten: 5000, schreibvorgaenge: 1000 });
    const max = groesstesVielfaches(reihe, "aufbauten");
    expect(max).not.toBeNull();
    expect(max!).toBeGreaterThan(4);
  });

  it("gibt nichts zurück, solange es zu wenig Tage sind", () => {
    expect(groesstesVielfaches(normalReihe(1000, 1000).slice(0, 5), "aufbauten")).toBeNull();
  });

  it("schaut höchstens über das Vergleichsfenster zurück", () => {
    expect(BASIS_TAGE).toBeGreaterThanOrEqual(MIN_VERGLEICHSTAGE);
  });
});

describe("Abrufzeitraum und Verzug", () => {
  it("holt das Vergleichsfenster samt beurteiltem Tag, in ganzen UTC-Tagen", () => {
    const { von, bis } = abrufZeitraum(new Date("2026-10-07T00:30:00Z"));
    expect(bis).toBe("2026-10-08T00:00:00.000Z");
    expect((Date.parse(bis) - Date.parse(von)) / 86_400_000).toBe(ABRUF_TAGE);
    expect(ABRUF_TAGE).toBeGreaterThan(BASIS_TAGE + 1);
  });

  it("nennt einen Abrechnungstag erst verspätet, wenn er lange überfällig ist", () => {
    // Der Tag 05.10. endet am 06.10. um 07:00 UTC.
    expect(abrechnungVerspaetet("2026-10-05", new Date("2026-10-07T07:00:00Z"))).toBe(false);
    expect(abrechnungVerspaetet("2026-10-05", new Date("2026-10-08T14:00:00Z"))).toBe(true);
  });
});
