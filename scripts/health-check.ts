/**
 * Production-Gesundheitscheck — misst, was ein Nutzer wirklich erlebt.
 *
 * WARUM ES DAS GIBT (24.–26.07.2026): Der Solar-Atlas warf zwei Tage lang 500er,
 * ohne dass es jemand merkte — bis der Betreiber zufällig selbst draufklickte.
 * Ursache war die Function-Region (Washington statt Frankfurt, siehe
 * lib/db-timeout.ts). Aber die eigentliche Lücke war das Messen: Beim Perf-Fix
 * am 21.07. wurde in Production gemessen (Gemeinde kalt 1,8 s) — danach nie
 * wieder. Zwischen dem 21. und dem 24. gingen ein Dutzend Atlas-Änderungen live,
 * jede kostete etwas Renderzeit, und irgendwann stieß die Summe an den 8-s-
 * Fast-Fail. EIN MESSWERT IST KEIN ZUSTAND. Deshalb läuft diese Messung
 * wiederkehrend in GitHub Actions statt einmalig von Hand.
 *
 * Der Frühindikator ist der ABSTAND ZUR NOTBREMSE, nicht der Statuscode: eine
 * Seite, die 6 s statt 1 s braucht, liefert noch sauber 200 und steht trotzdem
 * kurz vorm Kippen. Der Check schlägt deshalb bei Zeiten an, LANGE bevor der
 * erste Fehler auftritt.
 *
 * Aufruf:
 *   npm run health-check            # prüft, Exit 1 bei ROT
 *   npm run health-check -- --alert # zusätzlich Mail über /api/alert
 *
 * Env (alle optional außer bei --alert):
 *   HEALTH_BASE_URL        default https://solar-check.io
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY   für die Zufalls-Gemeinde (sonst Fallback-Liste)
 *   CRON_SECRET            für --alert
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DB_READ_TIMEOUT_MS } from "../lib/db-timeout";

// In der GitHub-Action kommen die Zugangsdaten aus den Repo-Secrets. Lokal
// standen sie nicht zur Verfügung — der Check fiel dann still auf die feste
// Gemeindeliste zurück, maß Cache-Treffer statt Kaltrender und ließ die
// Datenbank-Messung ganz aus. Ein Wächter, der lokal etwas anderes prüft als
// in der Action, ist keine Probe aufs Exempel.
(function loadEnvFile() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const BASE_URL = (process.env.HEALTH_BASE_URL ?? "https://solar-check.io").replace(/\/$/, "");
const ALERT = process.argv.includes("--alert");

// Die Function-Region MUSS in der EU liegen — Supabase steht in eu-central-1.
// Aus iad1 kostete jeder DB-Roundtrip ~90 ms, und eine Atlas-Seite macht
// Dutzende davon. Das zweite Segment von `x-vercel-id` ist die Function-Region.
const EXPECTED_REGION = "fra1";

// Schwellen in Sekunden. Der Atlas-Kaltrender ist der teuerste Fall (die meisten
// der ~11k Gemeindeseiten hat nie jemand aufgerufen, jeder Erstbesucher zahlt
// den vollen Render). Rot liegt bewusst deutlich unter der Notbremse: bei 5 s
// ist noch Luft zum Reagieren, bei 8 s ist die Seite tot.
//
// Gelb sitzt bei 4 s und nicht enger: der Normalbereich lag nach dem
// Frankfurt-Umzug bei 1,8–3,2 s, eine Warnschwelle mittendrin würde bei fast
// jedem Lauf anschlagen. Eine Warnung, die immer angeht, liest nach zwei Wochen
// niemand mehr — und dann geht auch die rote unter.
const SLOW = { atlasCold: { warn: 4.0, fail: 5.0 }, page: { warn: 2.0, fail: 4.0 } };

const NOTBREMSE_S = DB_READ_TIMEOUT_MS / 1000;

/** Seiten, die immer schnell sein müssen (statisch oder gut gecacht). */
const PAGES = [
  "/",
  "/photovoltaik-rechner",
  "/waermepumpe-rechner",
  "/strommix-deutschland",
  "/solar-atlas",
];

/** Notnagel, falls die DB gerade nicht erreichbar ist — echte, dauerhaft
 *  existierende Gemeinden. Bewusst klein: der Regelweg ist die Zufallsauswahl. */
const FALLBACK_GEMEINDEN = [
  "/solar-atlas/bayern/landkreis-wuerzburg/eisingen",
  "/solar-atlas/hessen/landkreis-fulda/hilders",
  "/solar-atlas/sachsen/landkreis-bautzen/wilthen",
];

