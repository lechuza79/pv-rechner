import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ChildYearRow, RankingRegion } from "../atlas";
import { entpackeRankingZellen, packeRankingZellen } from "../ranking-zellen";

const regions = [
  { region_id: "09162", name: "München", slug: "muenchen", population: 1_500_000 },
  { region_id: "09163", name: "Rosenheim", slug: "rosenheim", population: 63_000 },
] as unknown as RankingRegion[];

const cells: ChildYearRow[] = [
  { region_id: "09162", segment: "privat_dach", year: 2010, count: 12, kwp: 83.123456789, kwh: 0 },
  { region_id: "09162", segment: "batterie_privat", year: 2021, count: 3, kwp: 7.5, kwh: 21.1 },
  { region_id: "09162", segment: "pumpspeicher", year: 2000, count: 1, kwp: 0, kwh: 900000 },
  { region_id: "99999", segment: "privat_dach", year: 2020, count: 5, kwp: 40, kwh: 0 },
  { region_id: "09163", segment: "freiflaeche", year: 2024, count: 1, kwp: 750.25, kwh: 0 },
  { region_id: "09163", segment: "unbekannt", year: 2024, count: 2, kwp: 3, kwh: 0 },
];

describe("gepackte Ranglisten-Zellen", () => {
  it("liefert dieselben Zellen in derselben Reihenfolge mit exakt denselben Zahlen", () => {
    const zurueck = entpackeRankingZellen(packeRankingZellen(cells, regions), regions);
    expect(zurueck).toEqual([
      { region_id: "09162", segment: "privat_dach", year: 2010, count: 12, kwp: 83.123456789, kwh: 0 },
      { region_id: "09162", segment: "batterie_privat", year: 2021, count: 3, kwp: 0, kwh: 21.1 },
      { region_id: "09163", segment: "freiflaeche", year: 2024, count: 1, kwp: 750.25, kwh: 0 },
      // Unknown segments count under "alle" in the table (undefined !== null) — kept.
      { region_id: "09163", segment: "unbekannt", year: 2024, count: 2, kwp: 3, kwh: 0 },
    ]);
  });

  it("die Tabelle liest aus einer Batteriezelle nur kWh und aus jeder anderen nur kWp", () => {
    // The packed form drops the other value; this pins the assumption to the code.
    const quelle = readFileSync(join(__dirname, "..", "..", "components/atlas/RankingTable.tsx"), "utf8");
    const build = quelle.slice(quelle.indexOf("const build = useMemo"), quelle.indexOf("const rows = useMemo"));
    expect(build).toMatch(/if \(c\.segment\.startsWith\("batterie"\)\) a\.speicher \+= c\.kwh;/);
    expect(build).toMatch(/a\.privat\.batterieKwh \+= c\.kwh;/);
    expect(build.match(/c\.kwh/g)).toHaveLength(2);
    // The second pass (money) skips batteries before reading kWp.
    expect(build).toMatch(/if \(c\.segment\.startsWith\("batterie"\)\) continue;/);
  });

  it("ist deutlich kleiner als die Objektliste", () => {
    const viele: ChildYearRow[] = [];
    for (let y = 2000; y < 2026; y++) for (const r of regions) for (const segment of ["privat_dach", "gewerbe_dach", "batterie_privat"])
      viele.push({ region_id: r.region_id, segment, year: y, count: 17, kwp: 123.4567, kwh: 45.6 });
    expect(JSON.stringify(packeRankingZellen(viele, regions)).length).toBeLessThan(JSON.stringify(viele).length / 3);
  });
});
