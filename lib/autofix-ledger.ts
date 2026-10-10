/**
 * The repair lane's memory: which open health finding got a model run, when,
 * and what came out of it.
 *
 * WHY THIS EXISTS (07.10.2026): The autofix had one budget for the whole day.
 * The first finding of the day used it, the run ended after 19 seconds without
 * a commit, an issue or a verdict, and every later finding waited until the
 * next day — "Findings remain open and can escalate", with nobody looking. Two
 * mistakes in one: one finding blocked all others, and a run that produced
 * nothing looked exactly like a run that worked.
 *
 * Three rules, each tested:
 *  - Budget per CAUSE: at most one model run per finding key and German
 *    calendar day, plus a hard cap across all causes.
 *  - Every run ends with a checkable verdict. "fixed" needs a commit that is
 *    really on main, "nothing to do" and "blocked" need a written reason.
 *    Anything else is SILENT — and a silent run is itself a health finding.
 *  - The state of each open finding is readable where sessions look (the
 *    health report and `npm run sessions`), never as a mail.
 *
 * Pure functions only: no clock, no network. Time and data come from outside.
 */
import type { Finding, Incident } from "./health-incidents";
import { tagInBerlin } from "./zeit";

export type Ergebnis = "laeuft" | "behoben" | "kein_handlungsbedarf" | "blockiert" | "stumm";
export type Versuch = {
  key: string;
  text: string;
  tag: string;
  start: string;
  runId: number;
  ergebnis: Ergebnis;
  ende?: string;
  begruendung?: string;
  benoetigt?: string;
  commit?: string;
};
export type Ledger = { version: 1; versuche: Versuch[] };
export const leeresLedger = (): Ledger => ({ version: 1, versuche: [] });

/** Hard cap across all causes. Each run also has a 30-minute job timeout. */
export const MAX_MODELLLAEUFE_JE_TAG = 6;
/** A run that started this long ago without a verdict has crashed. */
export const STUMM_NACH_STUNDEN = 2;
/** An open finding without any attempt for this long is reported as unattended. */
export const LIEGT_NACH_STUNDEN = 26;
const AUFBEWAHRUNG_TAGE = 60;
const MIN_BEGRUENDUNG = 40;
const MIN_BENOETIGT = 10;
const ERGEBNISSE: Ergebnis[] = ["laeuft", "behoben", "kein_handlungsbedarf", "blockiert", "stumm"];

/** The verdict the model must return. The workflow passes exactly this schema. */
export const AUTOFIX_SCHEMA = {
  type: "object",
  properties: {
    ergebnis: { type: "string", enum: ["behoben", "kein_handlungsbedarf", "blockiert"] },
    commit: { type: "string" },
    begruendung: { type: "string" },
    benoetigt: { type: "string" },
  },
  required: ["ergebnis", "begruendung"],
  additionalProperties: false,
} as const;

/** Synthetic cause when the health check itself broke and left no report. */
export const CHECK_DEFEKT: Finding = {
  key: "health-check:defekt",
  text: "Der Gesundheitscheck lief nicht durch und hat keinen Messbericht hinterlassen.",
};

export function readLedger(value: unknown): Ledger {
  const l = value as Ledger;
  if (l?.version !== 1 || !Array.isArray(l.versuche)) throw new Error("Invalid autofix ledger");
  for (const v of l.versuche) {
    if (typeof v.key !== "string" || typeof v.tag !== "string" || !Number.isFinite(Date.parse(v.start)) || !Number.isInteger(v.runId) || !ERGEBNISSE.includes(v.ergebnis)) {
      throw new Error("Invalid autofix ledger entry");
    }
  }
  return l;
}

const tagVon = (iso: string) => tagInBerlin(new Date(iso));
const stunden = (von: string, jetzt: Date) => (jetzt.getTime() - Date.parse(von)) / 3_600_000;

/** Counts model runs from GitHub's own job history — independent of the ledger. */
type Job = { steps?: { name: string; conclusion: string | null; status: string; started_at?: string | null }[] };
export const MODELLSCHRITT = "Claude analysiert und behebt";
export function modelllaeufeAmTag(jobs: Job[], tag: string): number {
  let n = 0;
  for (const job of jobs) {
    for (const s of job.steps ?? []) {
      if (s.name === MODELLSCHRITT && s.conclusion !== "skipped" && s.status !== "queued" && s.started_at && tagVon(s.started_at) === tag) n++;
    }
  }
  return n;
}

export type Plan = { befund?: Finding; uebrig: number; grund: string };

/**
 * Which open finding gets the next model run. Operator decisions are never
 * repaired by a model; each cause gets at most one run per day; urgent and
 * escalated causes go first, then the oldest.
 */