type Probe = { label: string; url: string; status: number; seconds: number; cache: string; region: string };

/** Ein Aufruf, gemessen wie ein Browser ihn erlebt (inkl. Verbindungsaufbau). */
async function probe(label: string, path: string): Promise<Probe> {
  const url = `${BASE_URL}${path}`;
  const started = Date.now();
  let status = 0;
  let cache = "";
  let region = "";
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "solar-check-health-check" },
      signal: AbortSignal.timeout(30000),
    });
    status = res.status;
    cache = res.headers.get("x-vercel-cache") ?? "";
    // `x-vercel-id` hat zwei Formen: "fra1::hash" wenn die Antwort rein aus dem
    // CDN kam (keine Function beteiligt, also auch keine Region zu prüfen) und
    // "edge::function::hash" wenn eine Function lief. Nur im zweiten Fall steht
    // in Segment 2 die Function-Region — sonst liest man den Request-Hash als
    // Region und meldet Unsinn.
    const idParts = (res.headers.get("x-vercel-id") ?? "").split("::");
    region = idParts.length >= 3 ? idParts[1] : "";
    await res.arrayBuffer(); // vollständig lesen, sonst misst man nur die Header
  } catch (e) {
    status = 0;
    cache = e instanceof Error ? e.name : "fetch failed";
  }
  return { label, url, status, seconds: (Date.now() - started) / 1000, cache, region };
}

/** Zufällige Gemeinde-Pfade aus der DB — ein leichter Read, kein Aggregat.
 *  Zufällig, weil eine feste Seite nach dem ersten Lauf im Cache läge und der
 *  Check dann 0,1 s misst statt des Kaltrenders, den ein echter Erstbesucher zahlt. */
async function randomGemeindePaths(count: number): Promise<string[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const q = async (path: string) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(15000) });
    return res.ok ? ((await res.json()) as Record<string, string | null>[]) : [];
  };

  // JE STICHPROBE EIN EIGENER ZUFALLS-OFFSET, nicht ein Ausschnitt von `count`
  // aufeinanderfolgenden Zeilen: die Gemeindeliste ist nach AGS sortiert, ein
  // zusammenhängender Ausschnitt liegt also fast immer im GLEICHEN Landkreis.
  // Die teuren Daten (Kreis-Rangliste, Kreis-/Land-Kennzahlen) sind aber je
  // Kreis gecacht — nur die erste Seite eines Kreises ist wirklich kalt, die
  // übrigen liefen auf einem warmen Cache und meldeten beruhigende Zeiten für
  // einen Fall, den kein Erstbesucher je erlebt (gemessen 28.07.2026: gleicher
  // Kreis 1,0–1,2 s, verteilt über die Republik dieselbe Streuung — aber eben
  // ohne den Cache-Vorteil).
  const gem: Record<string, string | null>[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.floor(Math.random() * 10000);
    const [row] = await q(
      `mastr_regions?select=slug,parent_region_id&level=eq.gemeinde&slug=not.is.null&limit=1&offset=${offset}`,
    );
    if (row) gem.push(row);
  }
  if (!gem.length) return [];

  // Zu jeder Gemeinde Kreis + Bundesland auflösen (der Pfad ist dreistufig).
  const kreisIds = Array.from(new Set(gem.map((g) => g.parent_region_id).filter(Boolean)));
  const kreise = await q(`mastr_regions?select=region_id,slug,parent_region_id&region_id=in.(${kreisIds.join(",")})`);
  const landIds = Array.from(new Set(kreise.map((k) => k.parent_region_id).filter(Boolean)));
  const laender = await q(`mastr_regions?select=region_id,slug&region_id=in.(${landIds.join(",")})`);

  const kreisById = new Map(kreise.map((k) => [k.region_id!, k]));
  const landById = new Map(laender.map((l) => [l.region_id!, l]));

  const paths: string[] = [];
  for (const g of gem) {
    const k = kreisById.get(g.parent_region_id ?? "");
    const l = k ? landById.get(k.parent_region_id ?? "") : undefined;
    if (k?.slug && l?.slug && g.slug) paths.push(`/solar-atlas/${l.slug}/${k.slug}/${g.slug}`);
  }
  return paths;
}

