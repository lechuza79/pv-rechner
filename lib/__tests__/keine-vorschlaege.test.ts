import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Every field that takes a number (inputMode numeric/decimal) must switch off
// Safari's suggestion bar and autofill. Personal-data fields are exempt:
// there autofill helps (postal code in the lead form keeps "postal-code").
const ROOT = resolve(__dirname, "..", "..");
const AUSNAHMEN = new Set([
  "components/ErgebnisAnBetrieb.tsx", // address form: autofill wanted
]);

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" || name === "admin" ? [] : dateien(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("Zahlenfelder ohne Safari-Vorschläge", () => {
  const funde = ["app", "components"].flatMap((d) => dateien(join(ROOT, d)))
    .map((p) => ({ rel: p.slice(ROOT.length + 1), text: readFileSync(p, "utf8") }))
    .filter(({ rel }) => !AUSNAHMEN.has(rel));

  it("findet überhaupt Zahlenfelder (sonst prüft der Test nichts)", () => {
    const anzahl = funde.reduce((n, f) => n + (f.text.match(/inputMode="(numeric|decimal)"/g)?.length ?? 0), 0);
    expect(anzahl).toBeGreaterThan(5);
  });

  it("jedes Zahlenfeld trägt die Vorschlagssperre", () => {
    const ohne: string[] = [];
    for (const { rel, text } of funde) {
      for (const m of text.matchAll(/inputMode="(numeric|decimal)"/g)) {
        const umgebung = text.slice(m.index!, m.index! + 80);
        if (!umgebung.includes("{...KEINE_VORSCHLAEGE}")) {
          ohne.push(`${rel}:${text.slice(0, m.index).split("\n").length}`);
        }
      }
    }
    expect(ohne).toEqual([]);
  });
});
