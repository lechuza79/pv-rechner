import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GROESSENKLASSEN, GROESSENKLASSEN_WARUM, spanneVon } from "../gemeindegroesse";

//
// EINE QUELLE FÜR DIE ERKLÄRUNG DER GRÖSSENKLASSEN.
//
// Am 20.08.2026 stand die Begründung in drei handgetippten Fassungen im Code —
// zweimal auf den Ranglisten-Seiten, einmal auf der Atlas-Übersicht — und keine
// davon nannte die Klassen selbst. Wer eine Einteilung erklärt, ohne sie zu
// zeigen, erklärt nichts: „Gemeinden und Kleinstädte" verrät die Grenze nicht.
//
// Dieselbe Systematik wie bei den Einheiten-Formatierern und der Bio-Treppe:
// Zwei Fassungen driften, und niemand merkt es, weil beide für sich stimmig
// aussehen.

const WURZEL = path.join(__dirname, "..", "..");

function dateien(): string[] {
  const raus = new Set(["node_modules", ".next", ".next-dev", ".git", "docs", "scripts", "e2e"]);
  const treffer: string[] = [];
  const lauf = (ordner: string) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      if (e.name.startsWith(".") || raus.has(e.name)) continue;
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) lauf(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !p.includes("__tests__")) treffer.push(p);
    }
  };
  lauf(WURZEL);
  return treffer;
}

describe("Größenklassen: Erklärung und Grenzen", () => {
  it("die Begründung steht genau einmal im Code", () => {
    // Geprüft wird die AUSSAGE, nicht der Satz: Wer sie neu formuliert, trifft
    // den Wortlaut ohnehin nicht — aber „Großstädte gegen … Dörfer" schreibt
    // niemand, der nicht genau das erklären will.
    const muster = /Großstädte gegen Großstädte[^.]*Dörfer/;
    const gefunden = dateien().filter((f) => {
      const inhalt = fs.readFileSync(f, "utf-8");
      // Die Quelle selbst zählt nicht als Kopie.
      if (f.endsWith(path.join("lib", "gemeindegroesse.ts"))) return false;
      return muster.test(inhalt);
    });
    expect(gefunden.map((f) => path.relative(WURZEL, f))).toEqual([]);
  });

  it("keine Einwohner-Grenze wird neben der Einteilung getippt", () => {
    // „5.000–19.999 Einwohner" gehört an genau eine Stelle. Eine zweite Fassung
    // überlebt den nächsten Zuschnitt nicht — und sie sieht bis dahin richtig aus.
    const spannen = GROESSENKLASSEN.map(spanneVon);
    const gefunden: string[] = [];
    for (const f of dateien()) {
      if (f.endsWith(path.join("lib", "gemeindegroesse.ts"))) continue;
      const inhalt = fs.readFileSync(f, "utf-8");
      for (const s of spannen) {
        if (inhalt.includes(`${s} Einwohner`)) gefunden.push(`${path.relative(WURZEL, f)}: ${s}`);
      }
    }
    expect(gefunden).toEqual([]);
  });

  it("die Erklärung nennt den Grund, nicht nur die Regel", () => {
    // „Verglichen wird nach Größenklasse" ist eine Ansage. Der Leser braucht
    // das Warum, sonst hält er die Einteilung für Willkür.
    expect(GROESSENKLASSEN_WARUM).toMatch(/Dorf|Dörfer/);
    expect(GROESSENKLASSEN_WARUM).toMatch(/Großstadt|Großstädte/);
    expect(GROESSENKLASSEN_WARUM.length).toBeGreaterThan(80);
  });

  it("jede Klasse hat eine lesbare Spanne", () => {
    for (const k of GROESSENKLASSEN) {
      expect(spanneVon(k), k.slug).toMatch(/\d/);
    }
    // Die Klassen decken lückenlos ab: Das Maximum der einen ist das Minimum
    // der nächsten. Eine Lücke hiesse, dass Orte in keiner Liste stehen.
    for (let i = 1; i < GROESSENKLASSEN.length; i++) {
      expect(GROESSENKLASSEN[i].min, GROESSENKLASSEN[i].slug).toBe(GROESSENKLASSEN[i - 1].max);
    }
  });
});
