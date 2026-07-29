import { describe, it, expect } from "vitest";
import {
  rankingKategorien,
  rankingKategorienGruppiert,
  kategorieBySlug,
  ebeneOf,
  rankingRows,
  rankingTitel,
  RANKING_MIN_POPULATION,
} from "../atlas-ranking";
import { AWARD_CATEGORY_BY_KEY, type GemeindeStats } from "../awards";

const g = (regionId: string, name: string, population: number, balkonCount: number): GemeindeStats => ({
  regionId,
  name,
  bezeichnung: "Gemeinde",
  population,
  privatDachKwp: 0,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount,
  balkonKwp: 0,
  batteriePrivatKwh: 0,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
});

const balkon = AWARD_CATEGORY_BY_KEY["balkon-pk"];

describe("rankingKategorien", () => {
  it("lässt die absoluten Bürger-Kategorien draussen", () => {
    // Sie sind gemessen Einwohner-Ranglisten: der Sieger ist jeweils exakt die
    // groesste Kommune (BW, BY, NRW).
    const keys = rankingKategorien().map((k) => k.key);
    for (const k of ["balkon-abs", "dach-privat-abs", "batterie-privat-abs"]) {
      expect(keys).not.toContain(k);
    }
  });

  it("veröffentlicht Pro-Kopf- und Standort-Kategorien", () => {
    const { buerger, standort } = rankingKategorienGruppiert();
    // Drei Bestands-Kategorien je Einwohner plus drei Zubau-Tempo-Zeitraeume.
    expect(buerger.length).toBe(6);
    for (const k of buerger) expect(k.messart).toBe("proKopf");
    // Standort-Kategorien sind absolut, aber KEINE Einwohner-Ranglisten:
    // gemessen 0 von 10 Ueberschneidung mit den einwohnerstaerksten Gemeinden.
    expect(standort.length).toBeGreaterThan(0);
    for (const k of standort) expect(k.traeger).not.toBe("buerger");
  });

  it("hat eindeutige, lesbare Adressen", () => {
    const slugs = rankingKategorien().map((k) => k.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("findet die Kategorie über ihre Adresse — und nur diese", () => {
    expect(kategorieBySlug("balkonkraftwerke-je-einwohner")?.key).toBe("balkon-pk");
    expect(kategorieBySlug("gibt-es-nicht")).toBeNull();
    // Absolute Kategorien haben keine Seite.
    expect(rankingKategorien().some((k) => k.key === "balkon-abs")).toBe(false);
  });
});

describe("ebeneOf", () => {
  it("leitet die Vergleichsebene aus dem Gebietsschlüssel ab", () => {
    expect(ebeneOf(null)).toBe("de");
    expect(ebeneOf("09")).toBe("bundesland");
    expect(ebeneOf("09679")).toBe("landkreis");
  });
});

describe("rankingRows", () => {
  const stats = [
    g("09679147", "Höchberg", 10000, 100), // 10,0
    g("09679143", "Hausen", 4000, 152), // 38,0
    g("09679179", "Riedenheim", 3000, 30), // 10,0 — Gleichstand mit Höchberg
    g("09679001", "Winzig", 500, 50), // unter der Mindestgröße
    g("09679002", "Ohne", 5000, 0), // kein Wert
    g("08111000", "Stuttgart", 600000, 6000), // anderes Bundesland
  ];

  it("sortiert absteigend und vergibt Plätze", () => {
    const rows = rankingRows(stats, balkon, "09679");
    expect(rows.map((r) => r.name)).toEqual(["Hausen", "Höchberg", "Riedenheim"]);
    expect(rows[0].platz).toBe(1);
  });

  it("gibt Gleichständen denselben Platz und überspringt danach", () => {
    const rows = rankingRows(stats, balkon, "09679");
    expect(rows[1].wert).toBeCloseTo(rows[2].wert, 6);
    expect(rows[1].platz).toBe(2);
    expect(rows[2].platz).toBe(2);
  });

  it("lässt zu kleine Kommunen und Nullwerte weg", () => {
    const namen = rankingRows(stats, balkon, "09679").map((r) => r.name);
    expect(namen).not.toContain("Winzig");
    expect(namen).not.toContain("Ohne");
    expect(RANKING_MIN_POPULATION).toBe(2000);
  });

  it("beschränkt auf das Gebiet — und ohne Gebiet auf alle", () => {
    expect(rankingRows(stats, balkon, "09679").some((r) => r.name === "Stuttgart")).toBe(false);
    expect(rankingRows(stats, balkon, "08").map((r) => r.name)).toEqual(["Stuttgart"]);
    expect(rankingRows(stats, balkon, null).length).toBe(4);
  });

  it("ist bei gleichen Werten reproduzierbar sortiert", () => {
    const a = rankingRows(stats, balkon, "09679").map((r) => r.regionId);
    const b = rankingRows([...stats].reverse(), balkon, "09679").map((r) => r.regionId);
    expect(a).toEqual(b);
  });
});

describe("rankingTitel", () => {
  it("beginnt gross und nennt das Gebiet", () => {
    expect(rankingTitel(balkon, "im Landkreis Würzburg")).toBe(
      "Balkonkraftwerke je 1.000 Einwohner im Landkreis Würzburg",
    );
    expect(rankingTitel(AWARD_CATEGORY_BY_KEY["batterie-privat-pk"], "in Deutschland")).toBe(
      "Private Speicherkapazität je Einwohner in Deutschland",
    );
  });
});

describe("Untergrenze der Einwohnerzahl", () => {
  const wind = AWARD_CATEGORY_BY_KEY["wind-standort"];
  const dorf: GemeindeStats = { ...g("09679900", "Winddorf", 700, 0), windKwp: 90000 };
  const stadt: GemeindeStats = { ...g("09679901", "Grossstadt", 200000, 0), windKwp: 1000 };

  it("gilt bei Pro-Kopf-Kategorien", () => {
    const klein = g("09679902", "Winzig", 700, 100);
    expect(rankingRows([klein], balkon, null)).toHaveLength(0);
  });

  it("gilt bei absoluten Standort-Kategorien NICHT", () => {
    // Ein 700-Einwohner-Dorf mit einem Windpark gehoert in die Windrangliste —
    // die Untergrenze wuerde genau den Sieger herauswerfen.
    const rows = rankingRows([dorf, stadt], wind, null);
    expect(rows.map((r) => r.name)).toEqual(["Winddorf", "Grossstadt"]);
  });
});


describe("Rangveraenderung", () => {
  const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
  // Drei Orte gleicher Groesse: A faellt zurueck, B zieht vorbei, C ist neu.
  const mk = (id: string, heute: number, vorjahr: number): GemeindeStats => ({
    ...g(id, id, 10_000, 0),
    privatDachKwp: heute,
    privatDachKwpLy: vorjahr,
  });

  it("zaehlt die Plaetze, die eine Kommune gutgemacht hat", () => {
    const rows = rankingRows([mk("A", 100, 900), mk("B", 900, 100)], dach, null);
    const a = rows.find((r) => r.name === "A")!;
    const b = rows.find((r) => r.name === "B")!;
    expect(b.platz).toBe(1);
    expect(b.platzVorjahr).toBe(2);
    expect(b.veraenderung).toBe(1); // einen Platz nach vorn
    expect(a.veraenderung).toBe(-1); // einen Platz zurueck
  });

  it("schweigt, wo es Ende letzten Jahres noch nichts gab", () => {
    // Eine Null waere die Aussage "unveraendert" — die haben wir nicht.
    const rows = rankingRows([mk("A", 900, 900), mk("Neu", 500, 0)], dach, null);
    const neu = rows.find((r) => r.name === "Neu")!;
    expect(neu.platzVorjahr).toBeNull();
    expect(neu.veraenderung).toBeNull();
  });

  it("liefert keine Veraenderung, wo die Kategorie keinen Stichtagswert hat", () => {
    const zubau = AWARD_CATEGORY_BY_KEY["zubau"];
    const rows = rankingRows([g("09679147", "X", 10_000, 0)], zubau, null);
    for (const r of rows) expect(r.veraenderung).toBeNull();
  });
});

describe("Zubau-Tempo", () => {
  it("misst je Einwohner zugebaute Leistung, nicht Prozente", () => {
    // Ueber der Mindestgroesse — sonst faellt das Dorf aus der Pro-Kopf-Wertung
    // und der Test misst nur noch, dass die Stadt uebrig bleibt.
    const dorf: GemeindeStats = { ...g("09679900", "Dorf", 3_000, 0), privatDachKwp: 700, privatDachKwpL3: 100 };
    const stadt: GemeindeStats = { ...g("09679901", "Stadt", 100_000, 0), privatDachKwp: 30_000, privatDachKwpL3: 20_000 };
    const rows = rankingRows([dorf, stadt], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    // Dorf: 600 kWp auf 3.000 Ew = 200 Wp/Kopf. Stadt: 10.000 auf 100.000 = 100.
    // Relativ haette das Dorf +200 % gegen +50 % — auch dann vorn, aber ein Ort,
    // der bei 1 kWp startet, wuerde jede Prozent-Rangliste gewinnen.
    expect(rows[0].name).toBe("Dorf");
    expect(rows[0].wert).toBeCloseTo(200, 5);
    expect(rows[1].wert).toBeCloseTo(100, 5);
  });

  it("zaehlt NUR private Daecher — ein Solarpark darf kein Dorf kroenen", () => {
    // Der Fehler, der das ausgeloest hat: Das Tempo rechnete mit der GESAMTEN
    // Solarleistung. Theilheim stand damit bei 7.975 Wp je Kopf Zubau, waehrend
    // der Bestands-Erste desselben Kreises bei 1.623 liegt — ein
    // Investorenpark in einer Buerger-Kategorie.
    const parkdorf: GemeindeStats = {
      ...g("09679800", "Parkdorf", 3_000, 0),
      privatDachKwp: 100,
      privatDachKwpL3: 90,
      freiflaecheKwp: 90_000,
      solarKwp: 90_100,
      solarKwpL3: 90,
    };
    const fleissig: GemeindeStats = {
      ...g("09679801", "Fleissig", 3_000, 0),
      privatDachKwp: 700,
      privatDachKwpL3: 100,
      solarKwp: 700,
      solarKwpL3: 100,
    };
    const rows = rankingRows([parkdorf, fleissig], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    expect(rows[0].name).toBe("Fleissig");
    expect(rows[0].wert).toBeCloseTo(200, 5);
  });

  it("wird nie negativ, wenn Nachmeldungen den alten Stand anheben", () => {
    const seltsam: GemeindeStats = { ...g("09679902", "Nachmeldung", 5_000, 0), privatDachKwp: 100, privatDachKwpL3: 150 };
    const rows = rankingRows([seltsam], AWARD_CATEGORY_BY_KEY["tempo-3j"], null);
    // metric klemmt auf 0 → faellt aus der Wertung, statt einen Minuswert zu zeigen.
    expect(rows).toHaveLength(0);
  });
});
