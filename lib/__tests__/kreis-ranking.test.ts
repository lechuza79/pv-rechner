import { describe, expect, it } from "vitest";
import fixture from "./fixtures/kreis-ranking-rp-2026-10.json";
import { AWARD_CATEGORY_BY_KEY, type GemeindeStats } from "../awards";
import {
  KREIS_KATEGORIEN,
  KREIS_KATEGORIE_BY_KEY,
  KREIS_PRESSE_EIGNUNG,
  kreisArtVon,
  kreisPlatzierungen,
  kreisRangliste,
  kreiseAusRegister,
  statsAusRollup,
  summeStats,
  type KreisStats,
  type RollupZeile,
} from "../kreis-ranking";

// Regression anchor: Rheinland-Pfalz from the live rollup on 01.10.2026
// (the same numbers as the one-off measurement for the Kaiserslautern press
// release). If the monthly import changes them, re-measure and replace the
// fixture — never loosen the assertions.
const RP = fixture.kreise as unknown as KreisStats[];
const LAND = fixture.land as unknown as GemeindeStats;
const RP_SCOPE = { ebene: "bundesland" as const, landId: "07" };

describe("Anker Landkreis Kaiserslautern (07335)", () => {
  it("private Dächer je Einwohner: Platz 3 von 24 Landkreisen, 863 Wp", () => {
    const l = kreisRangliste(RP, "dach-privat-pk", RP_SCOPE, "landkreise");
    expect(l.zeilen).toHaveLength(24);
    expect(l.zeilen.slice(0, 3).map((z) => [z.regionId, z.valueText])).toEqual([
      ["07340", "905 Wp"], // Südwestpfalz
      ["07233", "887 Wp"], // Vulkaneifel
      ["07335", "863 Wp"],
    ]);
    expect(l.zeilen[2].rank).toBe(3);
  });

  it("Landeswert 573 Wp aus dem Landes-Rollup, gleich der Summe aller 36 Kreise", () => {
    const m = KREIS_KATEGORIE_BY_KEY["dach-privat-pk"].metric;
    expect(Math.round(m(LAND)!)).toBe(573);
    expect(m(summeStats("07", "RP", RP))).toBeCloseTo(m(LAND)!, 6);
    expect(RP).toHaveLength(36);
  });

  it("Solar gesamt je Einwohner: 1.935 Wp, Platz 10 von 36", () => {
    const l = kreisRangliste(RP, "kreis-solar-gesamt-pk", RP_SCOPE, "alle");
    const z = l.zeilen.find((x) => x.regionId === "07335")!;
    expect(z.valueText).toBe("1.935 Wp");
    expect([z.rank, l.zeilen.length]).toEqual([10, 36]);
  });

  it("Platzierung trägt Vergleichswert und Aufhänger-Urteil", () => {
    const p = kreisPlatzierungen(RP, "07335", { "07": LAND }).find(
      (x) => x.kategorie === "dach-privat-pk" && x.scope.ebene === "bundesland" && x.gruppe === "landkreise",
    )!;
    expect(p).toMatchObject({ rank: 3, von: 24, valueText: "863 Wp", scopeWertText: "573 Wp", aufhaengerTauglich: true });
  });
});

describe("Landkreis oder kreisfreie Stadt", () => {
  it("strukturell über die amtliche Bezeichnung, nicht über den Namen", () => {
    expect(kreisArtVon("Kreisfreie Stadt")).toBe("kreisfrei");
    expect(kreisArtVon("Stadtkreis")).toBe("kreisfrei");
    expect(kreisArtVon("Landkreis")).toBe("landkreis");
    expect(kreisArtVon("Kreis")).toBe("landkreis");
    expect(kreisArtVon("Regionalverband")).toBe("landkreis");
    expect(kreisArtVon(null)).toBeNull();
    expect(kreisArtVon("Gemeinde")).toBeNull();
  });

  it("NEGATIVPROBE: die Stadt Kaiserslautern (07312) steht nie unter den Landkreisen", () => {
    const l = kreisRangliste(RP, "dach-privat-pk", RP_SCOPE, "landkreise");
    expect(l.zeilen.some((z) => z.art === "kreisfrei")).toBe(false);
    expect(l.zeilen.some((z) => z.regionId === "07312")).toBe(false);
    expect(kreisRangliste(RP, "dach-privat-pk", RP_SCOPE, "alle").zeilen.some((z) => z.regionId === "07312")).toBe(true);
    // A kreisfreie Stadt only gets "alle" placements.
    expect(kreisPlatzierungen(RP, "07312").every((p) => p.gruppe === "alle")).toBe(true);
  });

  it("Altschlüssel ohne Bezeichnung oder Einwohner werden ausgeschlossen und benannt", () => {
    const { kreise, ausgeschlossen } = kreiseAusRegister(
      [
        { regionId: "03152", name: "Göttingen", bezeichnung: null, population: null, slug: null },
        { regionId: "07335", name: "Landkreis Kaiserslautern", bezeichnung: "Landkreis", population: 106343, slug: "x" },
      ],
      [],
      2025,
    );
    expect(kreise.map((k) => k.regionId)).toEqual(["07335"]);
    expect(ausgeschlossen).toEqual(["03152"]);
  });
});

