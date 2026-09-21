import { describe, expect, it } from "vitest";
import { MESSPUNKTE, faelligeMesspunkte, kostenHinweis, nachtraeglich } from "../outreach-wirkung";

describe("Messpunkte hängen am Versandtag, nicht am Kalender", () => {
  it("wird erst am Messpunkt fällig", () => {
    expect(faelligeMesspunkte("2026-09-01", "2026-09-02")).toEqual([]);
    expect(faelligeMesspunkte("2026-09-01", "2026-09-04")).toEqual([3]);
    expect(faelligeMesspunkte("2026-09-01", "2026-09-08")).toEqual([3, 7]);
  });

  it("holt einen ausgefallenen Lauf nach", () => {
    // Der Lauf kann ausfallen; die Messung soll dann nicht für immer fehlen.
    expect(faelligeMesspunkte("2026-08-01", "2026-09-01")).toEqual([...MESSPUNKTE]);
  });

  it("misst nie zweimal denselben Punkt", () => {
    // Tag 7 ist eine Aussage über Tag 7 — heute überschrieben wäre sie eine über heute.
    expect(faelligeMesspunkte("2026-08-01", "2026-09-01", [3, 7, 14, 28])).toEqual([]);
    expect(faelligeMesspunkte("2026-08-01", "2026-09-01", [3, 7])).toEqual([14, 28]);
  });

  it("misst nichts für einen Versand in der Zukunft", () => {
    expect(faelligeMesspunkte("2026-09-30", "2026-09-01")).toEqual([]);
  });

  it("sagt, dass ein Lauf ohne fälligen Punkt nichts kostet", () => {
    expect(kostenHinweis(0)).toMatch(/keine Kosten/);
    expect(kostenHinweis(3)).toMatch(/Verweis-Abruf/);
  });

  it("kennzeichnet einen nachgemessenen Punkt", () => {
    // Ein am 20.09. aufgefüllter Tag-3-Punkt trägt den Stand von heute, nicht den vom 23.08.
    expect(nachtraeglich("2026-08-20", 3, "2026-09-20")).toBe(true);
    expect(nachtraeglich("2026-08-20", 3, "2026-08-23")).toBe(false);
    expect(nachtraeglich("2026-08-20", 3, "2026-08-24")).toBe(false);
  });
});
