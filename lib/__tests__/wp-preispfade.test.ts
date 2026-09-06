import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_HEATPUMP_CONFIG, STROM_PFAD, GAS_PFAD } from "../heatpump-config";
import { heatPumpScenarioAdj, calcHeatPumpScenarios, type HeatPumpInputs } from "../heatpump";

/**
 * Der Realitäts-Anker der sechs Preispfade.
 *
 * ANLASS: Am 06.09.2026 liefen 3.253 Tests grün, während die Preispfade
 * dreimal binnen zweier Tage geändert worden waren — keine einzige Prüfung
 * hing an ihnen. Sechs Zahlen, die jedes Ergebnis dieses Rechners tragen, und
 * niemand hätte gemerkt, wenn eine davon verrutscht.
 *
 * Der Test rechnet die Raten aus den TABELLENWERTEN der beiden Quellen neu und
 * hält sie gegen die Konstanten. Er prüft damit die Herleitung, nicht die
 * Konstante gegen sich selbst — der Fehler, an dem am 01.09.2026 zwei Wächter
 * an einem Tag gescheitert sind.
 *
 * Die Quellenwerte unten sind am 06.09.2026 im Volltext gelesen:
 *   docs/quellen/UBA-Rahmendaten-THG-Projektionen-2026.pdf (Tabellen 3, 12, 13)
 *   docs/quellen/Fraunhofer-ISE-Biotreppe-GModG-2026-06.pdf (Folien 17, 19, 21, 22)
 */

// ── UBA, Tabelle 3: Preisindex Bruttoinlandsprodukt (2024 = 100) ────────────
const IDX: Record<number, number> = { 2024: 100.0, 2030: 118.2, 2035: 131.0, 2040: 143.4, 2045: 156.0 };

/** Geometrische Interpolation zwischen den Stützstellen der Tabelle. */
function index(jahr: number): number {
  if (IDX[jahr] !== undefined) return IDX[jahr];
  const stellen = Object.keys(IDX).map(Number);
  const unten = Math.max(...stellen.filter((j) => j < jahr));
  const oben = Math.min(...stellen.filter((j) => j > jahr));
  return IDX[unten] * Math.pow(IDX[oben] / IDX[unten], (jahr - unten) / (oben - unten));
}

/** Jährliche Teuerung zwischen zwei Jahren — real wird damit zu nominal. */
const deflator = (von: number, bis: number) => Math.pow(index(bis) / index(von), 1 / (bis - von)) - 1;
const rate = (a: number, b: number, jahre: number) => Math.pow(b / a, 1 / jahre) - 1;
const nominal = (real: number, von: number, bis: number) => (1 + real) * (1 + deflator(von, bis)) - 1;

