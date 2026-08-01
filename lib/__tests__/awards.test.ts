import { describe, it, expect } from "vitest";
import {
  AWARD_CATEGORIES,
  AWARD_CATEGORY_BY_KEY,
  computeWinners,
  dedupFreiflaeche,
  formatAwardValue,
  populationTertiles,
  rankGemeinden,
  roleOf,
  scopeIdOf,
  sizeBandOf,
  spaltenKopfVon,
  type GemeindeStats,
} from "../awards";

// Minimaler Datensatz mit sinnvollen Defaults.
function g(regionId: string, over: Partial<GemeindeStats> = {}): GemeindeStats {
  return {
    regionId,
    name: over.name ?? regionId,
    bezeichnung: "Gemeinde",
    population: 5000,
    privatDachKwp: 0,
    gewerbeDachKwp: 0,
    freiflaecheKwp: 0,
    balkonCount: 0,
    balkonKwp: 0,
    batteriePrivatKwh: 0,
    batterieGewerbeKwh: 0,
    windKwp: 0,
    biomasseKwp: 0,
    wasserKwp: 0,
    solarZubauKwp: 0,
    ...over,
  };
}

const dach = AWARD_CATEGORY_BY_KEY["dach-privat-pk"];
const standort = AWARD_CATEGORY_BY_KEY["solar-standort"];

describe("scopeIdOf", () => {
  it("liest Bundesland (2) und Landkreis (5) aus dem AGS", () => {
    expect(scopeIdOf("09564000", "de")).toBe("de");
    expect(scopeIdOf("09564000", "bundesland")).toBe("09");
    expect(scopeIdOf("09564000", "landkreis")).toBe("09564");
  });
});

describe("verifiziertes Modell: keine Pro-Kopf-Kategorie bei Großanlagen", () => {
  it("hat Freifläche/Wind/Wasser/Biomasse nur absolut", () => {
    const grossanlage = ["freiflaeche-standort", "wind-standort", "wasser-standort", "biomasse-standort"];
    for (const key of grossanlage) {
      expect(AWARD_CATEGORY_BY_KEY[key].messart).toBe("absolut");
    }
    // Und die Bürger-Pro-Kopf-Kategorien existieren.
    expect(dach.messart).toBe("proKopf");
    expect(AWARD_CATEGORY_BY_KEY["balkon-pk"].messart).toBe("proKopf");
  });
});

describe("roleOf", () => {
  it("leitet die Rolle aus der Bezeichnung ab", () => {
    expect(roleOf(g("1", { bezeichnung: "Gemeinde" }))).toBe("gemeinde");
    expect(roleOf(g("1", { bezeichnung: "Markt" }))).toBe("stadt");
    expect(roleOf(g("1", { bezeichnung: "Stadt" }))).toBe("stadt");
    expect(roleOf(g("1", { bezeichnung: "Große Kreisstadt" }))).toBe("grosse-kreisstadt");
    expect(roleOf(g("1", { bezeichnung: "Kreisfreie Stadt" }))).toBe("kreisfrei");
    expect(roleOf(g("1", { bezeichnung: "Stadtkreis" }))).toBe("kreisfrei");
  });

  it("erkennt Landeshauptstädte als Querschnitt (vor kreisfrei)", () => {
    expect(roleOf(g("09162000", { name: "München", bezeichnung: "Kreisfreie Stadt", population: 1500000 }))).toBe("hauptstadt");
    // Gleichnamiges Dorf ohne Größe ist keine Hauptstadt.
    expect(roleOf(g("1", { name: "München", bezeichnung: "Gemeinde", population: 800 }))).toBe("gemeinde");
  });
});

describe("Freiflächen-Ehrlichkeit (Standort ≠ Bürger)", () => {
  const dorfMitPark = g("09111001", { population: 3000, privatDachKwp: 200, freiflaecheKwp: 40000, gewerbeDachKwp: 0 });
  const dachdorf = g("09111002", { population: 3000, privatDachKwp: 6000 });

  it("privates Dach pro Kopf ignoriert den Park", () => {
    expect(rankGemeinden([dorfMitPark, dachdorf], dach)[0].regionId).toBe("09111002");
  });
  it("Solar-Standort belohnt den Park", () => {
    expect(rankGemeinden([dorfMitPark, dachdorf], standort)[0].regionId).toBe("09111001");
  });
});

