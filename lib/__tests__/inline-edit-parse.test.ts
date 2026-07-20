import { describe, it, expect } from "vitest";
import { parseGermanNumber } from "../../components/InlineEdit";

// Regression: the old parser stripped ALL dots as thousand separators, so a
// decimal point typed on a numeric keypad silently multiplied the value by 10
// ("2.5" kWp → 25 kWp) and every downstream money figure went wrong.
describe("parseGermanNumber", () => {
  it("treats comma as decimal separator", () => {
    expect(parseGermanNumber("2,5")).toBe(2.5);
    expect(parseGermanNumber("0,312")).toBe(0.312);
  });

  it("treats a lone dot as decimal point, not thousand separator", () => {
    expect(parseGermanNumber("2.5")).toBe(2.5);
    expect(parseGermanNumber("3.5")).toBe(3.5);
    expect(parseGermanNumber("0.75")).toBe(0.75);
    expect(parseGermanNumber("12.25")).toBe(12.25);
  });

  it("keeps strict thousand grouping as thousand separators", () => {
    expect(parseGermanNumber("1.400")).toBe(1400);
    expect(parseGermanNumber("12.500")).toBe(12500);
    expect(parseGermanNumber("1.234.567")).toBe(1234567);
  });

  it("combines thousand dots with decimal comma", () => {
    expect(parseGermanNumber("1.400,5")).toBe(1400.5);
    expect(parseGermanNumber("12.500,75")).toBe(12500.75);
  });

  it("parses plain integers and negatives", () => {
    expect(parseGermanNumber("42")).toBe(42);
    expect(parseGermanNumber(" 18000 ")).toBe(18000);
    expect(parseGermanNumber("-1.400")).toBe(-1400);
  });

  it("returns NaN for garbage", () => {
    expect(Number.isNaN(parseGermanNumber(""))).toBe(true);
    expect(Number.isNaN(parseGermanNumber("abc"))).toBe(true);
  });
});