export function waehleBefund(args: { offen: Incident[] | Finding[]; ledger: Ledger; jetzt: Date; modelllaeufeHeute: number; manuell?: boolean }): Plan {
  const { offen, ledger, jetzt, modelllaeufeHeute, manuell = false } = args;
  const tag = tagInBerlin(jetzt);
  const frei = MAX_MODELLLAEUFE_JE_TAG - modelllaeufeHeute;
  const heute = new Set(ledger.versuche.filter((v) => v.tag === tag).map((v) => v.key));
  const offeneKeys = new Set(offen.map((f) => f.key));
  const kandidaten = (offen as (Finding & Partial<Incident>)[])
    .filter((f) => !f.operator)
    // A silent run on a still-open cause is repaired by that cause's next run,
    // not by a run of its own: otherwise every silence costs a second budget
    // unit and the cause itself keeps its silent state (measured 07.10.2026).
    .filter((f) => !(f.key.startsWith("autofix-stumm:") && offeneKeys.has(f.key.slice("autofix-stumm:".length))))
    .filter((f) => manuell || !heute.has(f.key))
    .sort((a, b) =>
      Number(!!b.urgent) - Number(!!a.urgent) ||
      Number(!!b.escalated) - Number(!!a.escalated) ||
      (Date.parse(a.firstSeen ?? "") || 0) - (Date.parse(b.firstSeen ?? "") || 0) ||
      a.key.localeCompare(b.key));
  if (!kandidaten.length) return { uebrig: 0, grund: offen.length ? "Jeder offene Befund hatte heute schon seinen Reparaturlauf." : "Kein offener Befund." };
  if (frei <= 0 && !manuell) return { uebrig: 0, grund: `Tagesgrenze von ${MAX_MODELLLAEUFE_JE_TAG} Reparaturläufen erreicht; ${kandidaten.length} Befunde warten bis morgen.` };
  const [befund, ...rest] = kandidaten;
  return {
    befund: { key: befund.key, text: befund.text, urgent: befund.urgent },
    uebrig: Math.max(0, Math.min(rest.length, frei - 1)),
    grund: `Reparaturlauf für ${befund.key}.`,
  };
}

/** The marker is written BEFORE the model runs: a crash then shows as silent, never as "not tried". */
export function beginneVersuch(ledger: Ledger, befund: Finding, jetzt: Date, runId: number): Ledger {
  const grenze = jetzt.getTime() - AUFBEWAHRUNG_TAGE * 86_400_000;
  return {
    version: 1,
    versuche: [
      ...ledger.versuche.filter((v) => Date.parse(v.start) >= grenze),
      { key: befund.key, text: befund.text, tag: tagInBerlin(jetzt), start: jetzt.toISOString(), runId, ergebnis: "laeuft" },
    ],
  };
}

export type Bewertung = { ergebnis: Exclude<Ergebnis, "laeuft">; begruendung: string; benoetigt?: string; commit?: string };

/**
 * Turns the model's raw structured output into a verdict we can check. Claims
 * are not believed: "fixed" without a commit on main is silent, a reason that
 * says nothing is silent, and no output at all is silent.
 */
export type Lieferung = { geliefert?: string; abgelehnt?: string };
export function bewerteErgebnis(roh: string | undefined, commitAufMain: (sha: string) => boolean, lieferung: Lieferung = {}): Bewertung {
  let o: Record<string, unknown> | null = null;
  try {
    o = roh?.trim() ? JSON.parse(roh) : null;
  } catch {
    o = null;
  }
  if (!o || typeof o !== "object") return { ergebnis: "stumm", begruendung: "Der Lauf endete ohne Urteil (kein Commit, keine Begründung)." };
  const begruendung = typeof o.begruendung === "string" ? o.begruendung.trim() : "";
  const benoetigt = typeof o.benoetigt === "string" ? o.benoetigt.trim() : "";
  const gemeldet = typeof o.commit === "string" ? o.commit.trim() : "";
  // The delivery step may have rebased the fix: then the shipped commit counts.
  const commit = lieferung.geliefert || gemeldet;
  if (o.ergebnis === "behoben" && lieferung.abgelehnt) {
    // A fix that did not pass the gate is a result, not silence — and not a fix.
    return { ergebnis: "blockiert", begruendung: `${begruendung || "Fix gebaut"} — nicht ausgeliefert: ${lieferung.abgelehnt}`, benoetigt: "Ein neuer Reparaturlauf am nächsten Tag; vorher den Prüflauf des Fix-Zweigs ansehen.", commit: gemeldet };
  }
  if (o.ergebnis === "behoben") {
    if (!/^[0-9a-f]{7,40}$/i.test(commit) || !commitAufMain(commit)) {
      return { ergebnis: "stumm", begruendung: `Der Lauf meldete „behoben“, aber der genannte Commit (${commit || "keiner"}) liegt nicht auf main.` };
    }
    return { ergebnis: "behoben", begruendung: begruendung || "(ohne Begründung)", commit };
  }
  if (o.ergebnis === "kein_handlungsbedarf") {
    if (begruendung.length < MIN_BEGRUENDUNG) return { ergebnis: "stumm", begruendung: "„Nichts zu tun“ ohne nachvollziehbare Begründung." };
    return { ergebnis: "kein_handlungsbedarf", begruendung };
  }
  if (o.ergebnis === "blockiert") {
    if (begruendung.length < MIN_BEGRUENDUNG || benoetigt.length < MIN_BENOETIGT) return { ergebnis: "stumm", begruendung: "„Blockiert“ ohne Begründung oder ohne Angabe, was gebraucht wird." };
    return { ergebnis: "blockiert", begruendung, benoetigt };
  }
  return { ergebnis: "stumm", begruendung: "Der Lauf lieferte ein Urteil, das es nicht gibt." };
}

