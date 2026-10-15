/**
 * What `npm run sessions` shows about the health monitoring: every open
 * finding and whether a repair run has worked on it. This is the place every
 * session looks at before it starts — the operator does not want a mail, so an
 * open finding must be visible here instead (07.10.2026).
 */
import { execFileSync } from "node:child_process";
import type { IncidentState } from "../../lib/health-incidents";
import { readState } from "../../lib/health-incidents";
import { leeresLedger, readLedger, reparaturStand, type Ledger } from "../../lib/autofix-ledger";
import { zeitpunktInBerlin } from "../../lib/zeit";
import { latestArtifactJson } from "./actions-artifact";

export function ueberwachungZeilen(state: IncidentState, ledger: Ledger, jetzt: Date): string[] {
  const offen = Object.values(state.incidents);
  if (!offen.length) return ["Überwachung: keine offenen Befunde."];
  const zuletzt = offen.map((i) => i.lastSeen).sort().at(-1);
  const zeilen = [`Überwachung: ${offen.length} offene Befunde (letzte Messung ${zeitpunktInBerlin(zuletzt)}):`];
  for (const i of offen) {
    const stand = i.operator ? "wartet auf eine Entscheidung des Betreibers" : `Reparatur: ${reparaturStand(i.key, ledger, jetzt)}`;
    zeilen.push(`  — ${i.text.length > 220 ? `${i.text.slice(0, 217)}…` : i.text}`, `      ${stand}`);
  }
  zeilen.push("  Wer einen davon behebt, prüft vorher `git log` — ein Reparaturlauf kann parallel daran sitzen.");
  return zeilen;
}

export function ueberwachungStand(): string[] {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    const repo = remote.match(/github\.com[:/](.+?)(\.git)?$/)?.[1];
    if (!repo) return ["Überwachung: Repository nicht erkennbar — nicht nachgesehen."];
    const health = latestArtifactJson(repo, "health-incidents", "state.json", 15_000);
    if (!health) return ["Überwachung: kein Messbericht gefunden — nicht nachgesehen."];
    const ledger = latestArtifactJson(repo, "autofix-ledger", "ledger.json", 15_000);
    return ueberwachungZeilen(readState(health.json), ledger ? readLedger(ledger.json) : leeresLedger(), new Date());
  } catch (e) {
    return [`Überwachung: konnte nicht nachsehen (${(e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 120)}).`];
  }
}
