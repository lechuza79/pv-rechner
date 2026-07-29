import { describe, it, expect } from "vitest";
import { foldSiblings, SEGMENT_OWNER, type AtlasOwner, type ChildYearRow, type RankingRegion } from "../atlas";

/**
 * Die Gemeindeseite schickt die Nachbargemeinden nicht mehr im Zell-Korn, sondern
 * fertig summiert (Begründung an foldSiblings: das Korn war 71 % der Seite für
 * eine Liste mit fünf Zeilen).
 *
 * Diese Tests halten fest, dass sich dabei KEINE angezeigte Zahl ändert. Das ist
 * die eigentliche Bedingung — eine kleinere Seite, die andere Werte zeigt, wäre
 * der schwerste Fehler dieses Projekts, nicht eine Optimierung.
 */

const REGIONS: RankingRegion[] = [
  { region_id: "05558001", name: "Ascheberg", slug: "ascheberg", population: 15000 },
  { region_id: "05558002", name: "Billerbeck", slug: "billerbeck", population: 11000 },
  { region_id: "05558003", name: "Nordkirchen", slug: "nordkirchen", population: 9564 },
  { region_id: "05558004", name: "Ohne Einwohner", slug: "ohne", population: null },
];

/** Realistische Mischung: beide Jahre, alle Segmente, auch die ohne Eigentümer. */
const CELLS: ChildYearRow[] = [
  { region_id: "05558001", segment: "privat_dach", year: 2024, count: 100, kwp: 800, kwh: 0 },
  { region_id: "05558001", segment: "privat_dach", year: 2025, count: 40, kwp: 320, kwh: 0 },
  { region_id: "05558001", segment: "gewerbe_dach", year: 2025, count: 10, kwp: 1200, kwh: 0 },
  { region_id: "05558001", segment: "batterie_privat", year: 2025, count: 30, kwp: 150, kwh: 280 },
  { region_id: "05558001", segment: "sonstige", year: 2025, count: 3, kwp: 9, kwh: 0 },
  { region_id: "05558002", segment: "privat_dach", year: 2025, count: 90, kwp: 700, kwh: 0 },
  { region_id: "05558002", segment: "freiflaeche", year: 2025, count: 1, kwp: 5000, kwh: 0 },
  { region_id: "05558002", segment: "batterie_gewerbe", year: 2025, count: 2, kwp: 400, kwh: 1200 },
  { region_id: "05558003", segment: "steckersolar", year: 2025, count: 60, kwp: 48, kwh: 0 },
  { region_id: "05558003", segment: "gewerbe_dach", year: 2025, count: 20, kwp: 2400, kwh: 0 },
  { region_id: "05558004", segment: "freiflaeche", year: 2025, count: 1, kwp: 9000, kwh: 0 },
];

type Sums = { count: number; kwp: number; speicher: number };