export function schliesseVersuch(ledger: Ledger, runId: number, key: string, b: Bewertung, jetzt: Date): Ledger {
  let gefunden = false;
  const versuche = ledger.versuche.map((v) => {
    if (v.runId !== runId || v.key !== key || v.ergebnis !== "laeuft") return v;
    gefunden = true;
    return { ...v, ...b, ende: jetzt.toISOString() };
  });
  if (!gefunden) throw new Error(`No open attempt for ${key} in run ${runId}`);
  return { version: 1, versuche };
}

/** The decided state of an attempt: a "running" marker past its time is silent. */
function entschieden(v: Versuch, jetzt: Date): Ergebnis {
  return v.ergebnis === "laeuft" && stunden(v.start, jetzt) > STUMM_NACH_STUNDEN ? "stumm" : v.ergebnis;
}

function letzterJeKey(ledger: Ledger): Map<string, Versuch> {
  const m = new Map<string, Versuch>();
  for (const v of [...ledger.versuche].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) m.set(v.key, v);
  return m;
}

/**
 * Silent runs as health findings. One per cause whose LATEST attempt was
 * silent while the cause is still open — and the newest attempt overall, even
 * if its cause has since recovered: a silent repair lane is a defect whether
 * or not the original finding went away by itself.
 */
export function stummeLaeufe(ledger: Ledger, offeneKeys: string[], jetzt: Date): Finding[] {
  const neuester = [...ledger.versuche].sort((a, b) => Date.parse(b.start) - Date.parse(a.start)).find((v) => entschieden(v, jetzt) !== "laeuft");
  const out: Finding[] = [];
  for (const [key, v] of letzterJeKey(ledger)) {
    if (key.startsWith("autofix-stumm:")) continue; // never a finding about a finding about a finding
    if (entschieden(v, jetzt) !== "stumm") continue;
    if (!offeneKeys.includes(key) && v !== neuester) continue;
    const wie = v.ergebnis === "laeuft" ? "brach ab, bevor er ein Urteil abgab" : `endete ohne nachprüfbares Ergebnis (${v.begruendung ?? "kein Urteil"})`;
    out.push({
      key: `autofix-stumm:${key}`,
      text: `Der Reparaturlauf vom ${v.tag} für „${v.text}“ ${wie}. Ein stummer Lauf ist ein Ausfall der Reparatur, kein Ergebnis: Werkzeugfreigabe, Prompt und Ergebnis des Laufs nachsehen.`,
    });
  }
  return out;
}

/** One line per open finding: has anyone worked on it, and with what result. */
export function reparaturStand(key: string, ledger: Ledger, jetzt: Date): string {
  const v = letzterJeKey(ledger).get(key);
  if (!v) return "noch kein Reparaturlauf";
  const e = entschieden(v, jetzt);
  const wann = `am ${v.tag}`;
  if (e === "laeuft") return `Reparaturlauf läuft seit ${v.start.slice(11, 16)} UTC`;
  if (e === "behoben") return `${wann} behoben mit ${v.commit?.slice(0, 7)} — wirkt erst, wenn die nächste Messung grün ist`;
  if (e === "kein_handlungsbedarf") return `${wann} geprüft, nichts zu tun: ${v.begruendung}`;
  if (e === "blockiert") return `${wann} blockiert: ${v.begruendung} — gebraucht wird: ${v.benoetigt}`;
  return `${wann} ohne Ergebnis (stummer Lauf)`;
}

/** Open, repairable findings nobody has attempted for a day — the cap or a broken lane. */
export function liegenUnbearbeitet(offen: Incident[], ledger: Ledger, jetzt: Date): Incident[] {
  const letzte = letzterJeKey(ledger);
  return offen.filter((i) => {
    if (i.operator || stunden(i.firstSeen, jetzt) < LIEGT_NACH_STUNDEN) return false;
    const v = letzte.get(i.key);
    return !v || stunden(v.start, jetzt) >= LIEGT_NACH_STUNDEN;
  });
}
