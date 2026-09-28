import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { embedPfadZiel } from "../embed-pfad-weiche";

const WURZEL = join(__dirname, "..", "..");
const ziel = (pfad: string, query: string) => embedPfadZiel(pfad, new URLSearchParams(query));

describe("Embed-Weiche: Abfrageform → zwischengespeicherter Pfad-Zwilling", () => {
  it("schreibt gültige Gemeindeschlüssel um, auch mit Theme-Parametern daneben", () => {
    expect(ziel("/embed/gemeinde-solar", "ags=09679147&bg=%23fff&share=0")).toBe("/embed/gemeinde-solar/09679147");
    expect(ziel("/embed/gemeinde-erneuerbare", "ags=09-679-147")).toBe("/embed/gemeinde-erneuerbare/09679147");
    expect(ziel("/embed/gemeinde-solarleistung", "ags=09679147")).toBe("/embed/gemeinde-solarleistung/09679147");
  });

  it("lässt ungültige Schlüssel bei der Seite, die dieselbe Fehlermeldung zeigt wie bisher", () => {
    expect(ziel("/embed/gemeinde-solar", "")).toBeNull();
    expect(ziel("/embed/gemeinde-solar", "ags=0967914")).toBeNull();
    expect(ziel("/embed/region-anlagentyp", "bl=1")).toBeNull();
  });

  it("normalisiert das Bundesland wie die Seite vorher (Ziffern, erste zwei)", () => {
    expect(ziel("/embed/region-anlagentyp", "bl=13")).toBe("/embed/region-anlagentyp/13");
    expect(ziel("/embed/region-solarleistung", "bl=130")).toBe("/embed/region-solarleistung/13");
  });

  it("kennzahl: nur mit Parametern, unbekannte Werte fallen auf den Vorgabewert", () => {
    expect(ziel("/embed/kennzahl", "")).toBeNull();
    expect(ziel("/embed/kennzahl", "metric=anlagen")).toBe("/embed/kennzahl/anlagen/gesamt");
    expect(ziel("/embed/kennzahl", "metric=x&traeger=wind")).toBe("/embed/kennzahl/leistung/wind");
  });

  it("simulation: PLZ und Darstellung, sonst die Seite selbst", () => {
    expect(ziel("/embed/simulation", "")).toBeNull();
    expect(ziel("/embed/simulation", "plz=abc")).toBeNull();
    expect(ziel("/embed/simulation", "plz=97074")).toBe("/embed/simulation/97074/widget");
    expect(ziel("/embed/simulation", "plz=97074&presentation=site&onsite=1")).toBe("/embed/simulation/97074/site");
    expect(ziel("/embed/simulation", "presentation=site")).toBe("/embed/simulation/ohne/site");
  });

  it("fasst weder fremde Widgets noch schon umgeschriebene Pfade an", () => {
    expect(ziel("/embed/strommix", "ags=09679147")).toBeNull();
    expect(ziel("/embed/gemeinde-solar/09679147", "ags=09679147")).toBeNull();
    expect(ziel("/photovoltaik-rechner", "ags=09679147")).toBeNull();
  });

  it("jedes Ziel hat eine Seite, und keine der Seiten an der Abfrage-Adresse liest searchParams", () => {
    const zwillinge = [
      "gemeinde-solar/[ags]",
      "gemeinde-erneuerbare/[ags]",
      "gemeinde-solarleistung/[ags]",
      "region-anlagentyp/[bl]",
      "region-solarleistung/[bl]",
      "kennzahl/[metric]/[traeger]",
      "simulation/[plz]/[darstellung]",
    ];
    for (const z of zwillinge) {
      expect(existsSync(join(WURZEL, "app/(embed)/embed", z, "page.tsx")), z).toBe(true);
    }
    for (const w of ["gemeinde-solar", "gemeinde-erneuerbare", "gemeinde-solarleistung", "region-anlagentyp",
      "region-solarleistung", "kennzahl", "simulation", "erzeugung", "erzeugung-mini"]) {
      const quelle = readFileSync(join(WURZEL, "app/(embed)/embed", w, "page.tsx"), "utf8");
      expect(quelle, w).not.toMatch(/props\.searchParams|searchParams\?:/);
    }
  });

  it("die Middleware benutzt die Weiche im Embed-Zweig", () => {
    const mw = readFileSync(join(WURZEL, "middleware.ts"), "utf8");
    expect(mw).toMatch(/embedPfadZiel\(request\.nextUrl\.pathname, request\.nextUrl\.searchParams\)/);
    expect(mw).toMatch(/NextResponse\.rewrite\(url\)/);
  });
});
