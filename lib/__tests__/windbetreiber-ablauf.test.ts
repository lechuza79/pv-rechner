import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The rules are tested in windbetreiber.test.ts. This checks that the run
// really USES them on every path that writes a website — a rule that exists
// but is bypassed by one write looks exactly like a rule that works.
const quelle = readFileSync(resolve(__dirname, "../../scripts/windbetreiber-refresh.ts"), "utf8");

function rumpf(name: string): string {
  const start = quelle.indexOf(`async function ${name}(`);
  expect(start, `${name} fehlt`).toBeGreaterThan(-1);
  const auf = quelle.indexOf("{", quelle.indexOf(")", start));
  let tiefe = 0;
  for (let i = auf; i < quelle.length; i++) {
    if (quelle[i] === "{") tiefe++;
    else if (quelle[i] === "}" && --tiefe === 0) return quelle.slice(auf, i + 1);
  }
  throw new Error(name);
}

describe("Windbetreiber-Lauf", () => {
  it("writes a website only from a proven check, on every path", () => {
    // Every write of the website columns goes through websiteFelder(), and
    // websiteFelder() is only ever fed the winner of besterBeleg() or a check
    // whose result is "belegt".
    const schreibstellen = quelle.match(/websiteFelder\(([^)]*)\)/g) ?? [];
    expect(schreibstellen.length).toBeGreaterThanOrEqual(3);
    // websiteFelder(null, …) withdraws a website; it asserts none.
    for (const s of schreibstellen) expect(s, s).toMatch(/websiteFelder\((?:best|p|null), HEUTE\)/);
    expect(rumpf("impressumLauf")).toMatch(/const best = besterBeleg\(/);
    expect(rumpf("manuell")).toMatch(/if \(p\.ergebnis !== "belegt"\) \{[\s\S]*?NICHT übernommen/);
    expect(rumpf("keine")).toMatch(/notiz\.length < 40/);
    // No other place sets the website column directly.
    expect(quelle.match(/\bwebsite: (?!p \?|z\.website|string|`https:\/\/\$\{d\}`)/g) ?? []).toEqual([]);
  });

  it("checks a hand-found website with the same rule as a machine-found one", () => {
    const m = rumpf("manuell");
    expect(m).toMatch(/await pruefen\(z, \{ domain, quelle: "manuell" \}, belegungen\)/);
    // A different evidence page is allowed, a different rule is not.
    expect(m).toMatch(/const text = belegseite \? sichtbarerText\(belegseite\) : "";/);
    expect(m).toMatch(/belegseiteTraegt\(text, akteurVon\(z\), z\.name, domain, await ortsWoerter\(\)\)/);
    // A name on another page proves only when it identifies someone (reference lists).
    const lib = readFileSync(resolve(__dirname, "../windbetreiber.ts"), "utf8");
    expect(lib.slice(lib.indexOf("export function belegseiteTraegt"))).toMatch(/b\.wie !== "name" \|\| vollerNameIn\(text, name\) \|\| \(identifizierend\(name, ortsWoerter\) && !parkListe\(text, name\)\)/);
    // The page is kept, so a rule change judges the hand decision again.
    expect(m).toMatch(/writeFileSync\(belegseiteDatei\(seite\), text\)/);
    expect(m).toMatch(/Die Belegseite muss auf derselben Website liegen/);
    // Never replaces a proven website in passing (Österwurth, 06.10.2026).
    expect(m).toMatch(/if \(z\.website && z\.website !== domain && !flag\("ersetzen"\)\)/);
    // A proof on a subdomain never stores the parent domain in passing (Süderdeich).
    expect(m).toMatch(/if \(beleg && seitenHost !== domain && !flag\("subdomain-ok"\)\)/);
    // A failed retry never overwrites the stored proof of the current website (Waabs).
    expect(m.indexOf('p.ergebnis !== "belegt" && z.website === domain')).toBeGreaterThan(-1);
    expect(m.indexOf('p.ergebnis !== "belegt" && z.website === domain')).toBeLessThan(m.indexOf("kandidatZeile(z, p)"));
  });

  it("judges hand-taken websites again after a rule change — reports, never changes", () => {
    const n = rumpf("neuBewerten");
    expect(n).toMatch(/belegseiteTraegt\(readFileSync\(seite, "utf8"\)/);
    expect(n).toMatch(/widerspruch\.push\(`\$\{z\.mastr_nr\} \$\{z\.name\}: \$\{z\.website\} trägt nach heutiger Regel nicht mehr/);
    expect(n).toMatch(/nicht nachprüfbar/);
  });

  it("does not accept a proven website that another stock holds in conflict", () => {
    const p = rumpf("pruefen");
    const pruef = p.indexOf("abgleichen(");
    expect(pruef).toBeGreaterThan(-1);
    // The conflict return comes before the only "belegt" return.
    expect(p.indexOf('ergebnis: "konflikt"')).toBeGreaterThan(pruef);
    expect(p.indexOf('ergebnis: "konflikt"')).toBeLessThan(p.lastIndexOf('ergebnis: "belegt"'));
    // How official the link is follows from the proof, in one shared rule.
    expect(p).toMatch(/herkunft: websiteHerkunft\(k\.quelle, u\.beleg!\.wie\)/);
  });

  it("refuses a register read that loses operators", () => {
    expect(rumpf("registerLesen")).toMatch(/Betreiber-Nummern fehlen im Akteursverzeichnis/);
  });

  it("stores the register read before writing it", () => {
    const r = rumpf("registerLesen");
    expect(r.indexOf("writeFileSync(datei")).toBeGreaterThan(-1);
  });

  it("reports a website without proof and a 'none' without a note as violations", () => {
    const s = rumpf("stand");
    expect(s).toMatch(/Website ohne Beleg/);
    expect(s).toMatch(/ohne belegte Prüfung/);
    expect(s).toMatch(/steht in einem anderen Bestand/);
    expect(s).toMatch(/ohne Notiz, was gesucht wurde/);
    expect(s).toMatch(/process\.exitCode = 1/);
  });

  it("counts a gap as done only when a person confirmed it", () => {
    expect(rumpf("keine")).toMatch(/suche_notiz: `\$\{VON_HAND\} \$\{notiz\}`/);
    expect(rumpf("offenListe")).toMatch(/startsWith\(VON_HAND\)/);
    expect(rumpf("stand")).toMatch(/von Hand bestätigt/);
  });

  it("never lets a report start the 20-minute register read", () => {
    expect(rumpf("stand")).not.toMatch(/registerLesen\(/);
    expect(rumpf("offenListe")).not.toMatch(/registerLesen\(/);
  });
});