/** Wie viele Gemeinden pro Lauf frisch aufgebaut werden.
 *
 *  BEWUSST MEHR ALS EINE: Die Kaltrender-Zeiten streuen stark (gemessen am
 *  26.07.2026 zwischen 0,4 s und 5,2 s, je nachdem wie viele Anlagen und
 *  Nachbargemeinden eine Gemeinde hat). Eine einzelne Stichprobe kann deshalb
 *  grün melden, während ein Drittel der Seiten nah an der Notbremse steht —
 *  genau so ist die Perf-Runde vom 21.07. zu ihrem beruhigenden 1,8-s-Wert
 *  gekommen. Gewertet wird der LANGSAMSTE Treffer, nicht der Durchschnitt: die
 *  Notbremse trifft ja auch die langsamste Seite zuerst. */
const COLD_SAMPLES = 3;

/**
 * Die teuersten Datenbank-Aufrufe des Atlas, direkt gemessen — unabhängig davon,
 * ob gerade jemand die Seiten aufruft.
 *
 * WARUM ZUSÄTZLICH ZU DEN SEITENZEITEN (28.07.2026): Der Seiten-Kaltrender ist
 * ein Spätindikator. Eine Gemeindeseite lud allein in 1,2 s — grün — während
 * dieselbe Seite jeden Aufruf zwei vollständige Durchläufe über 591.024
 * Datenbankzeilen kostete. Sobald mehrere Seiten gleichzeitig aufgebaut wurden
 * (Crawler, Aufwärmlauf, Suchmaschine), stauten die sich auf und rissen die
 * 8-s-Notbremse: 3,2–6,3 s je Seite und reihenweise Abbrüche. Der Check meldete
 * bis dahin grün, weil er immer nur EINE Seite allein maß.
 *
 * Ein einzelner Aufruf dieser Funktionen dauert bei gesundem Zustand ~0 ms
 * Datenbankarbeit (der Rest ist Netzlaufzeit von diesem Rechner aus). Zieht der
 * Wert auf ein Vielfaches an, ist ein Index unbenutzt oder ein vorberechneter
 * Rollup leer — beides lange bevor eine Seite auffällig wird.
 */
const DB_PROBE_WARN_MS = 250;
const DB_PROBE_FAIL_MS = 400;

type DbProbe = { label: string; ms: number; baselineMs: number; error?: string };

/**
 * Bewertung einer einzelnen Atlas-Abfrage.
 *
 * Die Schwellen sitzen bewusst weit unter dem, was auf der Seite auffällt: der
 * kaputte Zustand lag bei ~600 ms je Aufruf und ZWEI Aufrufen pro Gemeindeseite,
 * der gesunde bei ~80 ms (davon fast alles Netzlaufzeit). Rot bei 400 ms trifft
 * damit den Rückfall sicher, ohne bei einem langsamen Netz anzuschlagen.
 *
 * Erzwungen von lib/__tests__/health-check-db-probe.test.ts — wer eine Schwelle
 * anhebt, damit ein Befund verschwindet, lässt den Test fallen. Genau das ist
 * die Regel aus CLAUDE.md („kein Hochsetzen der Schwellen, damit ein Befund
 * verschwindet"): das versteckt den Rückfall, statt ihn zu beheben.
 */
export function dbProbeVerdict(ms: number): "gruen" | "gelb" | "rot" {
  if (ms >= DB_PROBE_FAIL_MS) return "rot";
  if (ms >= DB_PROBE_WARN_MS) return "gelb";
  return "gruen";
}

/**
 * Struktureller Rückfall — oder ist gerade nur viel los?
 *
 * Beide sehen in der reinen Millisekundenzahl gleich aus, verlangen aber
 * gegenteilige Reaktionen. Am 28.07.2026 meldete der Check 562/576 ms und damit
 * ROT; die Funktionen in der Datenbank waren aber unverändert richtig, die Last
 * kam von einem parallel laufenden Auswertungs-Skript. Zehn Minuten später lagen
 * dieselben Abfragen wieder bei 62–94 ms.
 *
 * Die Unterscheidung liefert ein LEICHTER Vergleichs-Read (Punkt-Zugriff auf
 * eine Mini-Tabelle) im selben Lauf:
 *   - Gesund kostet eine Atlas-Abfrage praktisch nur Netzlaufzeit, ist also
 *     etwa so schnell wie der Vergleichs-Read.
 *   - Beim Rückfall auf den vollen Tabellendurchlauf kommen ~500 ms DB-Arbeit
 *     obendrauf, während der Vergleichs-Read schnell bleibt.
 *   - Ist die Datenbank nur beschäftigt, werden BEIDE langsamer.
 * Gewertet wird deshalb der Abstand zum Vergleichs-Read, nicht der Rohwert.
 *
 * Die Schwellen bleiben unangetastet — sie hochzusetzen wäre genau das
 * Verstecken, das CLAUDE.md verbietet. Geschärft wird nur die Frage.
 */
