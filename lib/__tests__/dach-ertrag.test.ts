import { describe, it, expect } from "vitest";
import { DACHARTEN } from "../constants";
import { TILT_TABLE, tiltPct } from "../tilt-config";
import {
  dachErlaubtNord,
  dachErtragHinweis,
  dachErtragKwp,
  dachNeigungsFaktor,
} from "../dach-ertrag";

// Realitäts-Anker für die Regel „Standort-Optimum × Dach". Die Prozente selbst
// sind in tilt-config.test.ts gegen den PVGIS-Referenzabruf verankert; hier wird
// geprüft, dass die REGEL sie richtig anwendet — und dass die Bestfall-Annahme
// nicht unsichtbar wird.

describe("Dach → Ertrag", () => {
  const idx = (id: string) => DACHARTEN.findIndex(d => d.id === id);

  it("ohne vollständige Angabe bleibt der Standort-Ertrag unangetastet", () => {
    expect(dachNeigungsFaktor(null, null)).toBe(1);
    expect(dachNeigungsFaktor(idx("sattel"), null)).toBe(1);
    expect(dachNeigungsFaktor(null, "sued")).toBe(1);
    expect(dachErtragKwp(1000, null, null)).toBe(1000);
  });

  it("Süd-Satteldach trifft das Optimum, auf das PVGIS normiert ist", () => {
    // PVGIS liefert mit optimalinclination=1 / aspect=0. Ein Süddach mit
    // typischer Satteldach-Neigung (35°) IST dieser Fall — Faktor 1,0.
    expect(dachNeigungsFaktor(idx("sattel"), "sued")).toBe(1);
    expect(dachErtragKwp(1000, idx("sattel"), "sued")).toBe(1000);
  });

  it("rechnet die dokumentierten Abweichungen je Dach", () => {
    // Die Zahlen sind der Grund, warum es dieses Modul gibt: ohne Faktor wurde
    // im PV-Rechner jedes dieser Dächer als optimales Süddach gerechnet.
    expect(dachErtragKwp(1000, idx("sattel"), "ostwest")).toBe(800); // 35° O/W
    expect(dachErtragKwp(1000, idx("flach"), "sued")).toBe(920); // 10° Süd
    expect(dachErtragKwp(1000, idx("pult"), "nord")).toBe(720); // 15° Nord
    expect(dachErtragKwp(1000, idx("walm"), "suedostwest")).toBe(940); // 30° SO/SW
  });

  it("die Abweichung ist groß genug, um die Amortisation zu verschieben", () => {
    // Untergrenze der Fehlerklasse: das schlechteste realistische Dach verliert
    // mehr als ein Viertel des Ertrags. Wer diesen Test aufweicht, muss erst
    // erklären, warum die Bestfall-Annahme wieder zulässig wäre.
    const schlechtestes = Math.min(
      ...DACHARTEN.map(d => tiltPct("nord", d.typNeigung)),
    );
    expect(schlechtestes).toBeLessThan(75);
  });

  it("aufgeständerte Dächer bieten kein Nord an", () => {
    expect(dachErlaubtNord(idx("flach"))).toBe(false);
    expect(dachErlaubtNord(idx("sattel"))).toBe(true);
    expect(dachErlaubtNord(idx("pult"))).toBe(true);
    // Ohne Wahl darf nichts weggefiltert werden.
    expect(dachErlaubtNord(null)).toBe(true);
  });

  it("jede Dachform hat eine Neigung, die die Matrix wirklich kennt", () => {
    // Kohärenz zwischen den beiden Quellen: typNeigung darf nicht zwischen zwei
    // weit auseinanderliegende Zeilen fallen, sonst rundet tiltPct still auf
    // eine Neigung, die mit der Dachform nichts mehr zu tun hat.
    for (const d of DACHARTEN) {
      const naechste = Math.min(
        ...TILT_TABLE.map(r => Math.abs(r.angle - d.typNeigung)),
      );
      expect(naechste, `${d.label} (${d.typNeigung}°)`).toBeLessThanOrEqual(5);
    }
  });

  it("der Hinweis benennt die Bestfall-Annahme, solange nichts angegeben ist", () => {
    const ohne = dachErtragHinweis(1000, null, null, true);
    expect(ohne).toContain("optimaler Neigung nach Süden");

    const mit = dachErtragHinweis(800, idx("sattel"), "ostwest", true);
    expect(mit).toContain("Satteldach");
    expect(mit).toContain("35°");
    expect(mit).toContain("80 %");
    // Beim Optimum wäre „100 % des Optimums" nur Lärm.
    expect(dachErtragHinweis(1000, idx("sattel"), "sued", true)).not.toContain("% des Optimums");
  });

  it("unterscheidet Standort-Ertrag und Bundesmittel im Text", () => {
    expect(dachErtragHinweis(950, null, null, false)).toContain("im Bundesmittel");
    expect(dachErtragHinweis(950, null, null, true)).toContain("für deinen Standort");
  });
});
