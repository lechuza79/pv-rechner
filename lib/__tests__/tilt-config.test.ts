import { describe, expect, it } from "vitest";
import { TILT_TABLE, TILT_OPTIMUM, tiltPct, TILT_REFERENCE } from "../tilt-config";

// Realitäts-Anker für die Neigungs-/Ausrichtungstabelle: die Werte kommen aus
// einem dokumentierten PVGIS-Abruf (Referenzstandort Mitte Deutschlands). Wer
// die Tabelle neu erzeugt (anderer Standort, neue PVGIS-Version), muss diese
// physikalischen Eigenschaften weiterhin treffen — sie sind standortunabhängig.
describe("tilt-config: Physik-Anker", () => {
  it("Optimum liegt bei Süd zwischen 30° und 45° und ist genau 100 %", () => {
    const max = Math.max(...TILT_TABLE.flatMap((r) => [r.sued, r.suedostwest, r.ostwest, r.nord]));
    expect(max).toBe(100);
    const optimumRows = TILT_TABLE.filter((r) => r.sued === 100);
    expect(optimumRows.length).toBeGreaterThan(0);
    for (const r of optimumRows) {
      expect(r.angle).toBeGreaterThanOrEqual(30);
      expect(r.angle).toBeLessThanOrEqual(45);
    }
    expect(TILT_OPTIMUM.orientation).toBe("sued");
  });

  it("Flachdach (0°) ist ausrichtungsunabhängig — alle Orientierungen gleich", () => {
    const flat = TILT_TABLE.find((r) => r.angle === 0)!;
    expect(flat.sued).toBe(flat.nord);
    expect(flat.sued).toBe(flat.ostwest);
    // Flach liegt deutlich unter dem Optimum, aber weit über einem Norddach.
    expect(flat.sued).toBeGreaterThanOrEqual(80);
    expect(flat.sued).toBeLessThanOrEqual(90);
  });

  it("je Neigung gilt: Süd ≥ Südost/Südwest ≥ Ost/West ≥ Nord", () => {
    for (const r of TILT_TABLE) {
      expect(r.sued).toBeGreaterThanOrEqual(r.suedostwest);
      expect(r.suedostwest).toBeGreaterThanOrEqual(r.ostwest);
      expect(r.ostwest).toBeGreaterThanOrEqual(r.nord);
    }
  });

  it("Nord fällt mit steigender Neigung monoton, Süd steigt bis zum Optimum", () => {
    for (let i = 1; i < TILT_TABLE.length; i++) {
      expect(TILT_TABLE[i].nord).toBeLessThanOrEqual(TILT_TABLE[i - 1].nord);
    }
    const suedBisOptimum = TILT_TABLE.filter((r) => r.angle <= TILT_OPTIMUM.minAngle);
    for (let i = 1; i < suedBisOptimum.length; i++) {
      expect(suedBisOptimum[i].sued).toBeGreaterThanOrEqual(suedBisOptimum[i - 1].sued);
    }
  });

  it("tiltPct trifft die nächstliegende Zeile", () => {
    expect(tiltPct("sued", 37)).toBe(100); // → 35°
    expect(tiltPct("nord", 90)).toBe(19);
    expect(tiltPct("ostwest", 32)).toBe(81); // → 30°
  });

  it("Referenz-Metadaten sind vollständig (Herkunft bleibt belegbar)", () => {
    expect(TILT_REFERENCE.fetchedIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TILT_REFERENCE.method).toContain("PVGIS");
    expect(TILT_REFERENCE.optimumKwhKwp).toBeGreaterThan(900);
    expect(TILT_REFERENCE.optimumKwhKwp).toBeLessThan(1200);
  });
});