/** Wortgetreue Nachbildung der ALTEN Rechnung in GemeindeHero, aus dem Zell-Korn. */
function altAusZellen(owner: AtlasOwner): Map<string, Sums> {
  const keep = (segment: string) =>
    owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;
  const acc = new Map<string, Sums>();
  for (const c of CELLS) {
    if (!keep(c.segment)) continue;
    const a = acc.get(c.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
    if (c.segment.startsWith("batterie")) a.speicher += c.kwh;
    else {
      a.count += c.count;
      a.kwp += c.kwp;
    }
    acc.set(c.region_id, a);
  }
  return acc;
}

describe("foldSiblings: gleiche Zahlen, ein Bruchteil der Daten", () => {
  const gefaltet = foldSiblings(REGIONS, CELLS);

  it("liefert je Eigentümer-Filter exakt die alten Summen", () => {
    for (const owner of ["alle", "privat", "gewerbe"] as AtlasOwner[]) {
      const alt = altAusZellen(owner);
      for (const r of gefaltet) {
        const erwartet = alt.get(r.region_id) ?? { count: 0, kwp: 0, speicher: 0 };
        expect(r.sums[owner], `${r.name} / ${owner}`).toEqual(erwartet);
      }
    }
  });

  it("erzeugt dieselbe Rangfolge je Kennzahl wie zuvor", () => {
    for (const owner of ["alle", "privat", "gewerbe"] as AtlasOwner[]) {
      const alt = altAusZellen(owner);
      for (const metric of ["count", "kwp", "speicher", "perCapita"] as const) {
        const wert = (pop: number | null, a: Sums) =>
          metric === "perCapita" ? (pop ? Math.round((a.kwp * 1000) / pop) : null) : a[metric];
        const altRang = REGIONS.map((r) => ({
          id: r.region_id,
          v: wert(r.population, alt.get(r.region_id) ?? { count: 0, kwp: 0, speicher: 0 }),
        }))
          .filter((x) => x.v !== null)
          .sort((a, b) => b.v! - a.v!)
          .map((x) => x.id);
        const neuRang = gefaltet
          .map((r) => ({ id: r.region_id, v: wert(r.population, r.sums[owner]) }))
          .filter((x) => x.v !== null)
          .sort((a, b) => b.v! - a.v!)
          .map((x) => x.id);
        expect(neuRang, `${owner} / ${metric}`).toEqual(altRang);
      }
    }
  });

  it("lässt Gemeinden ohne Einwohnerzahl aus der Je-Einwohner-Wertung heraus", () => {
    const ohne = gefaltet.find((r) => r.region_id === "05558004")!;
    expect(ohne.population).toBeNull();
    // Der Wert existiert weiterhin, nur die Je-Einwohner-Kennzahl ist nicht bildbar.
    expect(ohne.sums.alle.kwp).toBe(9000);
  });

  it("zählt Batteriekapazität nie zur Leistung", () => {
    const ascheberg = gefaltet.find((r) => r.region_id === "05558001")!;
    // 800 + 320 + 1200 Solar; die 150 kWp Batterie-Leistung gehören NICHT dazu.
    expect(ascheberg.sums.alle.kwp).toBe(2320);
    expect(ascheberg.sums.alle.speicher).toBe(280);
  });

  it("hält „sonstige\" aus jedem Filter heraus", () => {
    const ascheberg = gefaltet.find((r) => r.region_id === "05558001")!;
    // 3 Anlagen „sonstige" sind weder privat noch gewerbe noch in „alle".
    expect(ascheberg.sums.alle.count).toBe(150);
    expect(ascheberg.sums.privat.count).toBe(140);
    expect(ascheberg.sums.gewerbe.count).toBe(10);
  });
});

describe("Intro-Rang: Speicherleistung zählt nicht zur Solarleistung", () => {
  /**
   * Der Intro-Satz („Nach installierter Solarleistung steht X auf Platz N")
   * rechnete bis zum 28.07.2026 eigenständig und filterte dabei auf ein Segment
   * namens „speicher", das es gar nicht gibt — die Segmente heißen
   * `batterie_privat` und `batterie_gewerbe`. Damit floss die Wechselrichter-
   * Leistung der Batterien in die „Solarleistung" ein. Der Kommentar daneben
   * sagte bereits das Richtige, nur der Code tat es nicht.
   */
  it("die alte Filterbedingung traf auf keine echte Zelle zu", () => {
    expect(CELLS.some((c) => c.segment === "speicher")).toBe(false);
    expect(CELLS.some((c) => c.segment.startsWith("batterie"))).toBe(true);
  });

  it("ändert die Platzierung, wo Batterien den Ausschlag gaben", () => {
    const gefaltet = foldSiblings(REGIONS, CELLS);
    const rang = (id: string) =>
      1 + gefaltet.filter((s) => s.region_id !== id && s.sums.alle.kwp > gefaltet.find((x) => x.region_id === id)!.sums.alle.kwp).length;
    // Billerbeck: 5.700 kWp Solar. Alt kamen 400 kWp Batterie-Leistung dazu.
    expect(gefaltet.find((r) => r.region_id === "05558002")!.sums.alle.kwp).toBe(5700);
    // Ohne Einwohner (9.000) führt, dann Billerbeck, dann Nordkirchen (2.448),
    // dann Ascheberg (2.320) — nach reiner Solarleistung.
    expect(rang("05558004")).toBe(1);
    expect(rang("05558002")).toBe(2);
    expect(rang("05558003")).toBe(3);
    expect(rang("05558001")).toBe(4);
  });
});
