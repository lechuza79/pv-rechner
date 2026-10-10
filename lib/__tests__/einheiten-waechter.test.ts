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
  // Derselbe Fall eine Ebene höher: Fließtext mit MaStR-Zahlen, entstanden
  // 18.08.2026. Eine Prosadatei ohne Wächter ist genau der Ort, an dem die
  // nächste handgeschriebene Einheit landet.
  "lib/region-highlight.ts",
  "components/MastrHeroSection.tsx",
  // Die Landes-Karten zeigen denselben MaStR-Bestand wie die Gemeinde-Karten,
  // lagen aber außerhalb des Suchpfads — genau dort stand „GW" über einer
  // Photovoltaik-Nennleistung, die GWp ist.
  "components/RegionAnlagentypWidget.tsx",
  "components/RegionSolarLive.tsx",
  // Die Regionsseiten (Deutschland, Länder, Kreise) seit 09/2026: Der Donut trug
  // „MWp" fest verdrahtet und sagte Screenreadern „kWp" — gefunden erst im Audit
  // der Produktion, weil keine dieser Dateien im Suchpfad lag.
  "components/landkreis",
  "components/charts/ShareDonut.tsx",
  "components/charts/CompositionChart.tsx",
  "components/dashboard/KpiOverview.tsx",
];

/**
 * `${…} kWh` — eine Zahl mit direkt angeklebter Einheit. Seit den
 * Wirkungs-Spalten der Ranking-Tabelle gehören auch Tonnen, Euro, Cent und
 * Kilogramm dazu — ihre Formatter leben ebenfalls in lib/atlas-format.ts.
 *
 * Das Prozentzeichen zählt nur in der ANZEIGE-Form, also mit Leerzeichen davor
 * (`${wert} %`, deutsche Typografie nach DIN 5008). Ohne Leerzeichen ist es
 * keine Einheit, sondern eine CSS-Länge — `width: ${pct}%`, `color-mix(… 10%)` —
 * und die muss erlaubt bleiben: Sie steht in einem Stil-Wert, nicht in einem
 * Satz, und es gibt für sie nichts zu formatieren. Die Trennung geht ohne
 * Sonderfallliste auf, weil beide Formen sich genau in diesem Leerzeichen
 * unterscheiden.
 *
 * Das Euro-Zeichen braucht einen eigenen Zweig: `\b` greift hinter einem
 * Nicht-Wortzeichen nicht. Es steht bewusst unter `\s*` und nicht unter `\s+`,
 * sonst rutschte `${x}€` durch.
 */
const ANGEKLEBT = /\}(?:\s*(?:kWp|MWp|GWp|kWh|MWh|GWh|kW|MW|GW|Wp|W|kg|t|ct)\b|\s*€|\s+%)/g;

/**
 * Generated prose on town pages and in posts (09.10.2026). The energy-year
 * story said "20.105 kW Windleistung" — five digits in kW for a town total.
 * Rule: installed capacity and energy of a PLACE go through the scaling
 * formatters (kW → MW → GW, kWp → MWp, MWh → GWh). Values of ONE plant or per
 * head stay in kW/kWp/kWh and are listed in ERLAUBT. Narrower than ANGEKLEBT:
 * percent and euro in these texts are not part of this rule.
 */
const PROSA_DATEIEN = [
  "lib/story-energy-year.ts",
  "lib/story-copy.ts",
  "lib/story-city-sets.ts",
  "lib/orts-stories.ts",
  "lib/social-posts.ts",
  "lib/social-funde.ts",
  "lib/awards.ts",
];
const LEISTUNG_ENERGIE = /\}\s*(?:kWp|MWp|GWp|kWh|MWh|GWh|TWh|kW|MW|GW|Wp|W)\b/g;

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
  { fragment: "im Schnitt ${alt.toLocaleString", grund: "mittlere Größe EINER Anlage — kWp ist hier die lesbare Einheit" },
  { fragment: "waren es ${neu.toLocaleString", grund: "wie oben, derselbe Satz" },
  { fragment: "im Durchschnitt ${number(mean)} kWp", grund: "mittlere Anlagengröße" },
  { fragment: "${number(top.wert / top.count)} kWp", grund: "mittlere Anlagengröße" },
  { fragment: "${precise(min)} bis ${precise(max)} kWp", grund: "Spanne einzelner Anlagen" },
  { fragment: "jeweils ${precise(min)} kWp", grund: "Größe einzelner Anlagen" },
  { fragment: "Mittlere Größe ${de(c.mittlereKwp", grund: "mittlere Anlagengröße" },
  { fragment: "Dachanlage war ${frueh.year}", grund: "typische Größe einer Dachanlage" },
  { fragment: "kWh je Einwohner", grund: "spezifischer Wert je Kopf, kein Bestand" },
  { fragment: "kWh je kWp", grund: "spezifischer Ertrag, kein Bestand" },
  { fragment: "Anlage bis ${de(satz.thresholdKwp)} kW", grund: "gesetzliche Größengrenze einer Anlage" },
  { fragment: "(≤ ${de(satz.thresholdKwp)} kWp)", grund: "gesetzliche Größengrenze einer Anlage" },
  { fragment: "`${signed(result.percent,1)} %`", grund: "relative Veränderung mit Vorzeichen in der Kennzahl-Übersicht — kein Anteil, kein atlas-format-Fall" },
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

  it("nennt Leistung und Energie eines Ortes in Texten in der lesbaren Größenordnung", () => {
    const funde: string[] = [];
    for (const datei of PROSA_DATEIEN.flatMap(dateienUnter)) {
      readFileSync(datei, "utf8").split("\n").forEach((zeile, i) => {
        LEISTUNG_ENERGIE.lastIndex = 0;
        if (!LEISTUNG_ENERGIE.test(zeile)) return;
        if (ERLAUBT.some((a) => zeile.includes(a.fragment))) return;
        funde.push(`${datei.slice(ROOT.length + 1)}:${i + 1}  ${zeile.trim()}`);
      });
    }
    expect(funde).toEqual([]);
  });
});
