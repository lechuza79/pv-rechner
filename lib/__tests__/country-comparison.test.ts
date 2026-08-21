import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  YEARS_ANTEIL,
  YEARS_ZUBAU,
  YEARS_PERCAPITA,
  WINDSOLAR_SHARE_SERIES,
  CO2_INTENSITY_COMPARE_SERIES,
  PERCAPITA_SERIES,
  ZUBAU_BY_COUNTRY,
  COUNTRY_COMPARE_META,
} from "../country-comparison";

// Die Länderreihen werden erzeugt (scripts/ember-laender-sync.ts), nicht
// gepflegt. Geprüft wird deshalb, was ein Lauf kaputt machen kann: eine Reihe,
// die nicht mehr zu ihrer Jahresachse passt — im Chart sieht man das nicht, dort
// verrutschen die Werte einfach um ein Jahr.
describe("Länderreihen und ihre Jahresachsen", () => {
  const paare: [string, number[], { label: string; values: number[] }[]][] = [
    ["Anteil Wind + Solar", YEARS_ANTEIL, WINDSOLAR_SHARE_SERIES],
    ["CO₂-Intensität", YEARS_ANTEIL, CO2_INTENSITY_COMPARE_SERIES],
    ["Pro Kopf", YEARS_PERCAPITA, PERCAPITA_SERIES],
  ];

  paare.forEach(([name, jahre, reihen]) => {
    it(`${name}: jede Länderreihe hat genau ein Wert je Jahr`, () => {
      expect(reihen.length).toBeGreaterThan(0);
      reihen.forEach((r) => {
        expect(`${r.label}: ${r.values.length}`).toBe(`${r.label}: ${jahre.length}`);
      });
    });
  });

  it("Zubau: beide Techniken decken die Zubau-Jahre ab", () => {
    ZUBAU_BY_COUNTRY.forEach((c) => {
      expect(`${c.label} EE: ${c.windsolar.length}`).toBe(`${c.label} EE: ${YEARS_ZUBAU.length}`);
      expect(`${c.label} Atom: ${c.nuclear.length}`).toBe(`${c.label} Atom: ${YEARS_ZUBAU.length}`);
    });
  });

  it("die Jahresachsen sind lückenlos und aufsteigend", () => {
    [YEARS_ANTEIL, YEARS_ZUBAU, YEARS_PERCAPITA].forEach((jahre) => {
      jahre.forEach((j, i) => i > 0 && expect(j).toBe(jahre[i - 1] + 1));
    });
  });

  it("die Pro-Kopf-Reihe darf zurückliegen, aber nicht vorauseilen", () => {
    // Sie wächst nicht mit (Ember führt die Einwohnerzahl nicht mehr).
    // Andersherum wäre es ein Fehler: dann fehlte den anderen ein Jahr.
    expect(YEARS_PERCAPITA[YEARS_PERCAPITA.length - 1]).toBeLessThanOrEqual(
      YEARS_ANTEIL[YEARS_ANTEIL.length - 1],
    );
  });

  it("der angeschriebene Stand ist das letzte Jahr der Reihen", () => {
    // Er steht als „Stand" am Quellenvermerk jedes geteilten Bildes.
    expect(COUNTRY_COMPARE_META.dataAsOf).toBe(String(YEARS_ANTEIL[YEARS_ANTEIL.length - 1]));
    expect(COUNTRY_COMPARE_META.dataAsOf).toBe(String(YEARS_ZUBAU[YEARS_ZUBAU.length - 1]));
  });

  it("die Einordnung behauptet keine Einzigartigkeit, die die Daten nicht hergeben", () => {
    const welt = ZUBAU_BY_COUNTRY.find((c) => c.label === "Welt")!.windsolar;
    const rueckgaenge = welt.filter((w, i) => i > 0 && w < welt[i - 1]).length;
    // Sobald es mehr als einen Rückgang gibt, ist „der einzige Rückgang" falsch.
    // Der Text sagt deshalb „der jüngste" — und der Code sucht auch den.
    const seite = readFileSync(join(process.cwd(), "app/(site)/laendervergleich/client.tsx"), "utf8");
    const absatz = seite.slice(seite.indexOf("function ZubauEinordnung"));
    if (rueckgaenge > 1) expect(absatz).not.toMatch(/einzige[rn]? Rückgang/);
    expect(absatz).toMatch(/jüngste Rückgang/);
  });

  it("die Einordnung rechnet ihre Zahlen, statt sie zu tippen", () => {
    const seite = readFileSync(join(process.cwd(), "app/(site)/laendervergleich/client.tsx"), "utf8");
    const absatz = seite.slice(
      seite.indexOf("function ZubauEinordnung"),
      seite.indexOf("function ChartHead"),
    );
    // Keine getippte Jahreszahl und kein getippter GW-Wert: beides veraltet
    // beim nächsten Datenlauf, ohne dass es jemand merkt. Kommentare zählen
    // nicht mit — dort dürfen Beispieljahre stehen, sie erreichen niemanden.
    const ohneKommentare = absatz
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    expect(ohneKommentare).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(ohneKommentare).not.toMatch(/\d+\s*GW/);
  });

  it("das Widget schreibt den Zeitraum aus den Daten, nicht aus dem Text", () => {
    const client = readFileSync(
      join(process.cwd(), "app/(embed)/embed/zubau-erneuerbare-atom/client.tsx"),
      "utf8",
    );
    // „Zubau gesamt 2010–2024" stand dort getippt — nach dem ersten Datenlauf
    // hätte die Summe darunter ein Jahr mehr enthalten als die Überschrift nennt.
    expect(client).not.toMatch(/Zubau gesamt \d{4}/);
    expect(client).toContain("{ERSTES_JAHR}–{LETZTES_JAHR}");
  });
});
