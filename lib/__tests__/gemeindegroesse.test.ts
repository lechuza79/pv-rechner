import { describe, it, expect } from "vitest";
import { GROESSENKLASSEN, GROESSENKLASSE_BY_SLUG, klasseVon } from "../gemeindegroesse";

describe("Größenklassen", () => {
  it("trennt genau an den BBSR-Schwellen 5.000 / 20.000 / 100.000", () => {
    // Die Schwelle gehört jeweils zur OBEREN Klasse ("5.000 bis unter 20.000").
    expect(klasseVon(4_999)?.slug).toBe("unter-5000");
    expect(klasseVon(5_000)?.slug).toBe("5000-20000");
    expect(klasseVon(19_999)?.slug).toBe("5000-20000");
    expect(klasseVon(20_000)?.slug).toBe("20000-100000");
    expect(klasseVon(99_999)?.slug).toBe("20000-100000");
    expect(klasseVon(100_000)?.slug).toBe("ab-100000");
    expect(klasseVon(3_800_000)?.slug).toBe("ab-100000");
  });

  it("lässt Orte ohne Einwohnerzahl draussen — ohne Nenner keine Pro-Kopf-Zahl", () => {
    expect(klasseVon(0)).toBeNull();
    expect(klasseVon(-1)).toBeNull();
  });

  it("deckt jede Einwohnerzahl genau einmal ab", () => {
    for (const p of [1, 4_999, 5_000, 20_000, 100_000, 1_000_000]) {
      const treffer = GROESSENKLASSEN.filter((k) => p >= k.min && (k.max === null || p < k.max));
      expect(treffer).toHaveLength(1);
    }
  });

  it("trägt keine BBSR-Typnamen — die hängen an der zentralörtlichen Funktion", () => {
    // Eine 6.000-Einwohner-Gemeinde IST nicht automatisch eine "Kleinstadt";
    // das entscheidet beim BBSR zusätzlich die zentralörtliche Funktion, die uns
    // nicht vorliegt. Die Klassen heissen deshalb nach ihrer Einwohnerspanne.
    const text = GROESSENKLASSEN.map((k) => `${k.label} ${k.langform}`).join(" ");
    for (const wort of ["Kleinstadt", "Mittelstadt", "Großstadt", "Landgemeinde"]) {
      expect(text).not.toContain(wort);
    }
  });

  it("findet jede Klasse über ihren Slug", () => {
    for (const k of GROESSENKLASSEN) expect(GROESSENKLASSE_BY_SLUG[k.slug]).toBe(k);
  });
});
