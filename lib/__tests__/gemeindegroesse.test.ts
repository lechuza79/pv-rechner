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

  it("nennt keine Klasse Kleinstadt, Mittelstadt oder Landgemeinde", () => {
    // Diese BBSR-Typen haengen zusaetzlich an der zentralörtlichen Funktion
    // ("Gemeinden mit oberzentraler Funktion werden bereits ab 9.000 Einwohnern
    // als Mittelstadt eingeordnet"). Die liegt uns nicht vor — eine
    // 6.000-Einwohner-Gemeinde IST also nicht automatisch eine Kleinstadt.
    const text = GROESSENKLASSEN.map((k) => `${k.langform} ${k.kollektiv} ${k.einzahl}`).join(" ");
    for (const wort of ["Kleinstadt", "Mittelstadt", "Landgemeinde"]) {
      expect(text).not.toContain(wort);
    }
  });

  it("sagt „Großstadt“ nur ab 100.000 — dort deckt es sich ausnahmslos", () => {
    // Die zentralörtliche Funktion kann Orte nur NACH OBEN schieben, nie nach
    // unten. Ab 100.000 ist Großstadt daher immer richtig; gemessen tragen alle
    // 80 dieser Orte auch amtlich eine Stadt-Bezeichnung.
    const gross = GROESSENKLASSE_BY_SLUG["ab-100000"];
    expect(gross.kollektiv).toBe("Großstädte");
    for (const k of GROESSENKLASSEN.filter((x) => x.slug !== "ab-100000")) {
      expect(`${k.kollektiv} ${k.einzahl}`).not.toContain("Großstadt");
    }
  });

  it("nennt kein „Dorf“ — 390 Orte unter 5.000 Einwohnern sind amtlich Städte", () => {
    // Die kleinste ist Arnis mit 251 Einwohnern. „Gemeinden“ stimmt dagegen
    // immer: Eine Stadt ist rechtlich eine Gemeinde mit der Bezeichnung Stadt.
    const text = GROESSENKLASSEN.map((k) => `${k.langform} ${k.kollektiv} ${k.einzahl}`).join(" ");
    expect(text).not.toMatch(/Dorf|Dörfer/);
    expect(GROESSENKLASSE_BY_SLUG["unter-5000"].kollektiv).toBe("Gemeinden");
  });

  it("findet jede Klasse über ihren Slug", () => {
    for (const k of GROESSENKLASSEN) expect(GROESSENKLASSE_BY_SLUG[k.slug]).toBe(k);
  });
});
