import { describe, it, expect } from "vitest";
import { safeInternalPath } from "../internal-path";

describe("safeInternalPath", () => {
  it("lässt echte seiteninterne Pfade durch", () => {
    expect(safeInternalPath("/solar-atlas/bayern/wuerzburg/hoechberg")).toBe(
      "/solar-atlas/bayern/wuerzburg/hoechberg",
    );
    expect(safeInternalPath("/photovoltaik-rechner?a=2&s=1")).toBe("/photovoltaik-rechner?a=2&s=1");
    expect(safeInternalPath("/")).toBe("/");
  });

  it("blockt alles, was die Seite zur offenen Weiterleitung machen würde", () => {
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("/\\evil.example")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("evil.example")).toBeNull();
  });

  it("blockt Steuerzeichen, Leerzeichen und Überlängen", () => {
    expect(safeInternalPath("/foo\nSet-Cookie: x")).toBeNull();
    expect(safeInternalPath("/foo bar")).toBeNull();
    expect(safeInternalPath(`/${"a".repeat(600)}`)).toBeNull();
  });

  it("behandelt leere Eingaben als 'keine Herkunft'", () => {
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
    expect(safeInternalPath("")).toBeNull();
  });
});
