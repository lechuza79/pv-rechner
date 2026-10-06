/**
 * Preflight for a contact collection run — everything a run has failed on
 * before, asked BEFORE it starts (docs/lehren/kontakt-engine-fehler.md).
 *
 * Built after the wind operators (06.10.2026): the contact step failed at night
 * on columns the setup had never created, a worktree ran with half its
 * dependencies, a report counted 0 MW because it looked for the register in the
 * wrong checkout, and an orphaned run of a stopped session was still writing
 * while a new one started. Each of those is one check below. A stock assembles
 * its checks and calls `vorflug()`; the verdict is BEREIT or NICHT BEREIT, same
 * as the municipal send preflight (docs/versand/ablauf.md).
 *
 * Nothing here prints a secret: access is checked for being SET, never shown.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { loadavg } from "node:os";
import { resolve } from "node:path";
import { BEZAHLTE_SUCHE_FLAG } from "./bezahlte-suche";

export type Pruefung = { name: string; ok: boolean; detail: string };
export type Check = { name: string; pruefen: () => Promise<Omit<Pruefung, "name">> | Omit<Pruefung, "name"> };

/** The load at which heavy runs tore their time limits (100–440 measured, 22.09. and 06.10.2026). */
export const LAST_GRENZE = 40;

export function lastCheck(grenze = LAST_GRENZE): Check {
  return {
    name: "Last der Maschine",
    pruefen: () => {
      const [eins, fuenf] = loadavg();
      // The 5-minute mean too: a short dip between two foreign builds is no green light.
      const l = Math.max(eins, fuenf);
      return { ok: l <= grenze, detail: `${eins.toFixed(0)} / ${fuenf.toFixed(0)} (Grenze ${grenze})${l > grenze ? " — warten, meist sind es fremde Builds" : ""}` };
    },
  };
}

/** Env keys present (non-empty). Never the value, not even its length. */
export function zugangCheck(schluessel: string[][]): Check {
  return {
    name: "Zugänge gesetzt",
    pruefen: () => {
      const fehlt = schluessel.filter((alternativen) => !alternativen.some((k) => (process.env[k] ?? "").trim())).map((a) => a.join(" oder "));
      return { ok: !fehlt.length, detail: fehlt.length ? `fehlt: ${fehlt.join(", ")}` : "alle gesetzt" };
    },
  };
}

/**
 * Installed packages match the lockfile. A worktree that kept an old
 * node_modules (or linked the main checkout's) ran with a module missing
 * (bluebird, under unzipper, 06.10.2026) and failed only when the register
 * step started.
 */
export function abhaengigkeitenCheck(wurzel: string): Check {
  return {
    name: "Abhängigkeiten passen zur Sperrdatei",
    pruefen: () => {
      const nm = resolve(wurzel, "node_modules");
      if (!existsSync(nm)) return { ok: false, detail: "node_modules fehlt — npm ci" };
      if (lstatSync(nm).isSymbolicLink()) return { ok: false, detail: "node_modules ist ein Link auf einen anderen Checkout — npm ci" };
      const lock = JSON.parse(readFileSync(resolve(wurzel, "package-lock.json"), "utf8"));
      const falsch: string[] = [];
      for (const [pfad, p] of Object.entries<{ version?: string; optional?: boolean; link?: boolean }>(lock.packages ?? {})) {
        if (!pfad.startsWith("node_modules/") || p.optional || p.link || !p.version) continue;
        const pj = resolve(wurzel, pfad, "package.json");
        if (!existsSync(pj)) { falsch.push(`${pfad.slice(13)} fehlt`); continue; }
        const v = JSON.parse(readFileSync(pj, "utf8")).version;
        if (v !== p.version) falsch.push(`${pfad.slice(13)} ${v} statt ${p.version}`);
      }
      return { ok: !falsch.length, detail: falsch.length ? `${falsch.length} abweichend (${falsch.slice(0, 3).join(", ")}) — npm ci` : "alle passend" };
    },
  };
}

/**
 * No other run of this stock is alive. An orphaned run of a stopped session
 * kept researching and would have written its results while a new session
 * started the same steps (06.10.2026).
 */
export function paralleleLaeufeCheck(muster: RegExp, eigenePid = process.pid): Check {
  return {
    name: "Kein zweiter Lauf desselben Bestands",
    pruefen: () => {
      const ps = execFileSync("ps", ["-axo", "pid=,ppid=,command="], { encoding: "utf8" });
      const zeilen = ps.split("\n").map((z) => z.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter((m): m is RegExpMatchArray => !!m);
      // Our own process and its ancestors (npm → tsx → node) are not "another run".
      const eltern = new Map(zeilen.map((m) => [Number(m[1]), Number(m[2])]));
      const eigene = new Set<number>();
      for (let p: number | undefined = eigenePid; p && !eigene.has(p); p = eltern.get(p)) eigene.add(p);
      const fremd = zeilen.filter((m) => !eigene.has(Number(m[1])) && muster.test(m[3]) && !/\bgrep\b|vorflug/.test(m[3]));
      // npm, tsx and node of one run are three lines; count the node lines.
      const laeufe = fremd.filter((m) => /node .*tsx|tsx\/dist/.test(m[3]) || !/npm exec|\/\.bin\/tsx/.test(m[3]));
      return { ok: !laeufe.length, detail: laeufe.length ? `${laeufe.length} Prozess(e), z. B. PID ${laeufe[0][1]}: ${laeufe[0][3].slice(0, 120)}` : "keiner" };
    },
  };
}

/** The files of an unattended run never carry the paid-search flag. */
export function keineBezahlteSucheCheck(dateien: string[]): Check {
  return {
    name: "Keine bezahlte Suche im Ablauf",
    pruefen: () => {
      const treffer = dateien.filter((d) => existsSync(d) && (readFileSync(d, "utf8").includes(BEZAHLTE_SUCHE_FLAG) || /api\.dataforseo\.com\/v3\/serp/.test(readFileSync(d, "utf8"))));
      return { ok: !treffer.length, detail: treffer.length ? `in ${treffer.join(", ")}` : `${dateien.length} Dateien geprüft` };
    },
  };
}

export async function vorflug(checks: Check[]): Promise<boolean> {
  const ergebnisse: Pruefung[] = [];
  for (const c of checks) {
    try { ergebnisse.push({ name: c.name, ...(await c.pruefen()) }); }
    // A check that cannot run is a failed check, never a skipped one.
    catch (e) { ergebnisse.push({ name: c.name, ok: false, detail: `Prüfung nicht ausführbar: ${(e as Error).message}` }); }
  }
  for (const e of ergebnisse) console.log(`  ${e.ok ? "✓" : "✗"} ${e.name.padEnd(42)} ${e.detail}`);
  const bereit = ergebnisse.every((e) => e.ok);
  console.log(bereit ? "BEREIT" : `NICHT BEREIT — ${ergebnisse.filter((e) => !e.ok).length} von ${ergebnisse.length} Prüfungen offen`);
  return bereit;
}
