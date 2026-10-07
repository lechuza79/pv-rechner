/**
 * The repair lane (lib/autofix-ledger.ts, .github/workflows/claude-autofix.yml).
 *
 * Measured on 07.10.2026: one model run per DAY for all findings; the first
 * run ended after 19 s with two permission denials, no commit, no issue, no
 * verdict — and four findings waited a day with nobody on them. Every rule
 * below was sabotaged once before check-in and seen red.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Finding, Incident } from "../health-incidents";
import { emptyState } from "../health-incidents";
import {
  AUTOFIX_SCHEMA, CHECK_DEFEKT, MAX_MODELLLAEUFE_JE_TAG, MODELLSCHRITT, beginneVersuch, bewerteErgebnis, leeresLedger,
  liegenUnbearbeitet, modelllaeufeAmTag, readLedger, reparaturStand, schliesseVersuch, stummeLaeufe, waehleBefund, type Ledger,
} from "../autofix-ledger";
import { offeneAusAusloeser } from "../../scripts/autofix-plan";
import { reparaturLedgerLesen } from "../../scripts/health-check";
import { ueberwachungZeilen } from "../../scripts/lib/ueberwachung-stand";

const jetzt = new Date("2026-10-07T10:00:00Z");
const inc = (key: string, extra: Partial<Incident> = {}): Incident => ({
  key, text: `Befund ${key}`, firstSeen: "2026-10-06T00:00:00Z", lastSeen: jetzt.toISOString(), count: 1, escalated: false, ...extra,
});
const weather = inc("weather-stale");
const atlas = inc("atlas-404:ch");
const versucht = (key: string, wann: Date, runId = 1, l: Ledger = leeresLedger()) => beginneVersuch(l, { key, text: `Befund ${key}` }, wann, runId);
const schliesse = (l: Ledger, runId: number, key: string, roh: string, wann = jetzt) =>
  schliesseVersuch(l, runId, key, bewerteErgebnis(roh, () => true), wann);

describe("budget per cause, not per day", () => {
  it("a cause that had its run today does not block the others (the 07.10.2026 case)", () => {
    const l = versucht("flows-nightly", new Date("2026-10-07T00:57:00Z"));
    const plan = waehleBefund({ offen: [inc("flows-nightly"), weather, atlas], ledger: l, jetzt, modelllaeufeHeute: 1 });
    expect(plan.befund?.key).not.toBe("flows-nightly");
    expect(plan.befund).toBeDefined();
    expect(plan.uebrig).toBe(1);
  });
  it("at most one model run per cause and German calendar day", () => {
    const l = versucht(weather.key, new Date("2026-10-07T06:00:00Z"));
    expect(waehleBefund({ offen: [weather], ledger: l, jetzt, modelllaeufeHeute: 1 }).befund).toBeUndefined();
    // 23:30 UTC on the 6th is 01:30 on the 7th in Berlin — already today's run.
    const nachts = versucht(weather.key, new Date("2026-10-06T23:30:00Z"));
    expect(waehleBefund({ offen: [weather], ledger: nachts, jetzt, modelllaeufeHeute: 1 }).befund).toBeUndefined();
    // Yesterday's run does not count against today.
    const gestern = versucht(weather.key, new Date("2026-10-06T12:00:00Z"));
    expect(waehleBefund({ offen: [weather], ledger: gestern, jetzt, modelllaeufeHeute: 0 }).befund?.key).toBe(weather.key);
  });
  it("hard cap across all causes", () => {
    const plan = waehleBefund({ offen: [weather, atlas], ledger: leeresLedger(), jetzt, modelllaeufeHeute: MAX_MODELLLAEUFE_JE_TAG });
    expect(plan.befund).toBeUndefined();
    expect(plan.grund).toContain("Tagesgrenze");
    const letzter = waehleBefund({ offen: [weather, atlas], ledger: leeresLedger(), jetzt, modelllaeufeHeute: MAX_MODELLLAEUFE_JE_TAG - 1 });
    expect(letzter.befund).toBeDefined();
    expect(letzter.uebrig).toBe(0);
    expect(MAX_MODELLLAEUFE_JE_TAG).toBeLessThanOrEqual(8);
  });
  it("operator decisions are never given to a model; urgent and escalated go first", () => {
    const op = inc("budget", { operator: true });
    expect(waehleBefund({ offen: [op], ledger: leeresLedger(), jetzt, modelllaeufeHeute: 0 }).befund).toBeUndefined();
    const plan = waehleBefund({ offen: [atlas, inc("outage", { urgent: true, firstSeen: jetzt.toISOString() }), weather], ledger: leeresLedger(), jetzt, modelllaeufeHeute: 0 });
    expect(plan.befund?.key).toBe("outage");
    expect(plan.befund?.urgent).toBe(true);
  });
  it("model runs are counted from GitHub's job history per Berlin day", () => {
    const s = (started_at: string | null, conclusion: string | null = "success", status = "completed") => ({ name: MODELLSCHRITT, conclusion, status, started_at });
    const jobs = [{ steps: [s("2026-10-07T00:57:00Z"), s("2026-10-06T23:30:00Z"), s("2026-10-06T12:00:00Z"), s(null, null, "queued"), s("2026-10-07T05:00:00Z", "skipped")] }, { steps: [s("2026-10-07T09:00:00Z", "failure")] }];
    expect(modelllaeufeAmTag(jobs, "2026-10-07")).toBe(3);
  });
});

describe("every run ends with a checkable verdict", () => {
  const ok = () => true;
  const nie = () => false;
  it("no output, garbage or an unknown verdict is silent", () => {
    for (const roh of [undefined, "", "not json", '{"ergebnis":"vielleicht","begruendung":"x"}']) {
      expect(bewerteErgebnis(roh, ok).ergebnis, String(roh)).toBe("stumm");
    }
  });
  it("'fixed' needs a commit that is really on main", () => {
    expect(bewerteErgebnis('{"ergebnis":"behoben","begruendung":"x","commit":"abc1234"}', nie).ergebnis).toBe("stumm");
    expect(bewerteErgebnis('{"ergebnis":"behoben","begruendung":"x"}', ok).ergebnis).toBe("stumm");
    expect(bewerteErgebnis('{"ergebnis":"behoben","begruendung":"x","commit":"main"}', ok).ergebnis).toBe("stumm");
    const b = bewerteErgebnis('{"ergebnis":"behoben","begruendung":"Cache-Regel fehlte.","commit":"abc1234def"}', (sha) => sha === "abc1234def");
    expect(b).toMatchObject({ ergebnis: "behoben", commit: "abc1234def" });
  });
  it("'nothing to do' and 'blocked' need a reason; 'blocked' also what is needed", () => {
    const lang = "Beide Messungen liegen bei 1,2 s, weit unter der Schwelle; der Ausreißer kam aus einem Kaltstart.";
    expect(bewerteErgebnis(JSON.stringify({ ergebnis: "kein_handlungsbedarf", begruendung: "passt" }), ok).ergebnis).toBe("stumm");
    expect(bewerteErgebnis(JSON.stringify({ ergebnis: "kein_handlungsbedarf", begruendung: lang }), ok).ergebnis).toBe("kein_handlungsbedarf");
    expect(bewerteErgebnis(JSON.stringify({ ergebnis: "blockiert", begruendung: lang }), ok).ergebnis).toBe("stumm");
    expect(bewerteErgebnis(JSON.stringify({ ergebnis: "blockiert", begruendung: lang, benoetigt: "Freigabe für eine Tabellenänderung?" }), ok).ergebnis).toBe("blockiert");
  });
  it("the marker is written before the run and closed afterwards", () => {
    const l = versucht(weather.key, jetzt, 77);
    expect(l.versuche.at(-1)?.ergebnis).toBe("laeuft");
    const zu = schliesse(l, 77, weather.key, "");
    expect(zu.versuche.at(-1)).toMatchObject({ ergebnis: "stumm", runId: 77 });
    expect(() => schliesse(zu, 77, weather.key, "")).toThrow();
    expect(readLedger(JSON.parse(JSON.stringify(zu)))).toEqual(zu);
    expect(() => readLedger({ version: 0, fehler: "x" })).toThrow();
  });
});

describe("a silent run is itself a health finding", () => {
  const frueh = new Date("2026-10-07T01:00:00Z");
  it("a silent run on an open cause is reported until that cause gets a real verdict", () => {
    let l = schliesse(versucht(weather.key, frueh, 1), 1, weather.key, "", frueh);
    expect(stummeLaeufe(l, [weather.key], jetzt).map((f) => f.key)).toEqual([`autofix-stumm:${weather.key}`]);
    // Another cause working fine does not clear it.
    l = schliesse(versucht(atlas.key, new Date("2026-10-07T02:00:00Z"), 2, l), 2, atlas.key, '{"ergebnis":"behoben","begruendung":"x","commit":"abcdef1"}');
    expect(stummeLaeufe(l, [weather.key, atlas.key], jetzt).map((f) => f.key)).toEqual([`autofix-stumm:${weather.key}`]);
    // Its own next real verdict does.
    l = schliesse(versucht(weather.key, new Date("2026-10-08T01:00:00Z"), 3, l), 3, weather.key, '{"ergebnis":"behoben","begruendung":"x","commit":"abcdef2"}');
    expect(stummeLaeufe(l, [weather.key], new Date("2026-10-08T03:00:00Z"))).toEqual([]);
  });
  it("the newest silent run is reported even when its cause recovered by itself", () => {
    const l = schliesse(versucht(weather.key, frueh, 1), 1, weather.key, "", frueh);
    expect(stummeLaeufe(l, [], jetzt)).toHaveLength(1);
    const danach = schliesse(versucht(atlas.key, new Date("2026-10-07T02:00:00Z"), 2, l), 2, atlas.key, '{"ergebnis":"behoben","begruendung":"x","commit":"abcdef1"}');
    expect(stummeLaeufe(danach, [], jetzt)).toEqual([]);
  });
  it("a run that crashed after its marker becomes silent after two hours, not before", () => {
    const l = versucht(weather.key, new Date("2026-10-07T09:00:00Z"));
    expect(stummeLaeufe(l, [weather.key], jetzt)).toEqual([]);
    expect(stummeLaeufe(l, [weather.key], new Date("2026-10-07T11:30:00Z"))).toHaveLength(1);
  });
  it("never a finding about a finding about a finding", () => {
    const k = "autofix-stumm:weather-stale";
    const l = schliesse(versucht(k, frueh, 1), 1, k, "", frueh);
    expect(stummeLaeufe(l, [k], jetzt)).toEqual([]);
  });
  it("the health check reads the ledger and turns silent runs into technical findings", () => {
    const src = readFileSync("scripts/health-check.ts", "utf8");
    expect(src).toMatch(/for \(const f of stummeLaeufe\(reparatur\.ledger, offeneKeys, new Date\(\)\)\) technical\(f\.key, false, f\.text\);/);
    expect(src.indexOf("stummeLaeufe(reparatur.ledger")).toBeLessThan(src.indexOf("const incidents = advanceIncidents("));
    expect(src).toContain('unknown.push("autofix-stumm:")');
    expect(readFileSync("scripts/health-history.ts", "utf8")).toContain("'autofix-ledger', 'ledger.json'");
    expect(readFileSync(".github/workflows/health-check.yml", "utf8")).toContain("scripts/health-history.ts");
  });
  it("absent ledger is an empty one, an unreadable one is reported as unreadable", () => {
    expect(reparaturLedgerLesen("/nonexistent/ledger.json")).toEqual({ ledger: leeresLedger() });
    const pfad = "lib/__tests__/__fixtures__/autofix-ledger-defekt.json";
    expect(reparaturLedgerLesen(pfad).fehler).toBeTruthy();
  });
});

describe("open findings are visible where sessions look", () => {
  it("each open finding shows its repair state", () => {
    let l = schliesse(versucht(atlas.key, new Date("2026-10-07T01:00:00Z"), 1), 1, atlas.key,
      JSON.stringify({ ergebnis: "blockiert", begruendung: "Die Schweizer Seiten sind absichtlich nicht freigeschaltet, die Probe trifft sie trotzdem.", benoetigt: "Soll die Probe Schweizer Orte auslassen?" }));
    l = versucht(weather.key, new Date("2026-10-07T09:30:00Z"), 2, l);
    expect(reparaturStand(atlas.key, l, jetzt)).toContain("blockiert");
    expect(reparaturStand(atlas.key, l, jetzt)).toContain("Soll die Probe");
    expect(reparaturStand(weather.key, l, jetzt)).toContain("läuft");
    expect(reparaturStand("other", l, jetzt)).toBe("noch kein Reparaturlauf");
    const state = emptyState();
    for (const i of [atlas, weather, inc("budget", { operator: true })]) state.incidents[i.key] = i;
    const zeilen = ueberwachungZeilen(state, l, jetzt).join("\n");
    expect(zeilen).toContain("3 offene Befunde");
    expect(zeilen).toContain("Soll die Probe");
    expect(zeilen).toContain("Entscheidung des Betreibers");
    expect(ueberwachungZeilen(emptyState(), l, jetzt)).toEqual(["Überwachung: keine offenen Befunde."]);
    expect(readFileSync("scripts/sessions.ts", "utf8")).toMatch(/for \(const z of ueberwachungStand\(\)\) console\.log\(z\);/);
  });
  it("findings nobody attempted for a day are listed", () => {
    const alt = inc("alt", { firstSeen: "2026-10-05T00:00:00Z" });
    const neu = inc("neu", { firstSeen: "2026-10-07T08:00:00Z" });
    const bearbeitet = inc("bearbeitet", { firstSeen: "2026-10-05T00:00:00Z" });
    const l = versucht("bearbeitet", new Date("2026-10-07T01:00:00Z"));
    expect(liegenUnbearbeitet([alt, neu, bearbeitet, inc("op", { operator: true, firstSeen: "2026-10-01T00:00:00Z" })], l, jetzt).map((i) => i.key)).toEqual(["alt"]);
  });
});

describe("trigger", () => {
  it("a failed health run without report is itself the cause; cancelled says nothing; success without report is broken", () => {
    expect(offeneAusAusloeser({ event: "workflow_run", conclusion: "failure", state: null })).toEqual([CHECK_DEFEKT]);
    expect(offeneAusAusloeser({ event: "workflow_run", conclusion: "timed_out", state: null })).toEqual([CHECK_DEFEKT]);
    expect(offeneAusAusloeser({ event: "workflow_run", conclusion: "cancelled", state: null })).toEqual([]);
    expect(() => offeneAusAusloeser({ event: "workflow_run", conclusion: "success", state: null })).toThrow();
    expect(() => offeneAusAusloeser({ event: "workflow_dispatch", state: null })).toThrow();
    const state = emptyState();
    state.incidents[weather.key] = weather;
    expect(offeneAusAusloeser({ event: "workflow_run", conclusion: "success", state }).map((f: Finding) => f.key)).toEqual([weather.key]);
  });
});

/** Minimal shell-word splitter (quotes, whitespace) — how the action reads claude_args. */
function shellWords(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  let has = false;
  for (const c of s) {
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; has = true; continue; }
    if (/\s/.test(c)) { if (has || cur) out.push(cur); cur = ""; has = false; continue; }
    cur += c;
  }
  if (has || cur) out.push(cur);
  return out;
}