describe("Größen-Drittel", () => {
  it("bildet Terzil-Grenzen aus der Verteilung", () => {
    const gem = [1000, 2000, 3000, 4000, 5000, 6000].map((p, i) => g(`0${i}`, { population: p }));
    const { c1, c2 } = populationTertiles(gem);
    expect(c1).toBeLessThan(c2);
    expect(c1).toBeGreaterThanOrEqual(2000);
    expect(c2).toBeLessThanOrEqual(5000);
  });
  it("ordnet Einwohnerzahl der Klasse zu", () => {
    expect(sizeBandOf(500, 1083, 4167)).toBe("klein");
    expect(sizeBandOf(2000, 1083, 4167)).toBe("mittel");
    expect(sizeBandOf(9000, 1083, 4167)).toBe("gross");
  });
});

describe("computeWinners", () => {
  const gemeinden: GemeindeStats[] = [
    g("09111001", { population: 5000, privatDachKwp: 5000 }), // BY, Kreis 09111 — 1000 Wp/Kopf
    g("09111002", { population: 5000, privatDachKwp: 3000 }),
    g("09222001", { population: 5000, privatDachKwp: 9000 }), // BY, Kreis 09222
    g("08111001", { population: 5000, privatDachKwp: 4000 }), // BW
  ];

  it("kürt je Bundesland einen Sieger", () => {
    const w = computeWinners(gemeinden, dach, { level: "bundesland", splitByRole: false, splitBySize: false });
    const by = Object.fromEntries(w.map((x) => [x.scopeId, x.winner.regionId]));
    expect(by["09"]).toBe("09222001");
    expect(by["08"]).toBe("08111001");
    expect(w).toHaveLength(2);
  });

  it("kürt je Landkreis einen Sieger", () => {
    const w = computeWinners(gemeinden, dach, { level: "landkreis", splitByRole: false, splitBySize: false });
    expect(w.find((x) => x.scopeId === "09111")!.winner.regionId).toBe("09111001");
    expect(w.find((x) => x.scopeId === "09222")!.winner.regionId).toBe("09222001");
  });

  it("splittet nach Größe: jede Klasse bekommt einen eigenen Sieger", () => {
    const pool = [
      g("09a", { population: 500, privatDachKwp: 5000 }), // klein, hohe Pro-Kopf
      g("09b", { population: 3000, privatDachKwp: 6000 }), // mittel
      g("09c", { population: 9000, privatDachKwp: 9000 }), // groß
    ];
    const w = computeWinners(pool, dach, { level: "de", splitByRole: false, splitBySize: true });
    const bands = Object.fromEntries(w.map((x) => [x.sizeBand, x.winner.regionId]));
    expect(bands.klein).toBe("09a");
    expect(bands.mittel).toBe("09b");
    expect(bands.gross).toBe("09c");
  });

  it("respektiert eine Einwohner-Untergrenze", () => {
    const pool = [g("09a", { population: 100, privatDachKwp: 9999 }), g("09b", { population: 3000, privatDachKwp: 100 })];
    const w = computeWinners(pool, dach, { level: "de", splitByRole: false, splitBySize: false, minPopulation: 500 });
    expect(w).toHaveLength(1);
    expect(w[0].winner.regionId).toBe("09b");
  });
});

describe("Freiflächen-Doppelzählung", () => {
  it("halbiert die bekannte Park-Dublette (zieht den halben Park ab)", () => {
    // Lisberg/Pommersfelden teilen sich 19.999,3 kWp → jede behält die Hälfte.
    expect(dedupFreiflaeche("09471154", 19999.3)).toBeCloseTo(9999.65, 1);
    expect(dedupFreiflaeche("09471172", 19999.3)).toBeCloseTo(9999.65, 1);
  });
  it("lässt unbetroffene Gemeinden unverändert", () => {
    expect(dedupFreiflaeche("09999999", 5000)).toBe(5000);
  });
  it("wird nie negativ", () => {
    expect(dedupFreiflaeche("09471154", 100)).toBe(0);
  });
});

