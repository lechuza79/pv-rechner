import { describe, it, expect } from "vitest";
import { GROESSENKLASSEN, GROESSENKLASSE_BY_SLUG, klasseLangform, klasseVon, spanneVon } from "../gemeindegroesse";

describe("Größenklassen", () => {
  it("trennt an den Schwellen der Solarbundesliga: 1.000 / 5.000 / 20.000 / 100.000", () => {
    // Die Schwelle gehört jeweils zur OBEREN Klasse ("Gemeinden von 1.000–4.999",
    // "Kleinstädte (5.000–19.999)", "Mittelstädte (20.000–99.999)").
    expect(klasseVon(1)?.slug).toBe("doerfer");
    expect(klasseVon(999)?.slug).toBe("doerfer");
    expect(klasseVon(1_000)?.slug).toBe("kleine-gemeinden");
    expect(klasseVon(4_999)?.slug).toBe("kleine-gemeinden");
    expect(klasseVon(5_000)?.slug).toBe("gemeinden-und-kleinstaedte");
    expect(klasseVon(19_999)?.slug).toBe("gemeinden-und-kleinstaedte");
    expect(klasseVon(20_000)?.slug).toBe("mittelgrosse-staedte");
    expect(klasseVon(99_999)?.slug).toBe("mittelgrosse-staedte");
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
      expect(spanneVon(k)).toMatch(/\d/);
      expect(klasseLangform(k)).toContain(spanneVon(k));
      expect(klasseLangform(k)).toContain("Einwohner");
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DIE ANGEZEIGTE SPANNE MUSS SAGEN, WAS GERECHNET WIRD.
  //
  // Bis zum 31.07.2026 standen die Spannen von Hand daneben: "1.000–5.000" und
  // direkt darunter "5.000–20.000". An JEDER Klassengrenze beanspruchten damit
  // zwei Klassen denselben Ort, und keine der beiden Angaben verriet, welche
  // gewinnt. Gerechnet wird die Obergrenze exklusiv.
  // ───────────────────────────────────────────────────────────────────────────
  it("nennt keine Einwohnerzahl in zwei Spannen gleichzeitig", () => {
    // Vorher lasen sich zwei benachbarte Klassen „1.000–5.000" und
    // „5.000–20.000": die 5.000 stand in beiden. Geprüft wird deshalb nicht die
    // Schreibweise, sondern die Aussage — jede genannte Zahl darf nur zu EINER
    // Klasse gehören. „unter 1.000" und „ab 100.000" nennen bewusst die
    // Schwelle selbst, sie sind offene Ränder und werden getrennt geprüft.
    const genannt = new Map<number, string[]>();
    for (const k of GROESSENKLASSEN) {
      const s = spanneVon(k);
      if (s.startsWith("unter") || s.startsWith("ab")) continue;
      for (const roh of s.match(/[\d.]+/g) ?? []) {
        const zahl = Number(roh.replace(/\./g, ""));
        genannt.set(zahl, [...(genannt.get(zahl) ?? []), `${k.label} („${s}“)`]);
      }
    }
    for (const [zahl, klassen] of genannt) {
      expect(klassen, `${zahl.toLocaleString("de-DE")} steht in mehreren Spannen`).toHaveLength(1);
    }
  });

  it("schließt an der Grenze lückenlos an, ohne sie doppelt zu nennen", () => {
    // Die obere Zahl einer Spanne und die untere der nächsten müssen genau um
    // eins auseinanderliegen: „…–4.999" gefolgt von „5.000–…".
    for (let i = 1; i < GROESSENKLASSEN.length; i++) {
      const vorher = spanneVon(GROESSENKLASSEN[i - 1]);
      const diese = spanneVon(GROESSENKLASSEN[i]);
      const letzteZahl = (s: string) => {
        const alle = (s.match(/[\d.]+/g) ?? []).map((z) => Number(z.replace(/\./g, "")));
        return alle[alle.length - 1];
      };
      const ersteZahl = (s: string) => Number((s.match(/[\d.]+/) ?? ["0"])[0].replace(/\./g, ""));
      // „unter 1.000" nennt die exklusive Grenze, alle anderen die letzte
      // enthaltene Zahl.
      const obereGrenze = vorher.startsWith("unter") ? letzteZahl(vorher) - 1 : letzteZahl(vorher);
      expect(obereGrenze + 1, `„${vorher}“ → „${diese}“`).toBe(ersteZahl(diese));
    }
  });

  it("zählt jede genannte Grenzzahl der Klasse zu, die sie auch rechnet", () => {
    // Die Probe aufs Exempel: Jede Zahl, die in einer Spanne SICHTBAR steht,
    // muss von klasseVon auch genau dieser Klasse zugeordnet werden.
    for (const k of GROESSENKLASSEN) {
      for (const roh of spanneVon(k).match(/[\d.]+/g) ?? []) {
        const zahl = Number(roh.replace(/\./g, ""));
        // "unter 1.000" nennt die Grenze selbst, die schon zur nächsten gehört.
        if (spanneVon(k).startsWith("unter")) continue;
        expect(klasseVon(zahl)?.slug, `${k.label}: „${spanneVon(k)}“ nennt ${zahl}`).toBe(k.slug);
      }
    }
  });

  it("schreibt die Spanne so, wie sie an den echten Schwellen gemeint ist", () => {
    expect(spanneVon({ min: 0, max: 1_000 })).toBe("unter 1.000");
    expect(spanneVon({ min: 1_000, max: 5_000 })).toBe("1.000–4.999");
    expect(spanneVon({ min: 5_000, max: 20_000 })).toBe("5.000–19.999");
    expect(spanneVon({ min: 20_000, max: 100_000 })).toBe("20.000–99.999");
    expect(spanneVon({ min: 100_000, max: null })).toBe("ab 100.000");
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
