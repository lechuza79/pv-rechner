import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { paramFloatOrNull, vollEinspeisungGesperrt } from "../calc";
import { EINSPEISESATZ_MAX_CT } from "../constants";

// ─── Rechenmodell-Council 05.09.2026: drei Fehler im PV-Rechner ──────────────
//
// Alle drei sind von außen unsichtbar — die Seite reagiert, zeigt plausible
// Zahlen, kein Test wird rot:
//
// 1. VOLLEINSPEISUNG MIT SPEICHER war wählbar. Der Rechner setzte den
//    Eigenverbrauch auf 0, rechnete aber Kaufpreis (18.000 statt 14.000 €) und
//    Akkutausch (2.363 €) mit und zeigte die Autarkie eines Teileinspeisers
//    (81 % bei 10 kWh). 6.363 € Gewinn weniger für ein Gerät, das nichts tut.
// 2. TEILEN-LINK, SPEICHER 0 kWh: `paramFloat(...) || null` machte aus der
//    eingetragenen 0 die Flow-Vorgabe (10 kWh). Empfänger: +4.000 € Investition,
//    +11.378 € Gewinn auf demselben Link.
// 3. TEILEN-LINK, EIGENER SATZ > 20 ct: Das Feld erlaubte 60, der Link nur 20.
//    Ein Bescheid von 2010 (39 ct) kam beim Empfänger als 7,7 ct an — Gewinn
//    69.862 € gegen 26.192 €.

describe("Volleinspeisung ist ein ganzer Fall", () => {
  it("sperrt Volleinspeisung, sobald etwas den Strom selbst verbraucht", () => {
    expect(vollEinspeisungGesperrt({ wp: "nein", ea: "nein", speicherKwh: 0 })).toBe(false);
    expect(vollEinspeisungGesperrt({ wp: "nein", ea: "nein", speicherKwh: 5 })).toBe(true);
    expect(vollEinspeisungGesperrt({ wp: "ja", ea: "nein", speicherKwh: 0 })).toBe(true);
    expect(vollEinspeisungGesperrt({ wp: "nein", ea: "ja", speicherKwh: 0 })).toBe(true);
  });
});

describe("Ein von Hand gesetzter Wert überlebt den Teilen-Link", () => {
  it("eine eingetragene 0 bleibt 0, ein fehlender Parameter bleibt null", () => {
    expect(paramFloatOrNull({ sk: "0" }, "sk", 0, 30)).toBe(0);
    expect(paramFloatOrNull({ sk: "7.5" }, "sk", 0, 30)).toBe(7.5);
    expect(paramFloatOrNull({}, "sk", 0, 30)).toBeNull();
    expect(paramFloatOrNull(undefined, "sk", 0, 30)).toBeNull();
    expect(paramFloatOrNull({ sk: "abc" }, "sk", 0, 30)).toBeNull();
    expect(paramFloatOrNull({ sk: "31" }, "sk", 0, 30)).toBeNull();
  });

  it("die Obergrenze des eigenen Satzes reicht für historische Bescheide", () => {
    expect(EINSPEISESATZ_MAX_CT).toBeGreaterThanOrEqual(50);
  });
});

// ─── Die Gegenprobe: benutzt der Rechner das auch? ───────────────────────────
//
// Die Funktionen oben sind rein und leicht grün. Der Fehler saß in der Seite,
// die sie NICHT aufrief. Geprüft wird deshalb die Verwendung.
describe("Der PV-Rechner benutzt die Regeln", () => {
  const seite = readFileSync(resolve(__dirname, "../../app/(site)/photovoltaik-rechner/rechner.tsx"), "utf-8");
  const regime = readFileSync(resolve(__dirname, "../../app/(site)/photovoltaik-rechner/_components/ResultRegime.tsx"), "utf-8");

  it("die Voll-Sperre kommt aus der geteilten Regel und kennt den Speicher", () => {
    expect(seite).toMatch(/vollDisabled = vollEinspeisungGesperrt\(\{[^}]*speicherKwh/);
  });

  it("bei Volleinspeisung ist die Autarkie null", () => {
    expect(seite).toMatch(/autarkie = effEinspeisungModus === "voll" \? 0 :/);
  });

  it("der Speicher aus dem Link wird ohne „|| null“ gelesen", () => {
    expect(seite).toMatch(/paramFloatOrNull\(initialParams, "sk"/);
    expect(seite).not.toMatch(/"sk"[^\n]*\|\| null/);
  });

  it("Eingabefeld und Link teilen sich die Obergrenze des eigenen Satzes", () => {
    expect(seite).toMatch(/n <= EINSPEISESATZ_MAX_CT/);
    expect(regime).toMatch(/max=\{EINSPEISESATZ_MAX_CT\}/);
    expect(regime).not.toMatch(/max=\{60\}/);
  });
});