export function dbProbeVerdictRelativ(ms: number, baselineMs: number): "gruen" | "gelb" | "rot" {
  // Der Vergleichs-Read schwankt selbst, und unter seinen Wert kann keine
  // Abfrage fallen. Der Sockel von 60 ms verhindert, dass ein zufällig sehr
  // schneller Vergleichs-Read die Bewertung künstlich verschärft.
  return dbProbeVerdict(ms - Math.max(baselineMs, 60) + 60);
}

async function measureAtlasQueries(): Promise<DbProbe[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];

  // Vergleichs-Read VOR den Atlas-Abfragen: dieselbe Strecke, aber ohne
  // nennenswerte Datenbankarbeit. Er trennt „Abfrage kaputt" von „Datenbank
  // gerade beschäftigt" (siehe dbProbeVerdictRelativ).
  const baselineStart = Date.now();
  let baselineMs = 0;
  try {
    const r = await fetch(`${url}/rest/v1/mastr_meta?select=imported_at&id=eq.1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    await r.text();
    baselineMs = Date.now() - baselineStart;
  } catch {
    // Scheitert der Vergleichs-Read, bleibt baselineMs bei 0 — dann gilt wieder
    // die harte Schwelle. Die Prüfung wird durch einen Ausfall nie milder.
  }

  // Die drei Aufrufe, die jede Gemeindeseite macht — je einer auf Gemeinde-,
  // Kreis- und Bundesebene, damit auch ein leerer Rollup auffällt.
  const calls: { label: string; fn: string; args: Record<string, unknown> }[] = [
    {
      label: "Gemeinde-Kennzahlen",
      fn: "mastr_region_series",
      args: { p_prefix: "05558028", p_traeger: ["solar", "speicher", "wind", "biomasse", "wasser"] },
    },
    {
      label: "Kreis-Rangliste",
      fn: "mastr_children_by_year",
      args: { p_prefix: "05558", p_child_len: 8, p_traeger: ["solar", "speicher"], p_year_min: null },
    },
    {
      label: "Bundesland-Kennzahlen",
      fn: "mastr_region_series",
      args: { p_prefix: "05", p_traeger: ["solar", "speicher", "wind", "biomasse", "wasser"] },
    },
  ];

  const out: DbProbe[] = [];
  for (const c of calls) {
    const started = Date.now();
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${c.fn}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify(c.args),
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.text();
      out.push({
        label: c.label,
        ms: Date.now() - started,
        baselineMs,
        error: res.ok ? undefined : `${res.status} ${body.slice(0, 120)}`,
      });
    } catch (e) {
      out.push({ label: c.label, ms: Date.now() - started, baselineMs, error: e instanceof Error ? e.message : "Abbruch" });
    }
  }
  return out;
}

/** Misst echte Kaltrender. Ein Treffer im Cache misst nichts Interessantes (dann
 *  liefert das CDN eine fertige Seite aus), solche Versuche zählen nicht mit. */
async function measureColdAtlas(): Promise<{ worst: Probe; all: Probe[] } | null> {
  const candidates = [...(await randomGemeindePaths(COLD_SAMPLES + 2)), ...FALLBACK_GEMEINDEN];
  const hits: Probe[] = [];
  for (const path of candidates) {
    if (hits.length >= COLD_SAMPLES) break;
    const p = await probe("Atlas-Gemeinde (kalt)", path);
    // NUR `MISS` ist ein echter Kaltaufbau. `HIT` und `STALE` liefern beide eine
    // fertige Seite aus dem CDN aus (bei STALE wird nur im Hintergrund erneuert)
    // — beides misst 0,05 s und sagt über den Aufbau nichts. Vorher zählte STALE
    // mit und konnte einen Lauf grün melden, in dem gar nichts aufgebaut wurde.
    if (p.cache === "MISS") hits.push(p);
  }
  if (!hits.length) return null;
  return { worst: hits.reduce((a, b) => (b.seconds > a.seconds ? b : a)), all: hits };
}

/**
 * Selbstheilung für den einen Befund, der eine eindeutig richtige Antwort hat:
 * die Function-Region. Fehlt `regions` in vercel.json, wird der Eintrag wieder
 * gesetzt — es gibt keinen zweiten sinnvollen Wert, solange die Datenbank in
 * Frankfurt steht. Steht dort etwas ANDERES, hat das ein Mensch entschieden;
 * dann wird nur gemeldet. (Gleiche Linie wie beim Förder-Wächter: selbstheilen
 * nur in der sicheren Richtung, alles Mehrdeutige bleibt Vorschlag.)
 *
 * Das Committen übernimmt der Aufrufer (GitHub-Action) — hier wird nur die
 * Datei korrigiert, damit die Funktion auch lokal gefahrlos läuft.
 */
export function healRegionConfig(
  path = "vercel.json",
): "repariert" | "abweichend" | "schon-richtig" | "nicht-lesbar" {
  let cfg: Record<string, unknown>;
  try {
    cfg = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return "nicht-lesbar";
  }

  const current = cfg.regions;
  if (Array.isArray(current) && current.length) {
    return current.length === 1 && current[0] === EXPECTED_REGION ? "schon-richtig" : "abweichend";
  }

  cfg.regions = [EXPECTED_REGION];
  // Schlüssel-Reihenfolge stabil halten (regions direkt nach git), damit der
  // Diff klein bleibt und nicht die ganze Datei umsortiert wird.
  const ordered: Record<string, unknown> = {};
  if ("git" in cfg) ordered.git = cfg.git;
  ordered.regions = cfg.regions;
  for (const [k, val] of Object.entries(cfg)) if (k !== "git" && k !== "regions") ordered[k] = val;
  writeFileSync(path, `${JSON.stringify(ordered, null, 2)}\n`);
  return "repariert";
}

function verdict(seconds: number, limits: { warn: number; fail: number }): "gruen" | "gelb" | "rot" {
  if (seconds >= limits.fail) return "rot";
  if (seconds >= limits.warn) return "gelb";
  return "gruen";
}

/** Ab so vielen roten Läufen hintereinander kommt der Betreiber ins Spiel. */
export const ESKALATION_AB_LAEUFEN = 3;

/**
 * Kommt die automatische Reparatur nicht weiter?
 *
 * Ein roter Lauf ist KEINE Nachricht an den Betreiber: der Workflow wird rot,
 * die Autofix-Action springt an, und in aller Regel ist die Sache beim nächsten
 * Lauf erledigt. Erst wenn dieselbe Stelle mehrere Läufe hintereinander rot
 * bleibt, ist die Selbstheilung erkennbar gescheitert — und dann ist es eine
 * Entscheidung („soll ich das anders angehen?"), keine technische Aufgabe.
 *
 * Gezählt wird über die GitHub-API statt über eine Zustandsdatei: der Check
 * läuft in einer wegwerfbaren Umgebung, und eine Datei, die nur bei
 * Selbstheilung committet wird, würde genau im Fehlerfall nichts festhalten.
 *
 * Ohne Token (lokaler Lauf) wird NICHT eskaliert — im Zweifel keine Mail.
 */
export function eskalationNoetig(vorherigeLaeufe: ("success" | "failure" | string)[]): boolean {
  if (vorherigeLaeufe.length < ESKALATION_AB_LAEUFEN - 1) return false;
  // -1, weil der laufende (rote) Durchgang selbst mitzählt.
  return vorherigeLaeufe.slice(0, ESKALATION_AB_LAEUFEN - 1).every((c) => c === "failure");
}

async function letzteLaufErgebnisse(): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return [];
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/health-check.yml/runs?status=completed&per_page=5`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { workflow_runs?: { conclusion: string }[] };
    return (data.workflow_runs ?? []).map((r) => r.conclusion);
  } catch {
    return [];
  }
}

