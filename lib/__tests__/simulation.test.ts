import { describe, it, expect } from "vitest";
import { calcCellTemp, calcCurrentPower } from "../simulation";

describe("calcCellTemp (Sandia NOCT model)", () => {
  it("uses 20 °C as the NOCT ambient reference, not 25 °C (STC)", () => {
    // NOCT = 45 → temperature rise at 800 W/m² is (45 - 20) = 25 K.
    // GHI 800, ambient 30 °C → cell 55 °C. (The old buggy 25 °C reference
    // gave only 50 °C and overstated summer output ~2 %.)
    expect(calcCellTemp(30, 800)).toBeCloseTo(55, 5);
  });

  it("equals ambient temperature when there is no irradiance", () => {
    expect(calcCellTemp(18, 0)).toBe(18);
  });
});

describe("calcCurrentPower", () => {
  it("returns 0 at night or with no system", () => {
    expect(calcCurrentPower(10, 0, 20)).toBe(0);
    expect(calcCurrentPower(0, 800, 20)).toBe(0);
  });

  it("scales roughly linearly with kWp", () => {
    const p5 = calcCurrentPower(5, 800, 20);
    const p10 = calcCurrentPower(10, 800, 20);
    expect(p10).toBeCloseTo(p5 * 2, 0);
  });
});