describe("Preispfade: die Herleitung aus den Quellen", () => {
  it("leitet den Deflator aus der amtlichen Tabelle ab", () => {
    // Ohne ihn ist jede reale Studienrate um gut zwei Punkte zu niedrig
    // angesetzt — dieser Rechner zinst nominal auf.
    expect(deflator(2025, 2045) * 100).toBeCloseTo(2.106, 2);
    expect(deflator(2026, 2045) * 100).toBeCloseTo(2.068, 2);
  });

  it("rechnet den optimistischen Strompfad aus der amtlichen Projektion nach", () => {
    // Prognos/UBA, Tabelle 13, Wärmepumpentarif Haushalte inkl. MwSt.,
    // ct(2024)/kWh. Der Tarif fällt real — das ist der Grund, warum die
    // amtliche Projektion unser GÜNSTIGSTER Pfad ist und nicht die Mitte.
    const real = rate(27.4, 20.5, 20);
    expect(real * 100).toBeCloseTo(-1.44, 1);
    expect(nominal(real, 2025, 2045)).toBeCloseTo(STROM_PFAD.niedrig, 4);
  });

  it("rechnet die beiden ISE-Strompfade aus den Kurvenwerten nach", () => {
    // Fraunhofer ISE, Folie 17, Endkundenpreise in ct(2026)/kWh, aus der
    // 800-dpi-Fassung pixelgenau ausgelesen (Raster 376,3 px je 5 ct).
    //
    // BEIDE PFADE STARTEN AUF DEMSELBEN WERT — das ist der Punkt, an dem die
    // erste Fassung falsch lag. Am linken Rand verdeckt die hellere Kurve die
    // dunkle bis auf vier Pixelzeilen; deren Unterkante als Wert zu nehmen
    // ergab 27,31 statt 27,48 und einen um 0,04 Punkte zu hohen Pfad.
    // Gegenprobe in derselben Quelle: Folie 22 zeigt die 2026er Säulen beider
    // Szenarien gleich hoch.
    const START = 27.48;

    const mitte = rate(START, 28.69, 19);
    expect(mitte * 100).toBeCloseTo(0.227, 2);
    expect(nominal(mitte, 2026, 2045)).toBeCloseTo(DEFAULT_HEATPUMP_CONFIG.stromInflation, 4);

    const hoch = rate(START, 42.07, 19);
    expect(hoch * 100).toBeCloseTo(2.267, 2);
    expect(nominal(hoch, 2026, 2045)).toBeCloseTo(STROM_PFAD.hoch, 4);
  });

  it("rechnet die drei Gaspfade aus der UBA-Zerlegung nach", () => {
    // Tabelle 12, Erdgas Haushalte, NETTO (die MwSt. steht dort in einer
    // eigenen Zeile) und OHNE den CO₂-Aufschlag: Beschaffung + Steuern und
    // Abgaben + Netzentgelte. Ohne CO₂ ist der reale Gaspreis über zwanzig
    // Jahre exakt konstant.
    const a2025 = 61 + 10 + 27;
    const a2045 = 31 + 5 + 62;
    expect(a2025).toBe(a2045);
    expect(nominal(rate(a2025, a2045, 20), 2025, 2045)).toBeCloseTo(
      DEFAULT_HEATPUMP_CONFIG.gasInflation,
      3,
    );

    // Die Bandbreite trägt allein das Netzentgelt, und übernommen wird aus ISE
    // (Folie 21) das VERHÄLTNIS, nicht der Absolutwert: ISEs 2,2 ct gehören zu
    // einer anderen Abgrenzung als die 2,7 ct der UBA-Tabelle. An beiden
    // Rändern gleich — die erste Fassung nahm unten das Verhältnis
    // („konstant") und oben den Absolutwert (8,0 ct) und war damit in sich
    // widersprüchlich.
    const netz2025 = 27;
    const niedrig = 31 + 5 + netz2025 * 1.0;
    expect(nominal(rate(a2025, niedrig, 20), 2025, 2045)).toBeCloseTo(GAS_PFAD.niedrig, 4);
    const hoch = 31 + 5 + netz2025 * (8.0 / 2.2);
    expect(nominal(rate(a2025, hoch, 20), 2025, 2045)).toBeCloseTo(GAS_PFAD.hoch, 4);
  });
});

describe("Preispfade: was NICHT hineingehört", () => {
  const gaspfade = [GAS_PFAD.niedrig, DEFAULT_HEATPUMP_CONFIG.gasInflation, GAS_PFAD.hoch];

  it("übernimmt die ISE-Gaskurven nicht — sie enthalten CO₂ und Grüngas", () => {
    // DER TEUERSTE FEHLER DIESER RUNDE, und er lag am 06.09.2026 als
    // Vorschlag auf dem Tisch: Die ISE-Gaskurven steigen real um 2,45 bzw.
    // 5,74 % im Jahr — aber laut Folie 19 stecken darin der CO₂-Preis UND die
    // Grüngas-Beschaffung als eigene Komponenten. Beides rechnet dieser
    // Rechner getrennt (`co2SurchargeOverToday` und die Bio-Treppe). Wer die
    // Rate übernimmt, zählt beides ein zweites Mal.
    //
    // Nominal wären das rund 4,6 bzw. 8,0 %. Kein Gaspfad darf dort liegen.
    const iseNominal = [nominal(0.0245, 2026, 2045), nominal(0.0574, 2026, 2045)];
    for (const verboten of iseNominal) {
      for (const pfad of gaspfade) {
        expect(Math.abs(pfad - verboten), `Gaspfad ${pfad} liegt auf einer ISE-Gasrate`).toBeGreaterThan(0.005);
      }
    }
  });

  it("hält jeden Gaspfad unter dem, was die Quelle ohne CO₂ hergibt", () => {
    // Die Obergrenze wird aus den QUELLENWERTEN gerechnet, nicht aus der
    // Konstante, die sie begrenzen soll — sonst prüft die Liste gegen ihr
    // eigenes Maximum und ist immer grün. Genau das stand hier in der ersten
    // Fassung (Befund der Gegenprüfung 06.09.2026).
    const grenze = nominal(rate(98, 31 + 5 + 27 * (8.0 / 2.2), 20), 2025, 2045);
    for (const pfad of gaspfade) {
      expect(pfad, `Gaspfad ${pfad} über dem Netzentgelt-Hochlauf`).toBeLessThanOrEqual(grenze + 1e-9);
    }
  });
});

