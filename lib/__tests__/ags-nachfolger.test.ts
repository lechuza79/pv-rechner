import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aktuellerGemeindeschluessel,
  nachfolgerAusAenderungen,
  type Gebietsaenderung,
} from "../ags-nachfolger";

const z = (p: Partial<Gebietsaenderung> & Pick<Gebietsaenderung, "alt" | "neu" | "art" | "seit">): Gebietsaenderung => ({
  kennziffer: "x",
  flaecheQm: 0,
  einwohner: 0,
  ...p,
});

describe("Nachfolger eines Gemeindeschlüssels", () => {
  it("Schlüsseländerung und Auflösung ziehen die ganze Gemeinde um", () => {
    const t = nachfolgerAusAenderungen([
      z({ alt: "06435014", neu: "06415000", art: "3", seit: "2026-01-01" }),
      z({ alt: "16076004", neu: "16076094", art: "1", seit: "2024-01-01" }),
    ]);
    expect(aktuellerGemeindeschluessel("06435014", t)).toBe("06415000");
    expect(aktuellerGemeindeschluessel("16076004", t)).toBe("16076094");
  });

  it("eine Teilausgliederung zieht NICHT die ganze Gemeinde um", () => {
    const t = nachfolgerAusAenderungen([z({ alt: "07131090", neu: "07131017", art: "2", seit: "2025-01-01" })]);
    expect(aktuellerGemeindeschluessel("07131090", t)).toBe("07131090");
  });

  it("folgt Ketten über mehrere Jahre", () => {
    const t = nachfolgerAusAenderungen([
      z({ alt: "11111111", neu: "22222222", art: "1", seit: "2012-01-01" }),
      z({ alt: "22222222", neu: "33333333", art: "3", seit: "2024-01-01" }),
    ]);
    expect(aktuellerGemeindeschluessel("11111111", t)).toBe("33333333");
  });

  it("aufgeteilt: die Anlagen gehen dorthin, wo die meisten Einwohner hingingen", () => {
    const t = nachfolgerAusAenderungen([
      z({ alt: "01060014", neu: "01060007", art: "1", seit: "2026-01-01", einwohner: 10, flaecheQm: 9e6 }),
      z({ alt: "01060014", neu: "01060038", art: "1", seit: "2026-01-01", einwohner: 300, flaecheQm: 1e6 }),
    ]);
    expect(t["01060014"]).toEqual({ neu: "01060038", seit: "2026-01-01", aufgeteilt: true });
  });

  it("ein Schlüssel, der später wieder Gebiet aufnimmt, lebt wieder", () => {
    const t = nachfolgerAusAenderungen([
      z({ alt: "44444444", neu: "55555555", art: "1", seit: "2010-01-01" }),
      z({ alt: "66666666", neu: "44444444", art: "1", seit: "2020-01-01" }),
    ]);
    expect(aktuellerGemeindeschluessel("44444444", t)).toBe("44444444");
    expect(aktuellerGemeindeschluessel("66666666", t)).toBe("44444444");
  });

  it("ein unbekannter Schlüssel bleibt, wie er ist; ein Kreis-Zyklus hängt nicht", () => {
    expect(aktuellerGemeindeschluessel("09162000", {})).toBe("09162000");
    const zyklus = { "1": { neu: "2", seit: "x" }, "2": { neu: "1", seit: "x" } };
    expect(["1", "2"]).toContain(aktuellerGemeindeschluessel("1", zyklus));
  });
});

describe("die eingecheckte Tabelle (aus den Destatis-Listen erzeugt)", () => {
  // Real cases from 18.09.2026 — the ones that showed zero or too few plants.
  it.each([
    ["06435014", "06415000"], // Hanau, kreisfrei seit 01.01.2026
    ["16061097", "16061119"], // Uder
    ["16076004", "16076094"], // Berga/Elster → Berga-Wünschendorf
    ["16076084", "16076094"], // Wünschendorf/Elster → Berga-Wünschendorf
    ["07232096", "07232503"], // Obergeckler (alt) → Obergeckler (neu)
  ])("%s → %s", (alt, neu) => {
    expect(aktuellerGemeindeschluessel(alt)).toBe(neu);
  });

  it("jeder Nachfolger ist ein achtstelliger Schlüssel", () => {
    const daten = JSON.parse(readFileSync(resolve(__dirname, "../ags-nachfolger-daten.json"), "utf8"));
    for (const [alt, n] of Object.entries(daten.nachfolger as Record<string, { neu: string }>)) {
      expect(alt).toMatch(/^\d{8}$/);
      expect(n.neu).toMatch(/^\d{8}$/);
    }
  });

  it("beide Importe benutzen die Zuordnung — Verwendung, nicht Vorhandensein", () => {
    for (const datei of ["mastr-bnetza-refresh.ts", "mastr-monat-refresh.ts"]) {
      const src = readFileSync(resolve(__dirname, "../../scripts", datei), "utf8");
      // The key that goes into the aggregate must be the mapped one.
      expect(src, datei).toMatch(/aktuellerGemeindeschluessel\(\s*gks[\w.]*(\(\s*0\s*,\s*8\s*\))?\s*\)/);
    }
    const haupt = readFileSync(resolve(__dirname, "../../scripts/mastr-bnetza-refresh.ts"), "utf8");
    expect(haupt).toMatch(/const regionId = aktuellerGemeindeschluessel\(/);
    expect(haupt).toMatch(/const kreisAgs = regionId\.substring\(0, 5\)/);
    const monat = readFileSync(resolve(__dirname, "../../scripts/mastr-monat-refresh.ts"), "utf8");
    expect(monat).toMatch(/const key = `\$\{aktuellerGemeindeschluessel\(gks\.slice\(0, 8\)\)\}\|/);
  });
});
