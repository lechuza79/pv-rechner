import { describe, it, expect } from "vitest";
import { roundSvgPath } from "../svg-path";

/**
 * Realitäts-Anker für den Hydration-Mismatch im Ringdiagramm der Gemeindeseite
 * (29.07.2026). Der Rundgang (e2e/rundgang.spec.ts) fiel durch, weil React beim
 * Hydrieren zwei Pfade verglich, die sich im letzten Bit unterschieden:
 *
 *   Server: …-76.82147141311209…
 *   Client: …-76.8214714131121…
 *
 * Beides sind unterschiedliche Gleitkommazahlen — die Bogen-Trigonometrie
 * (`Math.sin`/`Math.cos`/`atan2`) ist im Standard nicht auf eine feste
 * Genauigkeit festgelegt und darf sich zwischen dem Node-Prozess und dem
 * Browser unterscheiden. Der Test hält fest, dass genau dieser Unterschied
 * nach dem Runden verschwindet.
 */
describe("Rundung von SVG-Pfaden", () => {
  it("macht die beiden gemeldeten Werte identisch", () => {
    const server = "M0.616,-84.998A85,85,0,1,1,-76.82147141311209,79.79Z";
    const client = "M0.616,-84.998A85,85,0,1,1,-76.8214714131121,79.79Z";

    // Die Ausgangswerte sind wirklich verschieden — sonst würde der Test nichts prüfen.
    expect(server).not.toBe(client);
    expect(roundSvgPath(server)).toBe(roundSvgPath(client));
    expect(roundSvgPath(server)).toContain("-76.821");
  });

  it("kürzt volle Genauigkeit auf drei Nachkommastellen", () => {
    // Echte Ausgabe eines ungerundeten d3-Bogens (innerRadius 61,2 / outerRadius 85).
    const voll =
      "M0.6161133188823175,-84.99776705524854A85,85,0,1,1,-29.300340321361414,79.79028798702511" +
      "L-20.934216944160976,57.5082477644277A61.2,61.2,0,1,0,0.6161133188823066,-61.19689864999938Z";

    expect(roundSvgPath(voll)).toBe(
      "M0.616,-84.998A85,85,0,1,1,-29.3,79.79L-20.934,57.508A61.2,61.2,0,1,0,0.616,-61.197Z",
    );
  });

  it("lässt keine Zahl mit mehr als drei Nachkommastellen übrig", () => {
    const voll =
      "M0.6161133188823175,-84.99776705524854A85,85,0,1,1,-29.300340321361414,79.79028798702511Z";

    for (const zahl of roundSvgPath(voll).match(/-?\d+\.\d+/g) ?? []) {
      expect(zahl.split(".")[1].length).toBeLessThanOrEqual(3);
    }
  });

  /**
   * Wichtig, weil d3-path seit Version 3.1 selbst auf drei Stellen rundet: Auf
   * einer aktuellen Abhängigkeit darf unsere Rundung die Ausgabe NICHT
   * verändern — sonst wäre sie eine unsichtbare Darstellungsänderung statt
   * einer Absicherung.
   */
  it("ändert einen bereits gerundeten Pfad nicht", () => {
    const gerundet = "M0.616,-84.998A85,85,0,1,1,-29.3,79.79L-20.934,57.508Z";
    expect(roundSvgPath(gerundet)).toBe(gerundet);
    expect(roundSvgPath(roundSvgPath(gerundet))).toBe(gerundet);
  });

  it("lässt Befehlsbuchstaben und Flags unangetastet", () => {
    // Die drei Ziffern nach dem Radius eines Bogens sind Flags (Rotation,
    // large-arc, sweep), keine Koordinaten — sie müssen Ganzzahlen bleiben.
    expect(roundSvgPath("M0,0A85,85,0,1,1,10.00049,0Z")).toBe("M0,0A85,85,0,1,1,10,0Z");
  });

  it("verträgt Exponentialschreibweise und negative Nullen", () => {
    // Winzige Restwerte aus der Trigonometrie schreibt JavaScript als 1e-7.
    // Sie sind geometrisch null und sollen auch so im Pfad landen.
    expect(roundSvgPath("M1e-7,-2.5e-8L1.5,2.5")).toBe("M0,0L1.5,2.5");
  });
});