describe("Preispfade: Rollen und Staffelung", () => {
  it("ordnet die Ränder richtig zu — teurer Strom und billiges Gas ist ungünstig", () => {
    const pess = heatPumpScenarioAdj("pessimistic");
    const real = heatPumpScenarioAdj("realistic");
    const opti = heatPumpScenarioAdj("optimistic");

    expect(pess.stromInflation).toBeGreaterThan(real.stromInflation);
    expect(real.stromInflation).toBeGreaterThan(opti.stromInflation);
    expect(pess.gasInflation).toBeLessThan(real.gasInflation);
    expect(real.gasInflation).toBeLessThan(opti.gasInflation);
  });

  it("führt zu einer Ersparnis, die in der erwarteten Richtung streut", () => {
    const fall: HeatPumpInputs = {
      situation: "bestand",
      wohnflaeche: 140,
      insulationIdx: 0,
      personen: 3.5,
      heizsystem: "hk_alt",
      wpType: "lwwp",
    };
    const s = calcHeatPumpScenarios(fall);
    const holen = (id: string) => s.find((x) => x.id === id)!.tcoEinsparung;
    expect(holen("pessimistic")).toBeLessThan(holen("realistic"));
    expect(holen("realistic")).toBeLessThan(holen("optimistic"));
  });

  it("zeigt auf dem Reiter genau die Zahl, mit der gerechnet wird", () => {
    // Die Fehlerklasse „Beschriftung sagt etwas anderes, als die Zahl misst" —
    // hier besonders leicht, weil die Pfade auf Hundertstel stehen und die
    // Anzeige auf Zehntel rundet.
    const s = calcHeatPumpScenarios({
      situation: "bestand",
      wohnflaeche: 140,
      insulationIdx: 0,
      personen: 3.5,
      heizsystem: "hk_alt",
      wpType: "lwwp",
    });
    for (const sz of s) {
      const gerechnet = heatPumpScenarioAdj(sz.id).stromInflation;
      const erwartet = Math.abs(gerechnet * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
      expect(sz.sub, `Reiter ${sz.id}`).toContain(erwartet);
    }
  });
});

describe("Preispfade: die Quellen sind im Repo", () => {
  const wurzel = path.resolve(__dirname, "..", "..");

  it("hat beide Volltexte abgelegt", () => {
    // Eine Fundstelle, die niemand nachschlagen kann, ist keine. Beide PDFs
    // sind die Grundlage der Zahlen oben.
    for (const datei of [
      "docs/quellen/UBA-Rahmendaten-THG-Projektionen-2026.pdf",
      "docs/quellen/Fraunhofer-ISE-Biotreppe-GModG-2026-06.pdf",
    ]) {
      expect(fs.existsSync(path.join(wurzel, datei)), datei).toBe(true);
    }
  });

  it("nennt beide Quellen am Kopf der Pfad-Funktion", () => {
    const t = fs.readFileSync(path.join(wurzel, "lib", "heatpump.ts"), "utf-8");
    const kopf = t.slice(t.indexOf("Die Preispfade"), t.indexOf("export function heatPumpScenarioAdj"));
    expect(kopf).toMatch(/Tabelle 12/);
    expect(kopf).toMatch(/Tabelle 13/);
    expect(kopf).toMatch(/Fraunhofer ISE/);
    expect(kopf).toMatch(/Folie 17/);
  });
});