describe("workflow contract", () => {
  const wf = readFileSync(".github/workflows/claude-autofix.yml", "utf8");
  const step = (name: string) => {
    const i = wf.indexOf(`      - name: ${name}\n`);
    expect(i, name).toBeGreaterThan(-1);
    const rest = wf.slice(i + 1);
    const j = rest.search(/\n {6}- (name|uses):/);
    return j < 0 ? rest : rest.slice(0, j);
  };
  it("claude_args are real CLI flags: tools, model and the verdict schema reach the model", () => {
    const block = step("Claude analysiert und behebt");
    const args = block.split("claude_args: >-\n")[1].split("\n          prompt:")[0].split("\n").map((l) => l.trim()).join(" ");
    const w = shellWords(args);
    expect(w[0]).toBe("--model");
    const tools = w[w.indexOf("--allowedTools") + 1];
    for (const t of ["Bash", "Read", "Edit", "Write", "Grep", "Glob"]) expect(tools.split(",")).toContain(t);
    expect(JSON.parse(w[w.indexOf("--json-schema") + 1])).toEqual(AUTOFIX_SCHEMA);
    expect(block).toContain("id: claude");
    expect(block).toContain("continue-on-error: true");
    // Follow-ups come from our own token; only that bot, never all bots.
    expect(block).toMatch(/\n {10}allowed_bots: github-actions\n/);
    expect(block).not.toMatch(/allowed_bots: ['"]?\*/);
  });
  it("marker before the model, verdict check always, silent run fails the workflow", () => {
    const order = ["Befund waehlen", "Versuch vormerken", "Claude analysiert und behebt", "Urteil pruefen", "Urteil sichern", "Naechsten Befund anstossen", "Stummer Lauf"]
      .map((n) => wf.indexOf(`      - name: ${n}\n`));
    expect(order.every((x, i) => x > -1 && (i === 0 || x > order[i - 1]))).toBe(true);
    expect(step("Urteil pruefen")).toContain("if: always()");
    expect(step("Urteil pruefen")).toContain("steps.claude.outputs.structured_output");
    expect(step("Urteil sichern")).toContain("if: always()");
    expect(step("Versuch vormerken")).toContain("name: autofix-ledger");
    const stumm = step("Stummer Lauf");
    expect(stumm).toContain("if: always()");
    expect(stumm).toContain("exit 1");
    for (const e of ["behoben", "kein_handlungsbedarf", "blockiert"]) expect(stumm).toContain(`!= '${e}'`);
  });
  it("one cause per run, follow-up dispatched, no issues and no mail", () => {
    expect(step("Befund waehlen")).toContain("scripts/autofix-plan.ts");
    expect(step("Naechsten Befund anstossen")).toContain("gh workflow run claude-autofix.yml --ref main -f folge=true");
    expect(wf).toContain("actions: write");
    expect(wf).not.toContain("issues: write");
    expect(wf).toContain("Lege KEIN GitHub-Issue an");
    expect(wf).toContain("${{ steps.plan.outputs.key }}");
    expect(wf).not.toMatch(/Tagesbremse|autofix-budget/);
  });
});

import { PFLICHTPRUEFUNG, lieferSchritt, zweigFuer } from "../../scripts/autofix-deliver";

describe("delivery through the gate (main is branch-protected)", () => {
  it("ships only a commit whose gate check passed and that contains main", () => {
    expect(lieferSchritt(undefined, true)).toBe("warten");
    expect(lieferSchritt({ status: "in_progress", conclusion: null }, true)).toBe("warten");
    expect(lieferSchritt({ status: "completed", conclusion: "failure" }, true)).toBe("abgelehnt");
    expect(lieferSchritt({ status: "completed", conclusion: "cancelled" }, true)).toBe("abgelehnt");
    expect(lieferSchritt({ status: "completed", conclusion: "success" }, false)).toBe("neu_aufsetzen");
    expect(lieferSchritt({ status: "completed", conclusion: "success" }, true)).toBe("uebernehmen");
  });
  it("the gate name is the one main requires, and CI can be dispatched on the fix branch", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(ci).toContain(`name: ${PFLICHTPRUEFUNG}\n`);
    expect(ci).toMatch(/\n  workflow_dispatch:/);
    const deliver = readFileSync("scripts/autofix-deliver.ts", "utf8");
    expect(deliver).toContain('gh("workflow", "run", "ci.yml", "--ref", zweig)');
    expect(deliver).toContain("`${sha}:refs/heads/main`");
    expect(zweigFuer(42)).toBe("autofix/42");
  });
  it("a fix that failed the gate is recorded as blocked, a rebased one counts with its shipped commit", () => {
    const roh = '{"ergebnis":"behoben","begruendung":"Stichprobe nahm Schweizer Orte.","commit":"abc1234"}';
    const abgelehnt = bewerteErgebnis(roh, () => false, { abgelehnt: "fiel in der Pflichtprüfung durch" });
    expect(abgelehnt.ergebnis).toBe("blockiert");
    expect(abgelehnt.begruendung).toContain("nicht ausgeliefert");
    const rebased = bewerteErgebnis(roh, (sha) => sha === "def5678", { geliefert: "def5678" });
    expect(rebased).toMatchObject({ ergebnis: "behoben", commit: "def5678" });
    expect(bewerteErgebnis(roh, () => false, {}).ergebnis).toBe("stumm");
  });
  it("the model pushes to its own branch, never to main; delivery runs before the verdict check", () => {
    const wf = readFileSync(".github/workflows/claude-autofix.yml", "utf8");
    expect(wf).toContain("git push origin HEAD:refs/heads/autofix/${{ github.run_id }}");
    expect(wf).toContain("NIE auf main");
    expect(wf.indexOf("      - name: Fix ausliefern\n")).toBeGreaterThan(wf.indexOf("      - name: Claude analysiert und behebt\n"));
    expect(wf.indexOf("      - name: Fix ausliefern\n")).toBeLessThan(wf.indexOf("      - name: Urteil pruefen\n"));
    expect(wf).toContain("ABGELEHNT: ${{ steps.liefern.outputs.abgelehnt }}");
    expect(readFileSync("scripts/autofix-outcome.ts", "utf8")).toContain("abgelehnt: process.env.ABGELEHNT");
  });
});
