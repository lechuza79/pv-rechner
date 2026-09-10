import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { calcHeatPump, heatPumpScenarioAdj, type HeatPumpInputs } from "../heatpump";
import { INSULATION_BESTAND } from "../constants";

/**
 * Der Satz über den Sanierungswegen folgt der Rechnung, nicht der Hoffnung.
 *
 * ANLASS (10.09.2026, Betreiber am Bildschirm): Über den vier Reitern stand
 * immer derselbe Satz — „So wirken sich weitere Schritte auf die
 * Wirtschaftlichkeit aus" —, während die Reiter darunter am unsanierten Altbau
 * +22k / +26k / +25k / +22k zeigten. Die Vollsanierung ist dort also genauso
 * gut wie gar nichts zu tun, und die Teil-Sanierung schlechter als der bloße
 * Heizkörpertausch. Der Satz lud zum Weiterlesen ein und ließ offen, dass die
 * Antwort „bringt nichts" lauten kann.
 *
 * Dieselbe Regel wie bei den Datengeschichten: Eine Aussage rechnet ihre
 * RICHTUNG mit, statt sie zu behaupten. Kippt das Verhältnis, kippt der Satz.
 *
 * Was dieser Test NICHT kann: den gerenderten Satz lesen — das tut der
 * Browser-Lauf. Er prüft, dass die Richtung überhaupt aus den Wegen abgeleitet
 * wird und dass beide Formulierungen existieren.
 */

const WURZEL = path.resolve(__dirname, "..", "..");
const RECHNER = path.join(WURZEL, "app", "(site)", "waermepumpe-rechner", "waermepumpe.tsx");
const quelle = () => fs.readFileSync(RECHNER, "utf-8");

/** Nur sichtbarer Text — Kommentare zitieren die alte Fassung, um sie zu erklären. */
const sichtbar = () =>
  quelle()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((z) => !/^\s*\/\//.test(z))
    .join("\n");

describe("Der Satz über den Wegen", () => {
  it("leitet die Richtung aus den gerechneten Wegen ab", () => {
    const t = quelle();
    expect(t, "keine Ableitung aus den Wegen").toMatch(/wegeLage/);
    // Verglichen wird gegen den IST-Zustand, nicht gegen null: „bringt etwas"
    // heißt „besser als nichts tun", nicht „positiv".
    expect(t).toMatch(/beste\.r\.tcoEinsparung - istResult\.tcoEinsparung/);
  });

  it("wählt zwischen beiden Sätzen anhand der Rechnung", () => {
    const t = sichtbar();
    expect(t, "kein Satz für den Fall, dass es sich lohnt").toMatch(/Am meisten bringt/);
    expect(t, "kein Satz für den Fall, dass es nichts bringt").toMatch(
      /Weitere Schritte am Gebäude ändern daran wenig/,
    );

    // GEPRÜFT WIRD DIE VERWENDUNG, NICHT DAS VORHANDENSEIN. Die erste Fassung
    // sah nur nach, ob beide Sätze im Quelltext stehen — und blieb grün, als
    // die Verzweigung zur Probe auf `true` festgenagelt wurde, also immer den
    // Werbesatz zeigte. Dieselbe Falle, an der am 01.09.2026 zwei Wächter an
    // einem Tag gescheitert sind.
    const auswahl = t.slice(t.indexOf("wegeLage === null"), t.indexOf("Zum Vergleich:"));
    expect(auswahl, "die Auswahl hängt nicht an der gerechneten Richtung").toMatch(
      /wegeLage\.lohnt\s*$|wegeLage\.lohnt\s*\n/m,
    );
  });

  it("verspricht nicht mehr pauschal eine Wirkung", () => {
    // Der alte Satz war nicht falsch, aber richtungslos — und genau das hat der
    // Betreiber am Bildschirm gesehen. Er darf nicht zurückkommen.
    expect(sichtbar()).not.toMatch(/So wirken sich weitere Schritte auf die Wirtschaftlichkeit aus/);
  });

  it("trifft am unsanierten Altbau die Richtung 'bringt wenig'", () => {
    // DER FALL AUS DEM SCREENSHOT, unabhängig nachgerechnet: 140 m²,
    // unsaniert, alte Heizkörper. Keine Sanierung bringt dort mehr als der
    // Heizkörpertausch — und dieser Test wird rot, wenn eine Modelländerung das
    // dreht, ohne dass jemand den Satz noch einmal ansieht.
    const basis: HeatPumpInputs = {
      situation: "bestand",
      wohnflaeche: 140,
      insulationIdx: 0,
      personen: 3.5,
      heizsystem: "hk_alt",
      wpType: "lwwp",
      greenGas: true,
    };
    const adj = heatPumpScenarioAdj("realistic");
    const ist = calcHeatPump(basis, undefined, adj).tcoEinsparung;
    const teil = calcHeatPump(
      { ...basis, insulationIdx: 1, heizkoerperTausch: true },
      undefined,
      adj,
    ).tcoEinsparung;
    const voll = calcHeatPump(
      { ...basis, insulationIdx: INSULATION_BESTAND.length - 1, heizkoerperTausch: true },
      undefined,
      adj,
    ).tcoEinsparung;

    // Beide Sanierungen liegen nicht über dem Heizkörpertausch allein.
    const heizung = calcHeatPump({ ...basis, heizkoerperTausch: true }, undefined, adj).tcoEinsparung;
    expect(teil).toBeLessThanOrEqual(heizung);
    expect(voll).toBeLessThanOrEqual(heizung);
    // Und die Vollsanierung bringt gegenüber „nichts tun" keinen merklichen
    // Vorteil — das ist die Aussage, die der Satz treffen muss.
    expect(Math.abs(voll - ist)).toBeLessThan(1500);
  });
});
