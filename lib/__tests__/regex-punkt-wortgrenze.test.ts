import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A word boundary after a period never matches before a space.
 *
 * `\b` sits between a word and a non-word character. After "e.V." the period
 * is already a non-word character, so `(?:…|e\.V\.)\b` only matches when a
 * LETTER follows — "GFWW e.V. Im Technologiepark" never matched. The installer
 * classification carried this for weeks: its association pattern caught
 * nothing (measured 06.10.2026). Nothing looks broken — the pattern simply
 * never fires. The fix is a lookahead, `(?!\w)`.
 *
 * This scans every extractor and script for an alternative that ends in an
 * escaped period inside a group followed by `\b`.
 */

const WURZEL = resolve(__dirname, "../..");

// Each exception names why it stays. Fixing these widens what another stock
// classifies, which its own measurement has to decide — not this guard.
const AUSNAHMEN: Record<string, string> = {
  "lib/presse-extrakt.ts:672":
    "OFFEN (bis 11/2026): medium type 'Verband' on the whole page — fixing e.V. widens it to every page mentioning a club; the press stock decides with a measurement",
  "lib/presse-extrakt.ts:308": "country list: 'U.S.' before a space never matches; harmless, the other spellings carry it",
  "lib/presse-katalog.ts:238": "country list: 'U.S.' before a space never matches; harmless, the other spellings carry it",
  "lib/presse-eignung.ts:460": "shop words: 'art.-nr.' and 'zzgl. versand' — 'zzgl. versand' ends in a letter; 'art.-nr.' is one of ten alternatives",
};

function dateien(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === "__tests__" || n.startsWith(".")) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...dateien(p));
    else if (/\.(ts|tsx|mjs)$/.test(n)) out.push(p);
  }
  return out;
}

/** Alternatives of the group closing right before `pos` (the ")" of ")\b"). */
function alternativenVor(zeile: string, schliessend: number): string[] | null {
  let tiefe = 0;
  for (let i = schliessend; i >= 0; i--) {
    const c = zeile[i];
    const escaped = i > 0 && zeile[i - 1] === "\\";
    if (escaped) continue;
    if (c === ")") tiefe++;
    else if (c === "(" && --tiefe === 0) {
      const innen = zeile.slice(i + 1, schliessend).replace(/^\?:/, "");
      const alts: string[] = [];
      let d = 0;
      let start = 0;
      for (let j = 0; j < innen.length; j++) {
        if (innen[j - 1] === "\\") continue;
        if (innen[j] === "(") d++;
        else if (innen[j] === ")") d--;
        else if (innen[j] === "|" && d === 0) {
          alts.push(innen.slice(start, j));
          start = j + 1;
        }
      }
      alts.push(innen.slice(start));
      return alts;
    }
  }
  return null;
}

export function befunde(): string[] {
  const out: string[] = [];
  for (const f of [...dateien(join(WURZEL, "lib")), ...dateien(join(WURZEL, "scripts"))]) {
    const zeilen = readFileSync(f, "utf8").split("\n");
    zeilen.forEach((z, i) => {
      for (const m of z.matchAll(/\)\\b/g)) {
        const alts = alternativenVor(z, m.index!);
        if (alts?.some((a) => /\\\.\s*$/.test(a))) out.push(`${relative(WURZEL, f)}:${i + 1}`);
      }
    });
  }
  return out;
}

describe("no word boundary after an escaped period", () => {
  it("finds the bug where it was (the old association pattern)", () => {
    const zeile = String.raw`muster: /\b(e\.\s?V\.|Genossenschaft|ehrenamtlich)\b/,`;
    expect(alternativenVor(zeile, zeile.indexOf(")\\b"))?.some((a) => /\\\.\s*$/.test(a))).toBe(true);
  });

  it("leaves a lookahead alone", () => {
    const zeile = String.raw`const X = /\be\.\s?V\.(?!\w)|\bVerband\b/;`;
    expect(zeile.match(/\)\\b/g)).toBeNull();
  });

  it("has no new occurrence in lib/ or scripts/", () => {
    const neu = befunde().filter((b) => !(b in AUSNAHMEN));
    expect(neu, `a group alternative ends in "\\." before \\b — use (?!\\w) instead`).toEqual([]);
  });

  it("every exception is still there (a fixed one leaves the list)", () => {
    const da = new Set(befunde());
    for (const k of Object.keys(AUSNAHMEN)) expect(da.has(k), `${k} is fixed — remove it from the list`).toBe(true);
  });

  it("an open exception carries a deadline that has not passed", () => {
    for (const grund of Object.values(AUSNAHMEN)) {
      const m = grund.match(/OFFEN \(bis (\d{2})\/(\d{4})\)/);
      if (!m) continue;
      const frist = new Date(Number(m[2]), Number(m[1]), 1);
      expect(frist.getTime()).toBeGreaterThan(Date.now());
    }
  });
});
