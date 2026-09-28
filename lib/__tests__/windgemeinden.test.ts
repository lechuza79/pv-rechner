import { describe, expect, it } from "vitest";
import liste from "../windgemeinden.json";
import { istWindgemeinde, windgemeinde } from "../windgemeinden";

describe("Windgemeinde: Regel", () => {
  it("mehr Wind als Solar bei mindestens zwei Windrädern", () => {
    expect(istWindgemeinde({ windKw: 6000, windAnlagen: 2, solarKwp: 5000 })).toBe(true);
  });
  it("ein einzelnes Windrad macht keine Windgemeinde, auch ein großes nicht", () => {
    expect(istWindgemeinde({ windKw: 5000, windAnlagen: 1, solarKwp: 100 })).toBe(false);
  });
  it("gleich viel Wind wie Solar reicht nicht", () => {
    expect(istWindgemeinde({ windKw: 5000, windAnlagen: 3, solarKwp: 5000 })).toBe(false);
  });
  it("keine Windräder, keine Windgemeinde", () => {
    expect(istWindgemeinde({ windKw: 0, windAnlagen: 0, solarKwp: 0 })).toBe(false);
  });
});

describe("Windgemeinde: erzeugte Liste", () => {
  it("ist nicht leer, trägt achtstellige Schlüssel, sortiert und ohne Doppelte", () => {
    expect(liste.gemeinden.length).toBeGreaterThan(500);
    expect(liste.gemeinden.every((a) => /^\d{8}$/.test(a))).toBe(true);
    expect([...new Set(liste.gemeinden)].sort()).toEqual(liste.gemeinden);
    expect(liste.stand).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  // Anker in beide Richtungen, gemessen am 27.09.2026: Bad Wünnenberg hat
  // 555 MW Wind gegen 47 MW Solar, München fast keinen Wind.
  it("Bad Wünnenberg ist eine, München keine", () => {
    expect(windgemeinde("05774040")).toBe(true);
    expect(windgemeinde("09162000")).toBe(false);
  });
});
