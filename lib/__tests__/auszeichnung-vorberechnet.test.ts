/**
 * DIE AUSZEICHNUNGS-LISTE ENTSTEHT IM DATENLAUF, NICHT IM SEITENAUFBAU.
 *
 * Dritter Anlauf an derselben Stelle, und die beiden vorigen sind der Grund für
 * diesen Test:
 *
 *  1. Ein prozess-lokales Memo sparte den zweiten Aufruf, nie den ersten —
 *     3,70 s in jeder frisch gestarteten Function (08.09.2026).
 *  2. Ein geteilter Cache mit Stundenfrist verschob das auf den Fristablauf:
 *     Drei rote Gesundheitschecks am 09.09.2026, jedes Mal die ERSTE Stichprobe
 *     bei 7,2 / 7,2 / 7,6 s, 0,8 s vor der Notbremse bei 8 s.
 *
 * Beide waren nicht falsch, sondern zu klein: Sie senkten die Häufigkeit und
 * ließen denselben Rest — teure Arbeit im Anfrageweg. Der Test hält deshalb die
 * BAUWEISE fest, nicht eine Frist: Der Seitenaufbau darf den Index nicht bauen,
 * egal mit welchem Zwischenspeicher davor.
 *
 * Er ersetzt den Test des zweiten Anlaufs (auszeichnung-kaltstart), der eine
 * Cache-Frist festnagelte, die es nicht mehr gibt. Eine Frist festzuhalten wäre
 * hier auch die falsche Prüfung: Sie hätte den dritten Anlauf gar nicht
 * verlangt, sondern nur eine größere Zahl.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auszeichnungsUrteil, AUSZEICHNUNGEN_MAX_ALTER_TAGE } from "../../scripts/health-check";

const QUELLE = readFileSync(resolve(process.cwd(), "lib", "awards-server.ts"), "utf8");
const REVALIDATE = readFileSync(
  resolve(process.cwd(), "app", "api", "atlas", "revalidate", "route.ts"),
  "utf8",
);

/** Der Rumpf der Funktion, die der Seitenaufbau aufruft. */
function rumpfVon(name: string): string {
  const start = QUELLE.indexOf(`export async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const ende = QUELLE.indexOf("\n}\n", start);
  return QUELLE.slice(start, ende);
}

describe("Der Seitenaufbau baut nichts Großes", () => {
  it("liest eine Zeile über den Schlüssel, statt den Index zu bauen", () => {
    const rumpf = rumpfVon("hatAuszeichnung");
    expect(rumpf).toMatch(/from\("atlas_auszeichnungen"\)/);
    expect(rumpf).toMatch(/\.eq\("region_id", regionId\)/);
    // Der Index über rund 11.000 Zeilen darf hier nicht vorkommen — auch nicht
    // hinter einem Zwischenspeicher. Genau das waren die ersten zwei Anläufe.
    expect(rumpf).not.toMatch(/buildHookIndex|auszeichnungsOrte|unstable_cache/);
  });

  it("gibt bei einem Ausfall ein Nein zurück, statt den Seitenaufbau zu werfen", () => {
    // Kein Platzhalter ist der harmlosere Fehler; eine geworfene Ausnahme
    // nähme die ganze Gemeindeseite mit.
    expect(rumpfVon("hatAuszeichnung")).toMatch(/catch \{\s*return false;/);
  });

  it("nimmt ein weiches Zeitbudget, weil es einen vollwertigen Rückfall gibt", () => {
    expect(rumpfVon("hatAuszeichnung")).toMatch(/DB_SOFT_READ_TIMEOUT_MS/);
  });
});

describe("Der Datenlauf baut die Liste", () => {
  it("wird vom Atlas-Datenlauf angestoßen", () => {
    expect(REVALIDATE).toMatch(/await baueAuszeichnungen\(\)/);
  });

  it("bricht den Datenlauf nicht ab, wenn der Aufbau scheitert", () => {
    // Die Seiten funktionieren ohne die Liste weiter; ein Abbruch nähme dem
    // Datenlauf seine übrigen Schritte.
    const block = REVALIDATE.slice(REVALIDATE.indexOf("baueAuszeichnungen()"));
    expect(block.slice(0, 400)).toMatch(/catch \(e\)/);
  });

  it("schreibt erst neu und räumt danach auf", () => {
    // Umgekehrt stünde die Liste zwischendurch halb leer da, und in dieser Zeit
    // verlöre jede zweite Gemeindeseite ihren Platzhalter.
    const rumpf = rumpfVon("baueAuszeichnungen");
    expect(rumpf.indexOf(".upsert(")).toBeLessThan(rumpf.indexOf(".delete()"));
  });
});

describe("Ein stiller Ausfall wird bemerkt", () => {
  it("meldet eine leere Liste als Befund", () => {
    const u = auszeichnungsUrteil({ orte: 0, erneuertAm: null });
    expect(u.befund).toBeTruthy();
    expect(u.befund).toMatch(/leer/i);
  });

  it("meldet eine überalterte Liste", () => {
    const alt = new Date(Date.now() - (AUSZEICHNUNGEN_MAX_ALTER_TAGE + 5) * 86400000).toISOString();
    expect(auszeichnungsUrteil({ orte: 4596, erneuertAm: alt }).befund).toBeTruthy();
  });

  it("meldet eine frische Liste NICHT", () => {
    const frisch = new Date(Date.now() - 3 * 86400000).toISOString();
    const u = auszeichnungsUrteil({ orte: 4596, erneuertAm: frisch });
    expect(u.befund).toBeNull();
    expect(u.text).toMatch(/4596 Orte/);
  });

  it("hält einen nicht abrufbaren Stand für keinen Befund", () => {
    // „Konnte nicht nachsehen" ist etwas anderes als „ist kaputt" — dieselbe
    // Trennung wie beim Förder-Wächter zwischen „hat sich geändert" und
    // „Abruf kam nicht durch".
    expect(auszeichnungsUrteil(null).befund).toBeNull();
  });
});