async function main() {
  const lines: string[] = [];
  // Die drei Kategorien entscheiden, WER etwas tut — und der Betreiber ist
  // dabei ausdrücklich nicht vorgesehen. Er kann nicht programmieren; ihn auf
  // einen Befund hinzuweisen, den er nicht selbst beheben kann, ist keine
  // Benachrichtigung, sondern eine Sackgasse.
  //
  // `selfHealed`  = hat sich schon repariert, reine Protokollzeile.
  // `warnings`    = auffällig, nichts zu tun, steht im Log.
  // `forClaude`   = braucht Analyse und einen Code-Fix → geht an Claude
  //                 (Workflow rot + die Autofix-Action greift es auf).
  //                 SCHICKT KEINE MAIL. Bis zum 28.07.2026 tat es das doch, mit
  //                 dem Betreff „Handlungsbedarf" — sieben Mails in drei Tagen
  //                 über Dinge, die der Betreiber weder beheben kann noch soll.
  //                 Erst wenn die Selbstheilung mehrere Läufe hintereinander
  //                 nicht weiterkommt, wird daraus eine Frage an ihn.
  // `forOperator` = echte Entscheidung, die nur ihm gehört (Absicht ja/nein,
  //                 Geld, Produkt). Genau das und nur das rechtfertigt eine Mail.
  const forClaude: string[] = [];
  const forOperator: string[] = [];
  const selfHealed: string[] = [];
  const warnings: string[] = [];

  const pageProbes: Probe[] = [];
  for (const path of PAGES) {
    // Bewusst nacheinander: parallele Bursts belasten die DB unnötig
    // (siehe [[feedback_db_schonen]] — ein ungedrosselter Crawl hat sie schon
    // einmal umgelegt).
    pageProbes.push(await probe(path, path));
  }
  const coldResult = await measureColdAtlas();
  const cold = coldResult?.worst ?? null;
  const dbProbes = await measureAtlasQueries();

  // ── Function-Region ───────────────────────────────────────────────────────
  const regions = Array.from(
    new Set([...pageProbes, ...(coldResult?.all ?? [])].map((p) => p.region).filter(Boolean)),
  );
  // Zwei getrennte Fragen, und beide müssen gestellt werden:
  //
  // (a) LÄUFT es gerade richtig? → aus den Antwort-Headern.
  // (b) BLEIBT es richtig? → aus vercel.json.
  //
  // Nur (a) zu prüfen wäre zu spät: Nimmt jemand den regions-Eintrag heraus,
  // läuft Production bis zum nächsten Deploy weiter in Frankfurt und der Check
  // meldet fröhlich grün — der Ausfall ist dann schon scharf und geht beim
  // nächsten Push los. Deshalb wird die Datei unabhängig von der Messung
  // geprüft und repariert, solange noch nichts kaputt ist.
  const configState = healRegionConfig();
  if (configState === "repariert") {
    selfHealed.push(
      `In vercel.json fehlte die Frankfurt-Einstellung — eingetragen, bevor der nächste Deploy die Server ` +
        `nach Washington verschoben hätte. (Live läuft aktuell ${regions.join("/") || "unbekannt"}.)`,
    );
  } else if (configState === "abweichend") {
    // Die einzige Frage im ganzen Check, die wirklich nur der Betreiber
    // beantworten kann: War das Absicht? Beide Antworten sind vertretbar, und
    // eine davon eigenmächtig zu wählen wäre gefährlicher als das Problem.
    forOperator.push(
      `Die Server sollen laut Einstellung nicht mehr in Frankfurt laufen, sondern woanders. War das Absicht? ` +
        `Wenn ja, ziehe ich die Zeitgrenze für Datenbank-Abfragen mit hoch (aus der Ferne dauert jeder Zugriff ` +
        `länger). Wenn nein, setze ich Frankfurt zurück. Meine Empfehlung: zurück nach Frankfurt — dort steht ` +
        `die Datenbank, und genau daran ist der Atlas im Juli 2026 ausgefallen.`,
    );
  } else if (configState === "nicht-lesbar") {
    forClaude.push(`vercel.json ist nicht lesbar oder kein gültiges JSON — jeder Deploy scheitert damit.`);
  }

  const wrongRegion = regions.filter((r) => r !== EXPECTED_REGION);
  if (wrongRegion.length) {
    const nachwirkung =
      configState === "repariert"
        ? `Die Einstellung war aus vercel.json verschwunden und ist wieder drin — der nächste Deploy holt die Server zurück.`
        : `In vercel.json steht ${EXPECTED_REGION}, live greift es trotzdem nicht: das deutet auf eine Region-Einstellung im Vercel-Projekt selbst hin, die die Datei übersteuert.`;
    forClaude.push(
      `Function-Region ist live ${wrongRegion.join("/")} statt ${EXPECTED_REGION}. Die Datenbank steht in Frankfurt — ` +
        `aus einer anderen Region kostet jeder Datenbank-Zugriff Latenz über den Atlantik, und genau daran ist ` +
        `der Atlas im Juli 2026 gestorben. ${nachwirkung}`,
    );
  }
  lines.push(
    regions.length
      ? `Server-Standort: ${regions.join(", ")} (erwartet: ${EXPECTED_REGION})`
      : `Server-Standort: nicht ermittelbar — alle Antworten kamen aus dem CDN, ohne dass eine Function lief.`,
  );

  // ── Statuscodes ───────────────────────────────────────────────────────────
  for (const p of pageProbes) {
    if (![200, 301, 308].includes(p.status)) {
      forClaude.push(`${p.label} antwortet mit ${p.status || "keiner Antwort"} (${p.cache || "—"}).`);
    }
  }
  if (cold && cold.status !== 200) {
    forClaude.push(`Atlas-Gemeindeseite antwortet mit ${cold.status || "keiner Antwort"} — ${cold.url}`);
  }

  // ── Zeiten ────────────────────────────────────────────────────────────────
  const slowest = pageProbes.reduce((a, b) => (b.seconds > a.seconds ? b : a), pageProbes[0]);
  lines.push(
    `Normale Seiten: langsamste ${slowest.seconds.toFixed(2)} s (${slowest.label}), ` +
      `Rest ${pageProbes.map((p) => p.seconds.toFixed(1)).join(" / ")} s`,
  );
  const pageVerdict = verdict(slowest.seconds, SLOW.page);
  if (pageVerdict === "rot") forClaude.push(`${slowest.label} braucht ${slowest.seconds.toFixed(2)} s — deutlich zu lang.`);
  else if (pageVerdict === "gelb") warnings.push(`${slowest.label} braucht ${slowest.seconds.toFixed(2)} s.`);

  if (cold && coldResult) {
    const luft = NOTBREMSE_S - cold.seconds;
    lines.push(
      `Atlas-Gemeinden frisch aufgebaut (${coldResult.all.length} Stichproben): ` +
        `${coldResult.all.map((p) => p.seconds.toFixed(1)).join(" / ")} s — ` +
        `langsamste ${cold.seconds.toFixed(2)} s, ${luft.toFixed(1)} s Luft bis zur Notbremse bei ${NOTBREMSE_S} s`,
    );
    lines.push(`Langsamste Seite: ${cold.url}`);
    const coldVerdict = verdict(cold.seconds, SLOW.atlasCold);
    if (coldVerdict === "rot") {
      forClaude.push(
        `Eine frisch aufgebaute Atlas-Seite braucht ${cold.seconds.toFixed(2)} s. Nur noch ${luft.toFixed(1)} s ` +
          `bis zur Notbremse (${NOTBREMSE_S} s), ab der die Seite einen Fehler zeigt. Das ist die Vorstufe zum ` +
          `Ausfall — auch wenn gerade noch alles mit 200 antwortet.`,
      );
    } else if (coldVerdict === "gelb") {
      warnings.push(`Atlas-Kaltaufbau bei ${cold.seconds.toFixed(2)} s (Luft: ${luft.toFixed(1)} s).`);
    }
  } else {
    warnings.push("Kein echter Kaltaufbau messbar (alle geprüften Seiten lagen im Cache).");
  }

  // ── Datenbank-Aufrufe einzeln ─────────────────────────────────────────────
  // Der Frühindikator VOR dem Seiten-Frühindikator: hier fällt eine teuer
  // gewordene Abfrage auf, solange die Seiten noch schnell sind, weil gerade
  // niemand gleichzeitig darauf zugreift.
  if (dbProbes.length) {
    lines.push(
      `Atlas-Datenbankabfragen: ${dbProbes.map((d) => `${d.label} ${d.ms} ms`).join(" · ")}` +
        ` (Vergleichs-Read ${dbProbes[0].baselineMs} ms)`,
    );
    for (const d of dbProbes) {
      if (d.error) {
        forClaude.push(`Die Atlas-Abfrage „${d.label}" antwortet nicht sauber: ${d.error}`);
      } else if (dbProbeVerdictRelativ(d.ms, d.baselineMs) === "rot") {
        forClaude.push(
          `Die Atlas-Abfrage „${d.label}" braucht ${d.ms} ms bei einem Vergleichs-Read von ${d.baselineMs} ms. ` +
            `Die Differenz ist echte Datenbankarbeit und im gesunden Zustand nahe null. Sie heißt: die Abfrage läuft wieder über die ganze ` +
            `Rohtabelle statt über den Index — entweder ist der vorberechnete Rollup leer, oder in ` +
            `lib/mastr-region-sql.ts ist der Präfix wieder ein Parameter statt eines Literals (der Grund ` +
            `steht dort im Kopf). Die Seiten sind dann noch schnell, kippen aber unter Parallel-Last.`,
        );
      } else if (dbProbeVerdictRelativ(d.ms, d.baselineMs) === "gelb") {
        warnings.push(`Atlas-Abfrage „${d.label}" bei ${d.ms} ms (Vergleichs-Read ${d.baselineMs} ms).`);
      }
    }
  }

  // ── Bericht ───────────────────────────────────────────────────────────────
  const ampel =
    forOperator.length || forClaude.length ? "ROT" : selfHealed.length ? "REPARIERT" : warnings.length ? "GELB" : "GRUEN";
  const report = [
    `Solar Check Gesundheitscheck: ${ampel}`,
    "",
    ...lines,
    ...(selfHealed.length ? ["", "Selbst repariert (nichts zu tun):", ...selfHealed.map((s) => `- ${s}`)] : []),
    ...(forOperator.length ? ["", "Entscheidung des Betreibers:", ...forOperator.map((p) => `- ${p}`)] : []),
    ...(forClaude.length ? ["", "Fuer Claude zur Analyse:", ...forClaude.map((p) => `- ${p}`)] : []),
    ...(warnings.length ? ["", "Auffaellig (nichts zu tun):", ...warnings.map((w) => `- ${w}`)] : []),
  ].join("\n");

  console.log(report);

  // BENACHRICHTIGUNG NUR, WENN DER BETREIBER SELBST ETWAS ENTSCHEIDEN MUSS.
  // Nicht bei Gelb, nicht bei Selbstheilung — und ausdrücklich auch nicht bei
  // einem roten Lauf, der an Claude geht: dafür ist der Workflow-Fehlschlag da,
  // der die Autofix-Action startet. Wer für jede Regung eine Mail bekommt,
  // filtert den Absender weg und verpasst dann die eine, die zählt.
  //
  // Die eine Ausnahme ist der Fall, in dem die Automatik erkennbar nicht
  // weiterkommt: bleibt es mehrere Läufe hintereinander rot, wird aus dem
  // technischen Befund eine Frage an den Betreiber.
  const vorlaeufe = forClaude.length ? await letzteLaufErgebnisse() : [];
  const festgefahren = forClaude.length > 0 && eskalationNoetig(vorlaeufe);
  const entscheidungen = [
    ...forOperator,
    ...(festgefahren
      ? [
          `Seit ${ESKALATION_AB_LAEUFEN} Prüfläufen in Folge komme ich an derselben Stelle nicht weiter: ` +
            `${forClaude[0]} Soll ich das größer angehen (mehr Zeit dafür einplanen), oder lässt du es vorerst so?`,
        ]
      : []),
  ];

  if (ALERT) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error("\n--alert gesetzt, aber CRON_SECRET fehlt — keine Meldung verschickt.");
    } else {
      const res = await fetch(`${BASE_URL}/api/alert`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          subject: entscheidungen.length ? "Gesundheitscheck: eine Entscheidung für dich" : `Gesundheitscheck ${ampel}`,
          decisions: entscheidungen,
          done: selfHealed,
          details: report,
          // Ohne Entscheidung ist der Lauf an Claude adressiert — die Schleuse in
          // /api/alert hält ihn dann zurück, statt ihn zuzustellen.
          audience: entscheidungen.length ? "operator" : "claude",
          tag: "health-check",
        }),
      });
      const info = (await res.json().catch(() => ({}))) as { skipped?: boolean; reason?: string };
      console.log(
        res.ok
          ? info.skipped
            ? `\nKeine Mail (${info.reason}).`
            : "\nMeldung verschickt (Entscheidung liegt beim Betreiber)."
          : `\nMeldung fehlgeschlagen: ${res.status}`,
      );
    }
  }

  // Exit-Codes steuern, was die GitHub-Action als Nächstes tut:
  //   2 = selbst repariert → die Action committet die Korrektur und deployt
  //   1 = braucht Analyse → Workflow rot, Claude-Autofix springt an
  //   0 = alles im Rahmen
  if (forClaude.length || forOperator.length) process.exit(1);
  if (selfHealed.length) process.exit(2);
}

// Nur beim direkten Aufruf messen — beim Import (Test der Selbstheilung) nicht,
// sonst würde jeder Testlauf Production abfragen.
if (process.argv[1] && /health-check\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error("Gesundheitscheck selbst fehlgeschlagen:", e);
    process.exit(1);
  });
}