describe("Katalog", () => {
  it("hat für jede Kategorie einen eindeutigen Schlüssel und ein Label", () => {
    const keys = AWARD_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of AWARD_CATEGORIES) expect(c.label.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DER SPALTENKOPF MUSS DEN NENNER TREFFEN, DER IN DER SPALTE STEHT.
//
// Er wurde bis zum 31.07.2026 aus der `messart` abgeleitet und lautete bei allem
// Pro-Kopf-Artigen „je Einwohner". Über der Balkon-Spalte standen darunter aber
// Werte wie „38,1 je 1.000 Ew." — die Beschriftung verfehlte den Wert um den
// Faktor tausend. Die `messart` sagt, DASS eine Verhältniszahl gerankt wird;
// welchen Nenner sie hat, weiß nur das Format.
// ─────────────────────────────────────────────────────────────────────────────
describe("Spaltenkopf und Wert sagen dasselbe", () => {
  /** Der Nenner, den ein Wert oder ein Kopf nennt — auf eine Form gebracht. */
  const nenner = (text: string): string | null => {
    if (/je 1\.000|\/ ?1\.000/.test(text)) return "je1000";
    if (/je 100 Dächer/.test(text)) return "je100dach";
    if (/\/Kopf|je Einwohner/.test(text)) return "jeEinwohner";
    return null;
  };

  it("widerspricht nie dem Nenner, den der Wert darunter selbst nennt", () => {
    // Nicht jeder Wert trägt seinen Nenner: „1.240 Wp" sagt nichts darüber,
    // wodurch geteilt wurde — dafür ist der Spaltenkopf da. Aber WO der Wert ihn
    // nennt („38,1 je 1.000 Ew.", „113 je 100 Dächer"), muss der Kopf denselben
    // nennen. Genau das war der Fehler: „je Einwohner" über „je 1.000 Ew.".
    for (const c of AWARD_CATEGORIES) {
      const kopf = spaltenKopfVon(c.format);
      // Mehrere Größenordnungen, damit kein Sonderfall der Formatierung
      // (Auf-/Abrunden, MWp statt kWp) das Ergebnis trägt.
      for (const wert of [0.4, 7, 38.1, 1_234, 987_654]) {
        const gezeigt = formatAwardValue(wert, c.format);
        const imWert = nenner(gezeigt);
        if (imWert === null) continue;
        expect(nenner(kopf), `${c.key}: Kopf „${kopf}“ über Wert „${gezeigt}“`).toBe(imWert);
      }
    }
  });

  it("beschriftet absolute Kategorien nicht als Verhältniszahl", () => {
    // Gegenrichtung: Über „12,4 MWp gesamt" darf kein „je Einwohner" stehen.
    for (const c of AWARD_CATEGORIES.filter((k) => k.messart === "absolut")) {
      expect(spaltenKopfVon(c.format), c.key).toBe("gesamt");
    }
  });

  it("beschriftet die Balkon-Kategorie „je 1.000 Ew.“, nicht „je Einwohner“", () => {
    // Der konkrete Fall aus dem Audit.
    const balkon = AWARD_CATEGORIES.find((c) => c.format === "countPer1000");
    expect(balkon, "keine Kategorie mit countPer1000 mehr — Test anpassen").toBeTruthy();
    expect(spaltenKopfVon(balkon!.format)).toBe("je 1.000 Ew.");
    expect(spaltenKopfVon(balkon!.format)).not.toBe("je Einwohner");
  });

  it("gibt für jedes Format einen Kopf zurück", () => {
    for (const c of AWARD_CATEGORIES) {
      const kopf = spaltenKopfVon(c.format);
      expect(kopf, c.key).toBeTruthy();
      expect(kopf, c.key).not.toMatch(/undefined/);
    }
  });
});