describe("Rollup → Kennzahlen (dieselbe Aggregation wie mastr_gemeinde_award)", () => {
  const z = (p: Partial<RollupZeile>): RollupZeile => ({ regionKey: "07999", energietraeger: "solar", segment: "privat_dach", year: 2020, count: 1, kwp: 10, kwh: 0, ...p });
  const rows = [
    z({ year: 2022, kwp: 10, count: 1 }), // after ly−4 (2021), before ly−2 (2023)
    z({ year: 2021, kwp: 1, count: 1 }), // exactly ly−4: counts into the stock at end of 2021
    z({ year: 2024, kwp: 20, count: 2 }),
    z({ year: 2025, kwp: 30, count: 3 }),
    z({ year: 2026, kwp: 40, count: 4 }),
    z({ segment: "steckersolar", year: 2026, count: 5, kwp: 4 }),
    z({ segment: "freiflaeche", year: 2010, kwp: 1000, count: 1 }),
    z({ energietraeger: "speicher", segment: "batterie_privat", year: 2025, count: 2, kwp: 0, kwh: 20 }),
    z({ energietraeger: "wind", segment: "n/a", year: 2000, kwp: 3000 }),
  ];
  const s = statsAusRollup(rows, { regionId: "07999", name: "Test", bezeichnung: "Landkreis", population: 1000 }, 2025);

  it("Stichtage: Ende ly, ly−2, ly−4", () => {
    expect(s.privatDachKwp).toBe(101);
    expect(s.privatDachCount).toBe(11);
    expect(s.privatDachKwpLy).toBe(61);
    expect(s.privatDachKwpL3).toBe(11);
    expect(s.privatDachKwpL5).toBe(1);
    expect(s.solarZubauKwp).toBe(30);
    expect(s.solarKwp).toBe(1105);
    expect(s.balkonCount).toBe(5);
    expect(s.balkonCountLy).toBe(0);
    expect(s.batteriePrivatKwh).toBe(20);
    expect(s.windKwp).toBe(3000);
  });

  it("Messgrößen sind die der Gemeinde-Ranglisten (dieselben Objekte, keine Kopie)", () => {
    for (const k of ["dach-privat-pk", "balkon-pk", "speicherquote", "batterie-privat-pk", "tempo-1j", "tempo-3j", "tempo-5j"]) {
      expect(KREIS_KATEGORIE_BY_KEY[k]).toBe(AWARD_CATEGORY_BY_KEY[k]);
    }
    expect(KREIS_KATEGORIE_BY_KEY["dach-privat-pk"].metric(s)).toBe(101); // 101 kWp / 1.000 Ew = 101 Wp
    expect(KREIS_KATEGORIE_BY_KEY["tempo-1j"].metric(s)).toBe(40);
  });

  it("jede Kennzahl hat eine Presse-Einordnung", () => {
    for (const c of KREIS_KATEGORIEN) expect(KREIS_PRESSE_EIGNUNG[c.key]).toBeDefined();
  });
});

describe("Gleichstand und Grenzfälle", () => {
  const k = (id: string, name: string, kwp: number, art: "landkreis" | "kreisfrei" = "landkreis"): KreisStats =>
    ({ ...summeStats(id, name, []), bezeichnung: "Landkreis", population: 1000, privatDachKwp: kwp, privatDachCount: 100, art, landId: id.slice(0, 2) }) as KreisStats;

  it("Sportrang wie in der öffentlichen Gemeinde-Rangliste: gleicher Wert, gleicher Platz, nächster überspringt", () => {
    const l = kreisRangliste([k("09001", "B", 5), k("09002", "A", 5), k("09003", "C", 4)], "dach-privat-pk", { ebene: "de" }, "alle");
    expect(l.zeilen.map((z) => [z.name, z.rank, z.geteilt])).toEqual([
      ["A", 1, true],
      ["B", 1, true],
      ["C", 3, false],
    ]);
  });

  it("ein geteilter Platz bleibt aufhängertauglich, verlangt aber den Hinweis", () => {
    const p = kreisPlatzierungen([k("09001", "B", 5), k("09002", "A", 5)], "09001").find((x) => x.kategorie === "dach-privat-pk" && x.scope.ebene === "de" && x.gruppe === "alle")!;
    expect(p.geteilt).toBe(true);
    expect(p.aufhaengerTauglich).toBe(true);
  });

  it("NEGATIVPROBE: der einzige Kreis eines Landes ist kein Aufhänger (Selbstvergleich)", () => {
    // Not a Stadtstaat key, so only the self-comparison rule can catch it.
    const p = kreisPlatzierungen([k("04012", "Bremerhaven", 5, "kreisfrei"), k("05111", "Düsseldorf", 9, "kreisfrei")], "04012").find((x) => x.kategorie === "dach-privat-pk" && x.scope.ebene === "bundesland")!;
    expect([p.rank, p.von, p.aufhaengerTauglich]).toEqual([1, 1, false]);
    const s = kreisPlatzierungen([k("11000", "Berlin", 5, "kreisfrei")], "11000").find((x) => x.kategorie === "dach-privat-pk" && x.scope.ebene === "bundesland")!;
    expect(s.hinweise.some((h) => h.startsWith("Stadtstaat"))).toBe(true);
  });

  it("Gesamt-Solar je Einwohner ist nie ein Aufhänger (Standort, nicht Bürger)", () => {
    expect(kreisPlatzierungen(RP, "07335").filter((p) => p.kategorie === "kreis-solar-gesamt-pk").every((p) => !p.aufhaengerTauglich)).toBe(true);
  });

  it("unbekannter Kreis liefert keine Platzierung statt einer erfundenen", () => {
    expect(kreisPlatzierungen(RP, "99999")).toEqual([]);
  });
});
