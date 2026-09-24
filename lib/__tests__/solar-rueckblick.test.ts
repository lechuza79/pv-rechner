import { describe, it, expect } from "vitest";
import { solarRueckblick, RUECKBLICK_VON, type WetterJahr } from "../solar-rueckblick";

// Synthetic weather: 10 °C, 500 W/m² from 08–17 UTC. The checks are about
// balances and guards, not about any real location's result.
function jahre(): WetterJahr[] {
  return Array.from({ length: 10 }, (_, i) => {
    const jahr = RUECKBLICK_VON + i;
    const n = (Date.UTC(jahr + 1, 0, 1) - Date.UTC(jahr, 0, 1)) / 3_600_000;
    return {
      jahr,
      temperaturC: Array(n).fill(10),
      einstrahlungGeneigtWm2: Array.from({ length: n }, (_, h) => (h % 24 >= 8 && h % 24 < 17 ? 500 : 0)),
    };
  });
}

describe("Solar-Rückblick 2016–2025", () => {
  it("without PV there is no PV advantage — also not with a heat pump", () => {
    // The prototype once mixed in a gas-to-heat-pump switch and returned
    // −3,263 € at zero PV. Both sides of the comparison must be the same household.
    const r = solarRueckblick(jahre(), 0);
    expect(r.vorteilOhneWp).toBe(0);
    expect(r.vorteilMitWp).toBe(0);
  });

  it("counts every kWh of PV exactly once and never uses more than was produced", () => {
    const r = solarRueckblick(jahre());
    expect(r.jahre).toHaveLength(10);
    for (const j of r.jahre) {
      expect(j.eigenverbrauchOhneWpKwh).toBeLessThanOrEqual(j.erzeugungKwh);
      expect(j.eigenverbrauchMitWpKwh).toBeLessThanOrEqual(j.erzeugungKwh);
      expect(j.eigenverbrauchMitWpKwh).toBeGreaterThanOrEqual(j.eigenverbrauchOhneWpKwh);
      expect(j.vorteilMitWp).toBeGreaterThanOrEqual(j.vorteilOhneWp);
      expect(j.netzbezugMitWpKwh).toBeGreaterThanOrEqual(0);
    }
  });

  it("distributes exactly ten years of heat demand", () => {
    const r = solarRueckblick(jahre());
    const summe = r.jahre.reduce((s, j) => s + j.waermeKwh, 0);
    expect(summe).toBeCloseTo(10 * r.annahmen.waermeKwhJahr, 3);
  });

  it("degrades the modules year by year", () => {
    const r = solarRueckblick(jahre());
    expect(r.jahre[9].erzeugungKwh).toBeLessThan(r.jahre[0].erzeugungKwh);
  });

  it("rejects missing, non-finite and misordered weather instead of computing around it", () => {
    const fehlend = jahre();
    fehlend[0].temperaturC[0] = null as unknown as number;
    expect(() => solarRueckblick(fehlend)).toThrow();
    const kurz = jahre();
    kurz[3].einstrahlungGeneigtWm2.pop();
    expect(() => solarRueckblick(kurz)).toThrow();
    const vertauscht = jahre();
    [vertauscht[1], vertauscht[2]] = [vertauscht[2], vertauscht[1]];
    expect(() => solarRueckblick(vertauscht)).toThrow();
    expect(() => solarRueckblick(jahre().slice(1))).toThrow();
  });
});

describe("Clock alignment", () => {
  it("reads the German clock, including both daylight-saving switches", async () => {
    const { berlinStunde } = await import("../solar-rueckblick");
    // Winter: UTC+1
    expect(berlinStunde(Date.UTC(2024, 0, 15, 11))).toEqual({ monat: 0, stunde: 12 });
    // Summer: UTC+2
    expect(berlinStunde(Date.UTC(2024, 6, 15, 11))).toEqual({ monat: 6, stunde: 13 });
    // New Year in Germany starts while UTC is still in December
    expect(berlinStunde(Date.UTC(2023, 11, 31, 23))).toEqual({ monat: 0, stunde: 0 });
  });

});
