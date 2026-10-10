import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The guard against official stocks only protects the business table if
// every write goes through it. This reads the script, because a guard that
// exists but is bypassed looks exactly like one that works.
const quelle = readFileSync(resolve(__dirname, "../../scripts/fachbetriebe-refresh.ts"), "utf8");

function funktionsrumpf(name: string): string {
  const start = quelle.indexOf(`async function ${name}(`);
  expect(start, `${name} fehlt`).toBeGreaterThan(-1);
  const auf = quelle.indexOf("{", quelle.indexOf(")", start));
  let tiefe = 0;
  for (let i = auf; i < quelle.length; i++) {
    if (quelle[i] === "{") tiefe++;
    else if (quelle[i] === "}" && --tiefe === 0) return quelle.slice(auf, i + 1);
  }
  throw new Error(`${name}: Rumpf nicht gefunden`);
}

describe("Fachbetriebe gegen die anderen Bestände", () => {
  it("checks the business table before anything else is written", () => {
    const rumpf = funktionsrumpf("upsertGestueckelt");
    const aufruf = rumpf.indexOf("gegenAndereBestaende(");
    expect(aufruf, "die Schranke wird nicht aufgerufen").toBeGreaterThan(-1);
    expect(aufruf, "die Schranke steht hinter dem Schreiben").toBeLessThan(rumpf.indexOf("upsertGleichfoermig("));
  });

  it("only demotes against an official stock, never on a press-catalogue collision", () => {
    const rumpf = funktionsrumpf("gegenAndereBestaende");
    expect(rumpf).toMatch(/u\.art === "verdraengt"/);
    expect(rumpf).not.toMatch(/"entscheiden"/);
  });

  it("has no write to the business table that sets a classification around the guard", () => {
    // One direct write is allowed: creating new domains with nothing but the
    // domain and a timestamp, so the classification stays on its column
    // default 'unklar'. Anything that carries `art` must go through the helper.
    const direkt = [...quelle.matchAll(/from\(\s*["']fachbetriebe["']\s*\)\s*\.upsert\(/g)];
    expect(direkt.length, "neuer Direktschreibweg").toBe(1);
    const davor = quelle.slice(Math.max(0, direkt[0].index! - 600), direkt[0].index!);
    expect(davor).toMatch(/\.map\(\(d\) => \(\{ domain: d, updated_at: new Date\(\)\.toISOString\(\) \}\)\)/);
    expect(quelle.slice(direkt[0].index!, direkt[0].index! + 200)).toMatch(/ignoreDuplicates: true/);
    const ueberHelfer = quelle.match(/upsertGestueckelt\(\s*sb,\s*"fachbetriebe"/g) ?? [];
    expect(ueberHelfer.length).toBeGreaterThan(0);
  });
});
