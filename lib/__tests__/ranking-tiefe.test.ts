import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { istKreisEbene, istKreisRangliste, RANKING_FELD_SLUGS } from "../ranking-tiefe";
import { FELD_BY_SLUG } from "../ranking-felder";

describe("Ranglisten-Tiefe", () => {
  it("erkennt die Kreis-Ebene in allen Adressformen", () => {
    // Land + Kreis, mit und ohne Vergleichsfeld, mit und ohne Blaetterseite.
    expect(istKreisEbene(["solar-zubau", "bayern", "landkreis-kelheim"])).toBe(true);
    expect(istKreisEbene(["solar-zubau", "doerfer", "bayern", "landkreis-kelheim"])).toBe(true);
    expect(istKreisEbene(["solar-zubau", "doerfer", "bayern", "landkreis-kelheim", "seite-2"])).toBe(true);
  });

  it("laesst die oberen Ebenen in Ruhe — sie behalten ihre Ablage", () => {
    expect(istKreisEbene(["solar-zubau"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "doerfer"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "bayern"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "doerfer", "bayern"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "doerfer", "bayern", "seite-3"])).toBe(false);
  });

  /**
   * DIE STELLE, AN DER ES SCHIEFGEHEN WUERDE: „kategorie/doerfer" und
   * „kategorie/bayern" sind beide zwei Segmente lang. Wer nur zaehlt, haelt eine
   * Landesliste fuer eine Kreisliste — oder umgekehrt.
   */
  it("unterscheidet Vergleichsfeld und Bundesland, nicht nur die Segmentzahl", () => {
    expect(istKreisEbene(["solar-zubau", "grossstaedte"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "sachsen"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "grossstaedte", "sachsen"])).toBe(false);
    expect(istKreisEbene(["solar-zubau", "sachsen", "landkreis-goerlitz"])).toBe(true);
  });

  it("greift nur unterhalb der Ranglisten-Wurzel", () => {
    expect(istKreisRangliste("/solar-atlas/ranking/solar-zubau/bayern/landkreis-kelheim")).toBe(true);
    expect(istKreisRangliste("/solar-atlas/ranking/solar-zubau/bayern")).toBe(false);
    expect(istKreisRangliste("/solar-atlas/ranking")).toBe(false);
    // Eine Gemeindeseite sieht aehnlich aus und darf NIE erwischt werden — sie
    // ist indexiert und lebt von ihrer Ablage.
    expect(istKreisRangliste("/solar-atlas/bayern/landkreis-kelheim/abensberg")).toBe(false);
  });

  /**
   * Die flache Liste in `ranking-tiefe` existiert nur, damit die Middleware
   * nicht das halbe Datenmodell mitschleppt. Sie ist damit eine zweite
   * Aufschreibung derselben Sache — und nur so lange harmlos, wie dieser Test
   * sie an das Original haelt.
   */
  it("kennt genau die Vergleichsfelder, die es wirklich gibt", () => {
    expect([...RANKING_FELD_SLUGS].sort()).toEqual(Object.keys(FELD_BY_SLUG).sort());
  });

  it("die Weiche steht in der Middleware und schreibt um, statt weiterzuleiten", () => {
    const mw = readFileSync(join(__dirname, "..", "..", "middleware.ts"), "utf8");
    expect(mw).toMatch(/istKreisRangliste\(request\.nextUrl\.pathname\)/);
    expect(mw).toMatch(/ranking-tief/);
    expect(mw).toMatch(/"\/solar-atlas\/ranking\/:pfad\*"/);
  });

  it("die Zwillingsroute legt nichts ab und kopiert die Seite nicht", () => {
    const twin = readFileSync(
      join(__dirname, "..", "..", "app", "(site)", "solar-atlas", "ranking-tief", "[[...pfad]]", "page.tsx"),
      "utf8",
    );
    expect(twin).toMatch(/force-dynamic/);
    expect(twin).not.toMatch(/revalidate/);
    // Wiederverwendung, keine Kopie: Sonst laufen die beiden Ranglisten
    // auseinander, und niemand sieht es.
    expect(twin).toMatch(/export \{ default, generateMetadata \} from/);
  });
});
