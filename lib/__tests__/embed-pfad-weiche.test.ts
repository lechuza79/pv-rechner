import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { embedPfadZiel, istKonfigRewrite } from "../embed-pfad-weiche";

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

  it("die Middleware benutzt die Weiche und überlässt kanonische Formen der Konfiguration", () => {
    const mw = readFileSync(join(WURZEL, "middleware.ts"), "utf8");
    expect(mw).toMatch(/istKonfigRewrite\(request\.nextUrl\.pathname, request\.nextUrl\.searchParams\)/);
    expect(mw).toMatch(/embedPfadZiel\(request\.nextUrl\.pathname, request\.nextUrl\.searchParams\)/);
    expect(mw).toMatch(/NextResponse\.rewrite\(url\)/);
  });

  it("die Rewrites in next.config.js treffen genau die kanonischen Formen — mit demselben Ziel", async () => {
    type Bed = { type: string; key: string; value?: string };
    type Regel = { source: string; destination: string; has?: Bed[]; missing?: Bed[] };
    const config = (await import("../../next.config.js")).default as { rewrites: () => Promise<{ beforeFiles: Regel[] }> };
    const regeln = (await config.rewrites()).beforeFiles.filter((r) => r.source.startsWith("/embed/"));
    expect(regeln.length).toBeGreaterThan(0);
    // Simulates Next's matching of `source`, `has` and `missing` (values are anchored).
    const konfig = (pfad: string, query: string): string | null => {
      const p = new URLSearchParams(query);
      const teile = pfad.split("/");
      for (const r of regeln) {
        const m = r.source.match(/^\/embed\/(?::w\(([^)]+)\)|([a-z-]+))$/);
        if (!m) throw new Error(`unbekannte Quelle ${r.source}`);
        const erlaubt = m[1] ? m[1].split("|") : [m[2]];
        if (teile.length !== 3 || !erlaubt.includes(teile[2])) continue;
        const werte: Record<string, string> = { w: teile[2] };
        const hatAlle = (r.has ?? []).every((b) => {
          const v = p.get(b.key);
          if (v === null) return false;
          const t = new RegExp("^" + (b.value ?? ".*") + "$").exec(v);
          if (t?.groups) Object.assign(werte, t.groups);
          return !!t;
        });
        if (!hatAlle || (r.missing ?? []).some((b) => p.has(b.key))) continue;
        return r.destination.replace(/:(\w+)/g, (_, k: string) => werte[k]);
      }
      return null;
    };
    const faelle: [string, string][] = [
      ["/embed/gemeinde-solar", "ags=09679147"], ["/embed/gemeinde-solar", "ags=09-679-147"], ["/embed/gemeinde-solar", "ags=123"],
      ["/embed/gemeinde-erneuerbare", "ags=09679147&bg=x"], ["/embed/gemeinde-solarleistung", "ags=09679147"],
      ["/embed/region-anlagentyp", "bl=13"], ["/embed/region-anlagentyp", "bl=130"], ["/embed/region-solarleistung", "bl=1"],
      ["/embed/simulation", ""], ["/embed/simulation", "plz=97074"], ["/embed/simulation", "plz=97074&presentation=site"],
      ["/embed/simulation", "presentation=site"], ["/embed/simulation", "plz=abc&presentation=site"], ["/embed/simulation", "plz=&presentation=site"],
      ["/embed/kennzahl", "metric=anlagen"], ["/embed/strommix", "ags=09679147"],
    ];
    for (const [pfad, query] of faelle) {
      const p = new URLSearchParams(query);
      const ueberKonfig = konfig(pfad, query);
      // The config rewrites exactly when the middleware steps aside …
      expect(ueberKonfig !== null, `${pfad}?${query}`).toBe(istKonfigRewrite(pfad, p));
      // … and both routes land on the same twin.
      const ziel = embedPfadZiel(pfad, p);
      expect(ueberKonfig ?? ziel, `${pfad}?${query}`).toBe(ziel);
    }
  });
});
