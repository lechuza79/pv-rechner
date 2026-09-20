import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ogRechnung, OG_NICHT_GELESEN } from "../og-rechnung";
import { SHARE_KEYS } from "../share-keys";
import { SPEICHER } from "../constants";

// Das geteilte Vorschaubild rechnet mit dem Link, den der Rechner baut.
//
// Gefunden 12.09.2026: Das Bild las elf Schlüssel des Teilen-Links nicht. Der
// Reiter „Optimistisch" stand im Link und nicht im Bild (22.236 € auf der Seite,
// 10.548 € im Bild), die Konditionen ab 2027 kippten sogar das Vorzeichen.

const ROOT = join(__dirname, "..", "..");
const BASIS = { a: "2", s: "0", p: "1", n: "1", wp: "nein", ea: "nein", kl: "nein", st: "0.35", eia: "1", er: "1050" };

describe("Das Vorschaubild liest den ganzen Teilen-Link", () => {
  it("jeder Schlüssel wird gelesen oder mit Grund ausgenommen", () => {
    const quelle = readFileSync(join(ROOT, "lib/og-rechnung.ts"), "utf8");
    const gelesen = (k: string) =>
      new RegExp(`params(?:\\.${k}\\b|,\\s*"${k}"|\\[\\s*"${k}"\\s*\\])`).test(quelle);
    const fehlt = SHARE_KEYS.filter((k) => !gelesen(k) && !(k in OG_NICHT_GELESEN));
    expect(fehlt, "Diese Schlüssel des Teilen-Links rechnet das Bild nicht mit").toEqual([]);
    // Und eine Ausnahme, die längst gelesen wird, ist eine veraltete Begründung.
    for (const k of Object.keys(OG_NICHT_GELESEN)) {
      expect(SHARE_KEYS, `„${k}" ist ausgenommen, steht aber nicht im Teilen-Link`).toContain(k);
    }
  });

  it("der Szenario-Reiter bewegt den Gewinn in die richtige Richtung", () => {
    const pess = ogRechnung({ ...BASIS, sc: "pessimistic" }).gewinn25;
    const real = ogRechnung(BASIS).gewinn25;
    const opt = ogRechnung({ ...BASIS, sc: "optimistic" }).gewinn25;
    expect(pess).toBeLessThan(real);
    expect(opt).toBeGreaterThan(real);
  });

  it("von Hand gesetzter Verbrauch und Speicher kommen an", () => {
    expect(ogRechnung({ ...BASIS, vb: "6000" }).gewinn25).toBeGreaterThan(ogRechnung(BASIS).gewinn25);
    expect(ogRechnung({ ...BASIS, sk: "12" }).spKwh).toBe(12);
  });

  it("jeder Speicher der Liste ist erreichbar, nicht nur die ersten vier", () => {
    for (let i = 0; i < SPEICHER.length; i++) {
      expect(ogRechnung({ ...BASIS, s: String(i) }).spKwh, `s=${i}`).toBe(SPEICHER[i].kwh);
    }
  });

  it("die Konditionen ab 2027 rechnen mit", () => {
    const heute = ogRechnung(BASIS).gewinn25;
    const reform = ogRechnung({ ...BASIS, rg: "2027" }).gewinn25;
    expect(reform).not.toBe(heute);
    expect(ogRechnung({ ...BASIS, rg: "2027", mk: "1" }).gewinn25).toBeGreaterThanOrEqual(reform);
  });

  it("die Klimaanlage erhöht den Verbrauch, auch ohne übernommene Kühlmenge", () => {
    expect(ogRechnung({ ...BASIS, kl: "ja", klr: "3" }).ev).toBeGreaterThan(ogRechnung(BASIS).ev);
  });
});
