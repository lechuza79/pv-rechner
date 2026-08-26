import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ATLAS_REVALIDATE_ROUTEN,
  REVALIDATE_PFLICHT_AB_SEKUNDEN,
} from "../atlas-revalidate-routen";

/**
 * DIE INVALIDIERUNGS-LISTE DARF NICHT STILL VERALTEN.
 *
 * Seit dem 26.08.2026 halten die Atlas-Seiten laenger als ihr Datentakt, und die
 * neuen Zahlen werden nur sichtbar, weil der Datenlauf sie aktiv fuer ungueltig
 * erklaert. Damit haengt die Richtigkeit von 11.000 Seiten an einer Liste von
 * Routenmustern — und die kann auf zwei Arten kaputtgehen, beide unsichtbar:
 *
 *   1. Eine Route wird umbenannt oder verschoben. Das Muster in der Liste zeigt
 *      dann ins Leere. `revalidatePath` wirft dabei NICHT — es passt schlicht
 *      auf nichts, und die Seiten behalten ihre alten Zahlen.
 *   2. Eine neue Seite bekommt eine lange Haltbarkeit und wird vergessen. Sie
 *      faellt aus dem Datenlauf heraus, ohne dass irgendwo etwas rot wird.
 *
 * Beides faellt im Browser nicht auf: Die Seite ist schnell, vollstaendig und
 * plausibel — sie zeigt nur den Vormonat. Deshalb dieser Test.
 */

const APP = path.join(__dirname, "..", "..", "app");

/** Routenmuster -> Datei, die diese Route rendert. */
function seitenDatei(routenMuster: string): string {
  // Die Atlas-Seiten liegen alle in der Route-Gruppe "(site)".
  return path.join(APP, "(site)", routenMuster.replace(/^\//, ""), "page.tsx");
}

/** Alle Seiten unter (site) einsammeln, mit ihrem Routenmuster. */
function alleSeiten(): { muster: string; datei: string; quelle: string }[] {
  const wurzel = path.join(APP, "(site)");
  const treffer: { muster: string; datei: string; quelle: string }[] = [];

  function lauf(dir: string) {
    for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, eintrag.name);
      if (eintrag.isDirectory()) {
        lauf(p);
      } else if (eintrag.name === "page.tsx") {
        const muster = "/" + path.relative(wurzel, dir).split(path.sep).join("/");
        treffer.push({ muster, datei: p, quelle: fs.readFileSync(p, "utf8") });
      }
    }
  }
  lauf(wurzel);
  return treffer;
}

/** Liest `export const revalidate = <zahl>` aus einer Seitenquelle. */
function haltbarkeit(quelle: string): number | null {
  const m = quelle.match(/export\s+const\s+revalidate\s*=\s*(\d[\d_]*)/);
  return m ? Number(m[1].replace(/_/g, "")) : null;
}

describe("Atlas-Invalidierung: die Liste muss zur Wirklichkeit passen", () => {
  it("jedes Routenmuster in der Liste zeigt auf eine echte Seite", () => {
    for (const muster of ATLAS_REVALIDATE_ROUTEN) {
      const datei = seitenDatei(muster);
      expect(
        fs.existsSync(datei),
        `Das Muster "${muster}" zeigt auf keine Seite. Wurde die Route umbenannt? ` +
          `Dann erklaert der Datenlauf nichts mehr fuer ungueltig, und die Seite zeigt weiter alte Zahlen.`
      ).toBe(true);
    }
  });

  it("jede Seite mit langer Haltbarkeit steht in der Liste", () => {
    const vergessen = alleSeiten()
      .map((s) => ({ ...s, ttl: haltbarkeit(s.quelle) }))
      .filter((s) => s.ttl !== null && s.ttl > REVALIDATE_PFLICHT_AB_SEKUNDEN)
      .filter((s) => !ATLAS_REVALIDATE_ROUTEN.includes(s.muster as never))
      .map((s) => `${s.muster} (Haltbarkeit ${s.ttl} s)`);

    expect(
      vergessen,
      "Diese Seiten halten laenger als einen Tag, werden aber nach dem Datenlauf " +
        "nicht fuer ungueltig erklaert — sie wuerden veraltete Zahlen zeigen. " +
        "Entweder in ATLAS_REVALIDATE_ROUTEN aufnehmen, oder die Haltbarkeit senken:\n" +
        vergessen.join("\n")
    ).toEqual([]);
  });

  it("die Foerderseiten stehen bewusst NICHT drin", () => {
    // Ihre Daten bewegen sich taeglich (auslaufende Programme, Vierzehn-Tage-
    // Fristen). Sie hier aufzunehmen wuerde einen monatlichen Takt suggerieren,
    // wo ein stuendlicher gilt — und der Releaseplan schaltet Ortsseiten
    // schubweise frei, was eine kurze Haltbarkeit ebenfalls braucht.
    const foerder = ATLAS_REVALIDATE_ROUTEN.filter((r) => r.includes("foerderung"));
    expect(foerder).toEqual([]);
  });

  it("die Foerderseiten behalten eine kurze Haltbarkeit", () => {
    const zuLang = alleSeiten()
      .filter((s) => s.muster.startsWith("/photovoltaik-foerderung"))
      .map((s) => ({ muster: s.muster, ttl: haltbarkeit(s.quelle) }))
      .filter((s) => s.ttl !== null && s.ttl > REVALIDATE_PFLICHT_AB_SEKUNDEN);

    expect(
      zuLang.map((s) => `${s.muster} (${s.ttl} s)`),
      "Foerderseiten duerfen nicht laenger als einen Tag halten: Ein ausgelaufenes " +
        "Programm wuerde sonst weiter Geld abziehen, und der Releaseplan koennte " +
        "Ortsseiten nicht schubweise freischalten."
    ).toEqual([]);
  });
});
