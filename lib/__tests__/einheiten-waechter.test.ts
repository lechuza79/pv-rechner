import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen handgeschriebene Einheiten.
 *
 * Der Anlass: "kW" statt "kWp" stand monatelang auf jeder Atlas-Seite, weil
 * derselbe Formatter sechsmal kopiert worden war — fünf Kopien liefen falsch, und
 * aufgefallen ist es einem Nutzer im Screenshot, nicht uns. Eine falsche Einheit
 * ist der schwerste Fehler, den diese Seite machen kann: sie fällt niemandem auf
 * und kostet genau das, womit die Seite wirbt.
 *
 * Der Test verbietet deshalb nicht die falsche Einheit, sondern die Bauweise, die
 * sie ermöglicht: eine Zahl, an die im Text direkt eine Einheit geklebt wird.
 * Einheiten kommen aus lib/atlas-format.ts. Wo das im Einzelfall nicht geht,
 * steht der Fall unten mit Begründung — dann ist es eine Entscheidung und kein
 * Versehen.
 */

const ROOT = join(__dirname, "..", "..");

/** Oberflächen, die MaStR-Zahlen zeigen. */
const VERZEICHNISSE = [
  "components/atlas",
  "app/(site)/solar-atlas",
  "app/(embed)/embed/gemeinde-solar",
  "app/(embed)/embed/gemeinde-erneuerbare",
  "app/(embed)/embed/gemeinde-solarleistung",
  "app/(embed)/embed/region-anlagentyp",
  "app/(embed)/embed/region-solarleistung",
  "app/(embed)/embed/kennzahl",
];
const EINZELDATEIEN = [
  "lib/gemeinde-highlight.ts",
  "components/MastrHeroSection.tsx",
  // Die Landes-Karten zeigen denselben MaStR-Bestand wie die Gemeinde-Karten,
  // lagen aber außerhalb des Suchpfads — genau dort stand „GW" über einer
  // Photovoltaik-Nennleistung, die GWp ist.
  "components/RegionAnlagentypWidget.tsx",
  "components/RegionSolarLive.tsx",
];

/**
 * `${…} kWh` — eine Zahl mit direkt angeklebter Einheit. Seit den
 * Wirkungs-Spalten der Ranking-Tabelle gehören auch Tonnen, Euro, Cent und
 * Kilogramm dazu — ihre Formatter leben ebenfalls in lib/atlas-format.ts.
 */
const ANGEKLEBT = /\}\s*((kWp|MWp|GWp|kWh|MWh|GWh|kW|MW|GW|Wp|W|kg|t|ct)\b|€)/g;

/**
 * Begründete Ausnahmen. Jede Zeile hier ist eine bewusste Entscheidung:
 * die Einheit hängt an einer Auswahl (Energieträger) oder beschreibt etwas
 * anderes als installierte Photovoltaik.
 */
const ERLAUBT: { fragment: string; grund: string }[] = [
  { fragment: "MW${peak}", grund: "Einheit folgt dem gewählten Energieträger (Solar → MWp, sonst MW)" },
  { fragment: "GW${peak}", grund: "wie oben, eine Größenordnung höher" },
  { fragment: "kW${peak}", grund: "⌀ Anlagengröße, folgt ebenfalls dem Energieträger" },
  { fragment: "} MW`", grund: "Momentanleistung der Live-Simulation und Technologie-Mix — kein Peak" },
  { fragment: "} kW`", grund: "Technologie-Mix unterhalb 1 MW — kein Peak" },
];

function dateienUnter(rel: string): string[] {
  const abs = join(ROOT, rel);
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) out.push(voll);
    }
  };
  if (statSync(abs).isDirectory()) lauf(abs);
  else out.push(abs);
  return out;
}

describe("Wächter: keine handgeschriebenen Einheiten", () => {
  it("klebt nirgends eine Einheit an eine Zahl, außer mit Begründung", () => {
    const dateien = [...VERZEICHNISSE, ...EINZELDATEIEN].flatMap(dateienUnter);
    expect(dateien.length).toBeGreaterThan(10);

    const funde: string[] = [];
    for (const datei of dateien) {
      const zeilen = readFileSync(datei, "utf8").split("\n");
      zeilen.forEach((zeile, i) => {
        ANGEKLEBT.lastIndex = 0;
        if (!ANGEKLEBT.test(zeile)) return;
        if (ERLAUBT.some((a) => zeile.includes(a.fragment))) return;
        funde.push(`${datei.slice(ROOT.length + 1)}:${i + 1}  ${zeile.trim()}`);
      });
    }

    // Bei einem Treffer: die Einheit gehört nach lib/atlas-format.ts. Ist der
    // Fall wirklich anders, kommt er mit Begründung in ERLAUBT — nicht einfach
    // die Regex aufweichen.
    expect(funde).toEqual([]);
  });
});
