import { describe, it, expect } from "vitest";
import { GROESSENKLASSEN, GROESSENKLASSE_BY_SLUG, klasseLangform, klasseVon } from "../gemeindegroesse";

describe("Größenklassen", () => {
  it("trennt an den Schwellen der Solarbundesliga: 1.000 / 5.000 / 20.000 / 100.000", () => {
    // Die Schwelle gehört jeweils zur OBEREN Klasse ("Gemeinden von 1.000–4.999",
    // "Kleinstädte (5.000–19.999)", "Mittelstädte (20.000–99.999)").
    expect(klasseVon(1)?.slug).toBe("kleingemeinden");
    expect(klasseVon(999)?.slug).toBe("kleingemeinden");
    expect(klasseVon(1_000)?.slug).toBe("gemeinden");
    expect(klasseVon(4_999)?.slug).toBe("gemeinden");
    expect(klasseVon(5_000)?.slug).toBe("kleinstaedte");
    expect(klasseVon(19_999)?.slug).toBe("kleinstaedte");
    expect(klasseVon(20_000)?.slug).toBe("mittelstaedte");
    expect(klasseVon(99_999)?.slug).toBe("mittelstaedte");
    expect(klasseVon(100_000)?.slug).toBe("grossstaedte");
    expect(klasseVon(3_685_265)?.slug).toBe("grossstaedte");
  });

  it("hat den Schnitt bei 1.000 — ohne ihn gewinnt der Weiler jede Liste", () => {
    // Gemessen am 29.07.2026: Beim Zubau je Einwohner lagen ALLE 100
    // Spitzenplätze unter 1.000 Einwohnern (Median 180). Erst diese Grenze
    // trennt den 91-Einwohner-Ort vom 3.000-Einwohner-Dorf.
    expect(klasseVon(91)?.slug).not.toBe(klasseVon(3_000)?.slug);
  });

  it("lässt Orte ohne Einwohnerzahl draussen — ohne Nenner keine Pro-Kopf-Zahl", () => {
    expect(klasseVon(0)).toBeNull();
    expect(klasseVon(-1)).toBeNull();
  });

  it("deckt jede Einwohnerzahl genau einmal ab", () => {
    for (const p of [1, 999, 1_000, 4_999, 5_000, 20_000, 100_000, 4_000_000]) {
      const treffer = GROESSENKLASSEN.filter((k) => p >= k.min && (k.max === null || p < k.max));
      expect(treffer).toHaveLength(1);
    }
  });

  it("nennt neben dem Namen immer die Einwohnerspanne", () => {
    // "Kleinstädte" allein verrät nicht, wo die Grenze liegt. Der Name ist eine
    // Größenklasse, keine Aussage über den Rechtsstatus eines Ortes — deshalb
    // muss die Zahl daneben stehen.
    for (const k of GROESSENKLASSEN) {
      expect(k.spanne).toMatch(/\d/);
      expect(klasseLangform(k)).toContain(k.spanne);
      expect(klasseLangform(k)).toContain("Einwohner");
    }
  });

  it("findet jede Klasse über ihren Slug", () => {
    for (const k of GROESSENKLASSEN) expect(GROESSENKLASSE_BY_SLUG[k.slug]).toBe(k);
  });

  it("steigt lückenlos und ohne Überschneidung", () => {
    for (let i = 1; i < GROESSENKLASSEN.length; i++) {
      expect(GROESSENKLASSEN[i].min).toBe(GROESSENKLASSEN[i - 1].max);
    }
    expect(GROESSENKLASSEN[GROESSENKLASSEN.length - 1].max).toBeNull();
  });
});
