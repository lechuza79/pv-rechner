import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * WHY THIS TEST EXISTS (measured 15.09.2026)
 *
 * The autofix workflow caps itself at one model run per day. The cap counted
 * every run of the workflow — including the ones whose job is skipped because
 * the health check was green. Those appear in the run list with conclusion
 * "skipped", and the brake read them as "an analysis already ran today".
 * Result: on 11.09. and 12.09.2026 no analysis ran at all, across nine red
 * health checks. Nothing looked broken — every autofix run ended "success".
 *
 * The test runs the REAL jq program from the workflow file against run lists
 * shaped like the real API response, so it checks the derivation, not the
 * presence of a word.
 */

const WORKFLOW = resolve(__dirname, "..", "..", ".github", "workflows", "claude-autofix.yml");

type Lauf = { createdAt: string; databaseId: number; conclusion: string };

function jqProgramm(): string {
  const text = readFileSync(WORKFLOW, "utf8");
  const schritt = text.split("- name: Tagesbremse")[1]?.split("- name:")[0];
  if (!schritt) throw new Error("Tagesbremse step not found in claude-autofix.yml");
  const treffer = schritt.match(/--jq \\\s*\n\s*"((?:[^"\\]|\\.)*)"/);
  if (!treffer) throw new Error("jq program not found in Tagesbremse step");
  return treffer[1].replace(/\\"/g, '"');
}

function jsonFelder(): string[] {
  const text = readFileSync(WORKFLOW, "utf8");
  const schritt = text.split("- name: Tagesbremse")[1]?.split("- name:")[0] ?? "";
  return schritt.match(/--json ([\w,]+)/)?.[1].split(",") ?? [];
}

function zaehle(laeufe: Lauf[], heute: string, laufId: number): number {
  const programm = jqProgramm()
    .replace(/\$heute/g, heute)
    .replace(/\$\{\{ github\.run_id \}\}/g, String(laufId));
  const felder = jsonFelder();
  // gh --json only returns the requested fields; mirror that so a filter on an
  // unrequested field fails here as it would in the Action.
  const antwort = laeufe.map((l) => Object.fromEntries(felder.map((f) => [f, l[f as keyof Lauf]])));
  return Number(execFileSync("jq", [programm], { input: JSON.stringify(antwort) }).toString().trim());
}

describe("Autofix daily brake", () => {
  const heute = "2026-09-12";

  it("skipped runs from green health checks do not count as analyses", () => {
    // Shape of 12.09.2026 08:36: only a skipped run earlier that day.
    const laeufe: Lauf[] = [
      { createdAt: "2026-09-12T08:36:13Z", databaseId: 3, conclusion: "" },
      { createdAt: "2026-09-12T04:38:20Z", databaseId: 2, conclusion: "skipped" },
      { createdAt: "2026-09-11T23:17:33Z", databaseId: 1, conclusion: "success" },
    ];
    expect(zaehle(laeufe, heute, 3)).toBe(0);
  });

  it("an earlier real run today engages the brake", () => {
    const laeufe: Lauf[] = [
      { createdAt: "2026-09-12T08:46:13Z", databaseId: 4, conclusion: "" },
      { createdAt: "2026-09-12T08:36:13Z", databaseId: 3, conclusion: "success" },
      { createdAt: "2026-09-12T04:38:20Z", databaseId: 2, conclusion: "skipped" },
    ];
    expect(zaehle(laeufe, heute, 4)).toBe(1);
  });

  it("a run still in progress counts (conservative direction)", () => {
    const laeufe: Lauf[] = [
      { createdAt: "2026-09-12T08:46:13Z", databaseId: 4, conclusion: "" },
      { createdAt: "2026-09-12T08:36:13Z", databaseId: 3, conclusion: "" },
    ];
    expect(zaehle(laeufe, heute, 4)).toBe(1);
  });

  it("the run list window covers a busy day", () => {
    const text = readFileSync(WORKFLOW, "utf8");
    const schritt = text.split("- name: Tagesbremse")[1]?.split("- name:")[0] ?? "";
    const limit = Number(schritt.match(/--limit (\d+)/)?.[1]);
    // 10.09.2026 had 16 runs by 10:17; the window must not push a morning
    // analysis out and release a second model run.
    expect(limit).toBeGreaterThanOrEqual(50);
  });
});
