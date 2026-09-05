import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { atlasSeitenTitel, ATLAS_TITEL_BUDGET } from "../atlas-titel";
import { BUNDESLAENDER } from "../mastr-regions";
import { ATLAS_CITIES } from "../atlas-cities";

/**
 * Ein zu langer Titel ist von aussen unsichtbar — die Seite funktioniert, der
 * Test ist gruen, und nur in der Ergebnisliste steht ein anderer Titel als der,
 * den wir geschrieben haben.
 *
 * GEMESSEN AM 02.09.2026 an neun Landesseiten (live abgerufene Ergebnisseiten):
 * Bis 60 Zeichen ohne Markenzusatz hat Google unseren Titel unveraendert
 * angezeigt (Bayern 52 … Niedersachsen 60), ab 62 hat er ihn durch die
 * sichtbare Ueberschrift ersetzt (Rheinland-Pfalz 62, Baden-Wuerttemberg 64,
 * Nordrhein-Westfalen 66). Neun von neun, ohne Ausnahme.
 *
 * Betroffen waren damit sechs der sechzehn Landesseiten. Herleitung und
 * Wortwahl: lib/atlas-titel.ts.
 */

const ROOT = join(__dirname, "..", "..");

/** Die Seiten, die einen Atlas-Titel setzen. */
const ATLAS_SEITEN = [
  "app/(site)/solar-atlas/[[...pfad]]/page.tsx",
  "app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx",
];

describe("Atlas-Seitentitel", () => {
  it("bleibt auf jeder Landesseite im gemessenen Budget", () => {
    const zuLang = BUNDESLAENDER.map((bl) => ({
      name: bl.name,
      titel: atlasSeitenTitel({ name: bl.name }),
    })).filter((x) => x.titel.length > ATLAS_TITEL_BUDGET);

    expect(
      zuLang.map((x) => `${x.name}: ${x.titel.length} Zeichen — "${x.titel}"`),
      `Google ersetzt Titel ueber ${ATLAS_TITEL_BUDGET} Zeichen durch die Ueberschrift`,
    ).toEqual([]);
  });

  it("bleibt auch auf der laengsten Ortsseite im Budget", () => {
    // Die Gemeindeseiten benutzen dieselbe Vorlage. Sie sind heute noindex,
    // aber es ist die Gattung, die die Ortsanfragen gewinnen soll — ein Titel,
    // der dort schon beim Livegang verworfen wird, ist kein Start.
    const zuLang = ATLAS_CITIES.map((c) => ({
      name: c.name,
      titel: atlasSeitenTitel({ name: c.name, level: "gemeinde" }),
    })).filter((x) => x.titel.length > ATLAS_TITEL_BUDGET);

    expect(
      zuLang.map((x) => `${x.name}: ${x.titel.length} Zeichen`),
      `Ortsseiten-Titel ueber ${ATLAS_TITEL_BUDGET} Zeichen`,
    ).toEqual([]);
  });

  it("behaelt Reserve — der laengste Titel liegt spuerbar unter der Grenze", () => {
    // „Passt gerade" ist kein Zustand, auf den man bauen kann: Google misst in
    // Pixeln, nicht in Zeichen, und ein „W" ist breiter als ein „i".
    const laengster = Math.max(
      ...BUNDESLAENDER.map((bl) => atlasSeitenTitel({ name: bl.name }).length),
    );
    expect(laengster, "Reserve zur gemessenen Grenze aufgebraucht").toBeLessThanOrEqual(
      ATLAS_TITEL_BUDGET - 4,
    );
  });

  it("tippt keine Atlas-Seite den Titel ein zweites Mal", () => {
    // Genau so ist er entstanden: dieselbe Vorlage in zwei Dateien, beide zu
    // lang, und eine Korrektur haette nur eine der beiden erreicht.
    const treffer: string[] = [];
    for (const p of ATLAS_SEITEN) {
      const src = readFileSync(join(ROOT, p), "utf-8");
      // Eine getippte Titel-Vorlage: `title:` mit einem Template-String, der mit
      // einem der Leitwoerter beginnt — statt eines Aufrufs von atlasSeitenTitel.
      const m = src.match(/title:\s*`(Photovoltaik|Solaranlagen|Solaratlas)[^`]*`/);
      if (m) treffer.push(`${p}: ${m[0]}`);
    }
    expect(treffer, "Titel-Vorlage steht ein zweites Mal im Code").toEqual([]);
  });
});
