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
import { PRUEFSTAND, faelligkeiten } from "../lib/pruefstand";
import { RELEASE_PLAN, planMeldungen } from "../lib/release-plan";
import { sollWarnen, warnstufe } from "../lib/social-ablauf";
import { paramsToRow } from "../lib/types";
import {
  BASIS_TAGE,
  FEHLBETRAG_MELDEN_AB_ANTEIL,
  KOSTEN_PROJEKTE,
  KOSTEN_TEAM_ID,
  KOSTENWACHE_ZUGANG,
  PROTOKOLL_AUFBEWAHRUNG_TAGE,
  SPRUNG_FAKTOR,
  beurteileKostenTag,
  fehlbetragObergrenze,
  groesstesVielfaches,
  leseGruppen,
  menge,
  zuBeurteilenderTag,
} from "../lib/kostenwache";

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

/** Adresse, die es garantiert nie geben wird — sie muss 404 antworten, nicht 200.
 *  Drei Segmente, damit sie die Gemeinde-Route trifft (die tiefste und teuerste). */
const SOFT_404_PFAD = "/solar-atlas/kein-land/kein-kreis/keine-gemeinde";

/** Notnagel, falls die DB gerade nicht erreichbar ist — echte, dauerhaft
 *  existierende Gemeinden. Bewusst klein: der Regelweg ist die Zufallsauswahl. */
const FALLBACK_GEMEINDEN = [
  "/solar-atlas/bayern/landkreis-wuerzburg/eisingen",
  "/solar-atlas/hessen/landkreis-fulda/hilders",
  "/solar-atlas/sachsen/landkreis-bautzen/wilthen",
];

/** Dasselbe für die Kreisebene (siehe measureColdAtlas — sie wird mitgemessen,
 *  weil sie die nächste indexierbare Ebene ist). */
const FALLBACK_KREISE = [
  "/solar-atlas/bayern/landkreis-wuerzburg",
  "/solar-atlas/hessen/landkreis-fulda",
  "/solar-atlas/sachsen/landkreis-bautzen",
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

/** Zufällige Atlas-Pfade aus der DB — ein leichter Read, kein Aggregat.
 *  Zufällig, weil eine feste Seite nach dem ersten Lauf im Cache läge und der
 *  Check dann 0,1 s misst statt des Kaltrenders, den ein echter Erstbesucher zahlt.
 *
 *  Liefert beide Ebenen aus DERSELBEN Abfrage: zu jeder gezogenen Gemeinde ist
 *  der Kreis ohnehin schon aufgelöst (der Pfad ist dreistufig), die Kreisseiten
 *  kosten also keinen zusätzlichen Datenbank-Read. */
async function randomAtlasPaths(count: number): Promise<{ gemeinde: string[]; kreis: string[] }> {
  const leer = { gemeinde: [], kreis: [] };
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return leer;

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
  if (!gem.length) return leer;

  // Zu jeder Gemeinde Kreis + Bundesland auflösen (der Pfad ist dreistufig).
  const kreisIds = Array.from(new Set(gem.map((g) => g.parent_region_id).filter(Boolean)));
  const kreise = await q(`mastr_regions?select=region_id,slug,parent_region_id&region_id=in.(${kreisIds.join(",")})`);
  const landIds = Array.from(new Set(kreise.map((k) => k.parent_region_id).filter(Boolean)));
  const laender = await q(`mastr_regions?select=region_id,slug&region_id=in.(${landIds.join(",")})`);

  const kreisById = new Map(kreise.map((k) => [k.region_id!, k]));
  const landById = new Map(laender.map((l) => [l.region_id!, l]));

  const gemeindePfade: string[] = [];
  const kreisPfade = new Set<string>();
  for (const g of gem) {
    const k = kreisById.get(g.parent_region_id ?? "");
    const l = k ? landById.get(k.parent_region_id ?? "") : undefined;
    if (!k?.slug || !l?.slug) continue;
    if (g.slug) gemeindePfade.push(`/solar-atlas/${l.slug}/${k.slug}/${g.slug}`);
    kreisPfade.add(`/solar-atlas/${l.slug}/${k.slug}`);
  }
  return { gemeinde: gemeindePfade, kreis: Array.from(kreisPfade) };
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

/** Wie viele Kreisseiten pro Lauf frisch aufgebaut werden.
 *
 *  Weniger als bei den Gemeinden, weil es nur ~400 Kreise gibt (statt ~11.000
 *  Gemeinden) und ihre Zeiten enger beieinander liegen — zwei Stichproben
 *  reichen, um einen strukturellen Rückfall zu sehen, ohne den Lauf zu
 *  verlängern. */
const COLD_KREIS_SAMPLES = 2;

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
/** Messungen je Abfrage; gewertet wird die schnellste (siehe dbProbeVerdictRelativ). */
const DB_PROBE_RUNS = 3;

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
 * NACHTRAG 28.07.2026 — der Vergleichs-Read allein reicht nicht. Er fängt
 * gleichzeitige Datenbank-Last ab, aber nicht die Streuung einer EINZELNEN
 * Messung. Direkt nach dem Einbau meldete der Check wieder ROT: „Gemeinde-
 * Kennzahlen 553 ms gegen Vergleichs-Read 211 ms". Vier Wiederholungen derselben
 * Abfrage ergaben 297 / 102 / 368 / 83 ms — dieselbe Abfrage, viermal, Faktor 4
 * dazwischen. Kein Rückfall, sondern Rauschen aus Verbindungsaufbau,
 * Plan-Cache und Netzjitter.
 *
 * Deshalb wird jede Abfrage MEHRFACH gemessen und die SCHNELLSTE gewertet
 * (`DB_PROBE_RUNS`). Das Minimum ist hier der richtige Schätzer, nicht der
 * Mittelwert: Störungen können eine Messung nur langsamer machen, nie
 * schneller. Bleibt selbst die schnellste Messung weit über dem Vergleichs-Read,
 * ist es ein struktureller Befund — im Juli lagen alle Messungen konstant bei
 * ~600 ms, der wäre damit weiterhin sicher aufgefallen.
 *
 * Das ist eine Messverbesserung, KEIN Aufweichen: die Schwellen bleiben, wo sie
 * sind (das wäre das Verstecken, das CLAUDE.md verbietet). Geschärft wird nur
 * die Frage — erst „ist die Datenbank beschäftigt?", jetzt zusätzlich „ist das
 * überhaupt reproduzierbar?".
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

  /** Eine Messreihe; zurück kommt die schnellste Zeit. */
  const fastestOf = async (runs: number, once: () => Promise<number>): Promise<number> => {
    let best = Infinity;
    for (let i = 0; i < runs; i++) best = Math.min(best, await once());
    return best === Infinity ? 0 : best;
  };

  // Vergleichs-Read VOR den Atlas-Abfragen: dieselbe Strecke, aber ohne
  // nennenswerte Datenbankarbeit. Er trennt „Abfrage kaputt" von „Datenbank
  // gerade beschäftigt" (siehe dbProbeVerdictRelativ). Auch er wird mehrfach
  // gemessen — sonst stünde eine schnellste Abfrage gegen einen zufällig
  // langsamen Vergleichswert.
  const baselineMs = await fastestOf(DB_PROBE_RUNS, async () => {
    const started = Date.now();
    try {
      const r = await fetch(`${url}/rest/v1/mastr_meta?select=imported_at&id=eq.1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20000),
      });
      await r.text();
      return Date.now() - started;
    } catch {
      // Scheitert der Vergleichs-Read, bleibt baselineMs bei 0 — dann gilt wieder
      // die harte Schwelle. Die Prüfung wird durch einen Ausfall nie milder.
      return Infinity;
    }
  });

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
    // Ein Fehler beendet die Messreihe sofort: Ein 500er ist ein Befund für
    // sich, und ihn dreimal auszulösen belastet nur die Datenbank
    // (siehe [[feedback_db_schonen]]).
    let error: string | undefined;
    const ms = await fastestOf(DB_PROBE_RUNS, async () => {
      if (error) return Infinity;
      const started = Date.now();
      try {
        const res = await fetch(`${url}/rest/v1/rpc/${c.fn}`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify(c.args),
          signal: AbortSignal.timeout(20000),
        });
        const body = await res.text();
        if (!res.ok) error = `${res.status} ${body.slice(0, 120)}`;
        return Date.now() - started;
      } catch (e) {
        error = e instanceof Error ? e.message : "Abbruch";
        return Date.now() - started;
      }
    });
    out.push({ label: c.label, ms, baselineMs, error });
  }
  return out;
}

/**
 * Misst echte Kaltrender. Ein Treffer im Cache misst nichts Interessantes (dann
 * liefert das CDN eine fertige Seite aus), solche Versuche zählen nicht mit.
 *
 * BEIDE ATLAS-EBENEN, nicht nur die Gemeinden (17.08.2026): Die Kreisebene ist
 * die nächste, die indexiert werden soll (Welle 0b, siehe lib/atlas-index.ts).
 * Beim ersten Anlauf am 27.07.2026 wurde sie freigeschaltet, ohne dass irgendein
 * Wächter sie je gemessen hätte — beobachtet wurden nur Gemeinden. Eine Ebene
 * freizuschalten, die niemand misst, heißt: Der Rückfall fällt erst auf, wenn
 * Nutzer ihn sehen. Die Kreisseiten sind teurer als sie aussehen (sie tragen die
 * Rangliste aller ~52 Gemeinden des Kreises), also werden sie gemessen, BEVOR
 * die Welle kommt — nicht danach.
 */
async function measureColdAtlas(): Promise<{ worst: Probe; all: Probe[] } | null> {
  const zufall = await randomAtlasPaths(COLD_SAMPLES + 2);
  const hits: Probe[] = [];

  const sammle = async (label: string, pfade: string[], ziel: number) => {
    let gefunden = 0;
    for (const path of pfade) {
      if (gefunden >= ziel) break;
      const p = await probe(label, path);
      // NUR `MISS` ist ein echter Kaltaufbau. `HIT` und `STALE` liefern beide eine
      // fertige Seite aus dem CDN aus (bei STALE wird nur im Hintergrund erneuert)
      // — beides misst 0,05 s und sagt über den Aufbau nichts. Vorher zählte STALE
      // mit und konnte einen Lauf grün melden, in dem gar nichts aufgebaut wurde.
      if (p.cache === "MISS") {
        hits.push(p);
        gefunden++;
      }
    }
  };

  await sammle("Atlas-Gemeinde (kalt)", [...zufall.gemeinde, ...FALLBACK_GEMEINDEN], COLD_SAMPLES);
  await sammle("Atlas-Landkreis (kalt)", [...zufall.kreis, ...FALLBACK_KREISE], COLD_KREIS_SAMPLES);
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

// ─── Frische der MaStR-Daten ─────────────────────────────────────────────────
//
// Der gesamte Zahlenbestand des Solar-Atlas — Anlagen, Leistung, Speicher auf
// über 11.000 Gemeindeseiten — kommt aus EINEM monatlichen Lauf
// (`scripts/mastr-refresh.ts`). Bleibt der aus, zeigen alle diese Seiten
// weiterhin sauber gerenderte, schnelle, HTTP-200-Zahlen von vorletztem Monat.
//
// Warum das hierher gehört und nicht in einen Wächter (Audit 19.08.2026): Der
// Datenstand steht zwar sichtbar an den Zahlen, aber NIEMAND wird gewarnt. Das
// Feld `imported_at` wurde in diesem Skript bereits gelesen — allerdings nur als
// Latenz-Vergleichswert; sein ALTER hat nie jemand angesehen. Diese Prüfung
// kostet einen Punkt-Zugriff, läuft alle drei Stunden in GitHub Actions mit,
// braucht kein Modell und damit kein Geld.
//
// Die Schwellen kommen aus dem Rhythmus, nicht aus dem Bauch: Der Import läuft
// monatlich. 45 Tage sind ein Zyklus plus Luft — darunter ist alles normal.
// 70 Tage heißen, dass zwei Läufe ausgefallen sind; dann ist es kein Zufall
// mehr, sondern eine stehengebliebene Pipeline.
export const MASTR_FRISCHE_WARN_TAGE = 45;
export const MASTR_FRISCHE_FAIL_TAGE = 70;

/**
 * Wie alt darf der Anlagenbestand sein?
 *
 * Bewusst gegen einen HEREINGEREICHTEN Stichtag gerechnet, nicht gegen
 * `new Date()` — eine Bewertungsfunktion mit eigener Uhr lässt sich nicht
 * prüfen, und genau daran ist im Projekt schon ein Prüfdatum falsch geworden.
 */
export function mastrFrischeVerdict(alterTage: number): "gruen" | "gelb" | "rot" {
  if (alterTage >= MASTR_FRISCHE_FAIL_TAGE) return "rot";
  if (alterTage >= MASTR_FRISCHE_WARN_TAGE) return "gelb";
  return "gruen";
}

/** Ganze Tage zwischen dem Importzeitpunkt und dem Stichtag. */
export function mastrAlterTage(importedAt: string, heute: Date): number {
  const ms = heute.getTime() - Date.parse(importedAt);
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export type MastrFrische = { importedAt: string; alterTage: number; urteil: "gruen" | "gelb" | "rot" };

// ─── Schreibt der Code Felder, die die Tabelle gar nicht hat? ────────────────
//
// WARUM ES DAS GIBT (28.08.2026): Das Speichern einer Berechnung war FÜNF
// MONATE kaputt, ohne dass irgendetwas angeschlagen hätte. Am 28.03.2026 kam im
// Code ein neues Feld dazu (`einspeisung_modus`), die Tabelle bekam es nie —
// jeder Speicherversuch endete mit HTTP 500. Kein Typfehler (die Grenze zur
// Datenbank behauptet die Form, sie prüft sie nicht), kein roter Test (Tests
// kennen die echte Tabelle nicht), keine kaputte Seite (nur der eine Knopf).
// Und die Nutzung ist zu gering, als dass es an einer Fehlerquote auffiele:
// drei Aufrufe in sieben Tagen.
//
// Dieselbe Klasse wie `datenFormVerstanden` beim Förderkatalog, nur in der
// anderen Richtung: dort läuft die DATENFORM dem Code davon, hier der CODE der
// Tabelle. Beide sind von außen unsichtbar und brauchen deshalb eine Messung
// statt eines Merksatzes.
//
// Zwei Befunde, beide real eingetreten:
//   fehlend       — der Code schreibt ein Feld, das es in der Tabelle nicht gibt
//   nullKollision — der Code schreibt dort NULL, wo die Tabelle einen Wert
//                   verlangt. DAS war der zweite Blocker desselben Tages
//                   (`o_einsp`, „kein eigener Einspeisesatz gesetzt") und der
//                   teurere: Er wäre erst NACH der Reparatur des ersten
//                   sichtbar geworden, also beim nächsten Lauf noch einmal.
//
// Reine Funktion mit hereingereichten Listen — sie soll ohne Netz prüfbar sein.
export function spaltenAbgleich(
  geschrieben: Record<string, unknown>,
  vorhandeneSpalten: readonly string[],
  pflichtSpalten: readonly string[],
): { fehlend: string[]; nullKollision: string[] } {
  const vorhanden = new Set(vorhandeneSpalten);
  const pflicht = new Set(pflichtSpalten);
  const fehlend: string[] = [];
  const nullKollision: string[] = [];

  for (const [feld, wert] of Object.entries(geschrieben)) {
    if (!vorhanden.has(feld)) {
      fehlend.push(feld);
      continue; // Was fehlt, kann nicht zusätzlich kollidieren — sonst zweimal gemeldet.
    }
    if ((wert === null || wert === undefined) && pflicht.has(feld)) nullKollision.push(feld);
  }

  return { fehlend, nullKollision };
}

export type SpaltenBefund = { tabelle: string; fehlend: string[]; nullKollision: string[] };

/**
 * Holt die echten Spalten der Berechnungs-Tabelle und hält die Feldliste
 * dagegen, die der Code beim Speichern schreibt.
 *
 * Die Feldliste kommt aus `paramsToRow` — also aus der Umwandlung, die der
 * Code selbst benutzt, nicht aus einer zweiten Aufzählung, die beim nächsten
 * Feld vergessen würde. Belegt wird sie mit dem UNGÜNSTIGSTEN Fall: alles
 * Optionale auf null, weil genau dort die zweite Fehlerklasse sitzt.
 *
 * Gibt `null` zurück, wenn die Datenbank nicht erreichbar ist — ein
 * gescheiterter Abruf ist KEIN Befund über die Spalten (dieselbe Trennung wie
 * bei der MaStR-Frische darüber).
 */
async function messeSpaltenAbgleich(): Promise<SpaltenBefund | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    // PostgREST beschreibt sich selbst: Spaltenliste plus die Pflichtfelder.
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const spec = (await r.json()) as {
      definitions?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
    };
    const def = spec.definitions?.calculations;
    if (!def?.properties) return null;

    const zeile = paramsToRow(
      {
        anlage: 1,
        customKwp: 10,
        speicher: 1,
        personen: 1,
        nutzung: 1,
        wp: "nein",
        ea: "nein",
        eaKm: 15000,
        // Der ungünstigste Fall: alles, was der Nutzer NICHT selbst gesetzt hat.
        oKosten: null,
        oEv: null,
        oStrom: 0.34,
        oEinsp: null,
        einspeisungModus: "teil",
        oErtrag: 950,
        plz: "",
        fuelType: "gas",
        flowType: "manual",
        haustyp: null,
        dachart: null,
        budgetLimit: null,
      },
      { kwp: 10, amortisationJahre: null, rendite25j: null },
    );
    // Die Route setzt zusätzlich diese drei; sie stehen nicht in paramsToRow.
    const geschrieben: Record<string, unknown> = {
      ...zeile,
      user_id: "x",
      name: "Meine Berechnung",
      description: null,
    };

    const { fehlend, nullKollision } = spaltenAbgleich(
      geschrieben,
      Object.keys(def.properties),
      def.required ?? [],
    );
    return { tabelle: "calculations", fehlend, nullKollision };
  } catch {
    return null;
  }
}

/**
 * Kann die PRODUKTION Abo-Mails verschicken?
 *
 * DER ANLASS (01.09.2026): Das Abo war lokal vollständig geprüft — Browser-
 * Tests, echte Mail, echter Bestätigungsklick — und schlug beim ersten
 * Live-Versuch fehl, weil auf der Produktion keine der fünf Zugangsdaten des
 * Postfachs gesetzt war. Kein roter Test, kein Fehler im Diff, keine kaputte
 * Seite: geprüft war der Code, nie die Umgebung.
 *
 * DAS IST DIE DRITTE AUSPRÄGUNG DERSELBEN KLASSE in diesem Projekt. Der
 * Spaltenabgleich fand sie zwischen Code und Tabelle, die Kostenwache zwischen
 * Mengen und Rechnung, hier liegt sie zwischen Code und Umgebung. Gemeinsam
 * ist allen: Ein lokaler Lauf kann sie prinzipiell nicht finden, weil lokal
 * alles gesetzt ist.
 *
 * Gefragt wird deshalb die Produktion SELBST — sie antwortet über ihre eigene
 * Konfiguration, statt dass jemand von hier aus vermutet. Zurück kommt nur,
 * WAS fehlt, nie ein Wert.
 */
async function messeAboBereit(): Promise<AboBereit | null> {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return null; // Ohne Betriebsgeheimnis keine Auskunft — kein Befund.
  try {
    const r = await fetch(`${BASE_URL}/api/abo/bereit`, {
      headers: { Authorization: `Bearer ${geheim}` },
      signal: AbortSignal.timeout(20000),
    });
    // Ein fehlgeschlagener Abruf ist KEIN Befund über die Konfiguration —
    // dieselbe Trennung wie überall sonst zwischen „ist kaputt" und „konnte
    // nicht nachsehen".
    if (!r.ok) return null;
    const d = (await r.json()) as { bereit?: boolean; fehlt?: string[]; versandOhneBeleg?: unknown };
    if (typeof d?.bereit !== "boolean") return null;
    // Eine ältere Auslieferung kennt das Feld nicht. Das ist „nicht gemessen",
    // nicht „null hängende Anmeldungen" — eine Null behauptete hier einen
    // Befund („alles ging raus"), den es nicht gab.
    const ohneBeleg = typeof d.versandOhneBeleg === "number" ? d.versandOhneBeleg : null;
    return { bereit: d.bereit, fehlt: Array.isArray(d.fehlt) ? d.fehlt : [], ohneBeleg };
  } catch {
    return null;
  }
}

interface AboBereit {
  bereit: boolean;
  fehlt: string[];
  /** Anmeldungen ohne Versandbeleg; `null` = nicht gemessen. */
  ohneBeleg: number | null;
}

/**
 * Wirkt der Abo-Versand, oder ist er bloß eingerichtet?
 *
 * DER ANLASS (02.09.2026, in der Fehler-Triage gemessen): Der Bereitschafts-
 * Melder daneben sagte „Versandweg und Signatur sind in der Produktion
 * gesetzt" — und in der Ablage standen zwei Anmeldungen und NULL je versendete
 * Bestätigungsmails. Er prüft, ob etwas GESETZT ist; ein falsch getipptes
 * Passwort ist gesetzt. Dieselbe Klasse wie die drei Fälle, für die es ihn
 * überhaupt gibt, nur eine Ebene weiter: Geprüft war diesmal die Umgebung,
 * nie ihre Wirkung.
 *
 * `null` (nicht gemessen) ist kein Befund. Fehlt die Konfiguration bereits,
 * ebenfalls nicht: Der Grund steht dann schon im Befund nebenan, und zwei
 * Meldungen über dieselbe Ursache sind der Lärm, von dem man sich abgewöhnt,
 * Meldungen zu lesen.
 */
export function aboVersandStockt(b: { bereit: boolean; ohneBeleg: number | null }): boolean {
  if (b.ohneBeleg === null) return false;
  if (!b.bereit) return false;
  return b.ohneBeleg > 0;
}

/**
 * Liest den Datenstand der MaStR-Auswertung.
 *
 * Gibt `null` zurück, wenn die Datenbank nicht erreichbar ist oder die Zeile
 * fehlt — ein fehlgeschlagener Abruf ist KEIN Befund über die Frische, und ihn
 * als „veraltet" zu melden wäre eine Beobachtung, die es nicht gab (dieselbe
 * Trennung wie beim Förder-Wächter zwischen „hat sich geändert" und „Abruf kam
 * nicht durch").
 */
async function messeMastrFrische(): Promise<MastrFrische | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/mastr_meta?select=imported_at&id=eq.1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as { imported_at?: string }[];
    const importedAt = rows?.[0]?.imported_at;
    if (!importedAt || Number.isNaN(Date.parse(importedAt))) return null;
    const alterTage = mastrAlterTage(importedAt, new Date());
    return { importedAt, alterTage, urteil: mastrFrischeVerdict(alterTage) };
  } catch {
    return null;
  }
}

// ─── Ablauf der Social-Zugänge ───────────────────────────────────────────────
//
// Der Zugangsschlüssel für LinkedIn läuft nach zwei Monaten ab, und er lässt
// sich nur durch einen Login im Browser erneuern — der Autofix kann das nicht,
// niemand außer dem Betreiber kann es. Ohne Vorwarnung hört das Veröffentlichen
// an einem beliebigen Tag still auf; das ist dieselbe Fehlerklasse wie ein
// Wächter, der nicht mehr läuft und deswegen auch nichts mehr meldet.
//
// Der Befund macht den Lauf bewusst NICHT rot: Rot startet den Autofix, und der
// hätte hier nichts zu tun. Er geht direkt in die Mail an den Betreiber.

type SocialAblauf = { plattform: string; tageBisAblauf: number; stufe: number; konto: string | null };

async function messeSocialAblauf(): Promise<SocialAblauf[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  const kopf = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const r = await fetch(
      `${url}/rest/v1/social_konten?select=plattform,anzeigename,gueltig_bis,gewarnt_bei_stufe`,
      { headers: kopf, signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) return [];
    const rows = (await r.json()) as {
      plattform: string;
      anzeigename: string | null;
      gueltig_bis: string;
      gewarnt_bei_stufe: number | null;
    }[];

    const faellig: SocialAblauf[] = [];
    for (const row of rows) {
      const tage = Math.floor((Date.parse(row.gueltig_bis) - Date.now()) / 86_400_000);
      if (!sollWarnen(tage, row.gewarnt_bei_stufe)) continue;
      const stufe = warnstufe(tage);
      if (stufe === null) continue;
      // Die Stufe wird sofort quittiert, nicht erst nach erfolgreicher Zustellung:
      // Ein fehlgeschlagener Mailversand darf nicht dazu führen, dass beim
      // nächsten Lauf drei Stunden später dieselbe Meldung noch einmal ansetzt.
      // Der Befund steht ohnehin im Protokoll des Laufs.
      await fetch(`${url}/rest/v1/social_konten?plattform=eq.${encodeURIComponent(row.plattform)}`, {
        method: "PATCH",
        headers: { ...kopf, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ gewarnt_bei_stufe: stufe }),
        signal: AbortSignal.timeout(20000),
      }).catch(() => {});
      faellig.push({ plattform: row.plattform, tageBisAblauf: tage, stufe, konto: row.anzeigename });
    }
    return faellig;
  } catch {
    return [];
  }
}

// ─── Kostenwache: Mengen je Projekt ──────────────────────────────────────────
//
// Sie hängt hier und nicht an einem geplanten Auftrag auf dem Rechner des
// Betreibers: Die laufen nur, wenn seine App offen ist, und genau daran ist im
// August schon einmal eine Woche Überwachung ausgefallen, ohne dass es jemand
// bemerkt hat. Diese Action läuft in GitHubs Rechenzentrum.
//
// Der Vergleich braucht einen VOLLEN Tag, der Check läuft alle drei Stunden.
// Beurteilt wird deshalb immer nur der letzte vollständige Tag, und die Zeile
// dieses Tages merkt sich, dass gemeldet wurde (`gemeldet_am`). Sonst stünde
// derselbe Alarm achtmal am Tag im Protokoll, und nach zwei Tagen liest ihn
// niemand mehr.

/** Token für die Plattform. In der Action aus dem Repo-Geheimnis; lokal
 *  ersatzweise aus der Anmeldung des Kommandozeilen-Werkzeugs, damit ein Lauf
 *  auf dem eigenen Rechner dasselbe misst wie der in der Action. Der Wert wird
 *  nirgends ausgegeben. */
function vercelToken(): string | null {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const pfad = resolve(
    process.env.HOME ?? "",
    "Library/Application Support/com.vercel.cli/auth.json",
  );
  if (!existsSync(pfad)) return null;
  try {
    const t = (JSON.parse(readFileSync(pfad, "utf8")) as { token?: string }).token;
    return typeof t === "string" && t ? t : null;
  } catch {
    return null;
  }
}

/**
 * Fragt die Laufzeitprotokolle nach Gruppen ab.
 *
 * Der Ausgang wird BENANNT, nicht auf „null" zusammengeworfen. Drei Fälle sehen
 * an der Aufrufstelle sonst gleich aus und verlangen völlig Verschiedenes:
 * ein abgewiesener Zugang (der Betreiber muss ein Geheimnis anlegen oder
 * erneuern), ein leerer Tag (zu spät gefragt, die Protokolle halten einen Tag)
 * und ein Netzfehler. „Kennzahl ist nicht Zustand" — dieselbe Trennung wie beim
 * Förder-Wächter zwischen „hat sich geändert" und „Abruf kam nicht durch".
 */
type ProtokollAusgang =
  | { art: "ok"; text: string }
  | { art: "kein-zugang"; status: number }
  | { art: "nicht-abrufbar" };

async function protokollGruppen(
  token: string,
  projectId: string,
  tag: string,
  gruppe: "statusCode" | "requestPath",
): Promise<ProtokollAusgang> {
  try {
    const res = await fetch("https://mcp.vercel.com", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_runtime_logs",
          arguments: {
            projectId,
            teamId: KOSTEN_TEAM_ID,
            environment: "production",
            since: `${tag}T00:00:00.000Z`,
            until: `${tag}T23:59:59.999Z`,
            group_by: gruppe,
          },
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.status === 401 || res.status === 403) return { art: "kein-zugang", status: res.status };
    if (!res.ok) return { art: "nicht-abrufbar" };
    const roh = await res.text();
    // Die Antwort kommt als Ereignisstrom; die Nutzlast steht in der data-Zeile.
    const zeile = roh.match(/^data: (.*)$/m);
    if (!zeile) return { art: "nicht-abrufbar" };
    const nutzlast = JSON.parse(zeile[1]) as {
      result?: { content?: { text?: string }[]; isError?: boolean };
      error?: unknown;
    };
    if (nutzlast.error || nutzlast.result?.isError) return { art: "nicht-abrufbar" };
    const text = (nutzlast.result?.content ?? []).map((c) => c.text ?? "").join("\n");
    return text ? { art: "ok", text } : { art: "nicht-abrufbar" };
  } catch {
    return { art: "nicht-abrufbar" };
  }
}

type KostenZeile = {
  projekt: string;
  tag: string;
  aufbauten: number;
  adressen: number;
  gemeldet_am: string | null;
};

function supabaseZugang(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

async function kostenZeilen(projekt: string, bisTag: string): Promise<KostenZeile[] | null> {
  const z = supabaseZugang();
  if (!z) return null;
  try {
    const r = await fetch(
      `${z.url}/rest/v1/kosten_tageswerte?select=projekt,tag,aufbauten,adressen,gemeldet_am` +
        `&projekt=eq.${encodeURIComponent(projekt)}&tag=lte.${bisTag}&order=tag.desc&limit=${BASIS_TAGE + 1}`,
      { headers: { apikey: z.key, Authorization: `Bearer ${z.key}` }, signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) return null;
    return (await r.json()) as KostenZeile[];
  } catch {
    return null;
  }
}

async function kostenSchreiben(zeile: Record<string, unknown>): Promise<boolean> {
  const z = supabaseZugang();
  if (!z) return false;
  try {
    const r = await fetch(`${z.url}/rest/v1/kosten_tageswerte`, {
      method: "POST",
      headers: {
        apikey: z.key,
        Authorization: `Bearer ${z.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(zeile),
      signal: AbortSignal.timeout(20000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function kostenGemeldet(projekt: string, tag: string): Promise<void> {
  const z = supabaseZugang();
  if (!z) return;
  await fetch(
    `${z.url}/rest/v1/kosten_tageswerte?projekt=eq.${encodeURIComponent(projekt)}&tag=eq.${tag}`,
    {
      method: "PATCH",
      headers: {
        apikey: z.key,
        Authorization: `Bearer ${z.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ gemeldet_am: new Date().toISOString() }),
      signal: AbortSignal.timeout(20000),
    },
  ).catch(() => {});
}

export type KostenBefund = {
  zeilen: string[];
  fuerClaude: string[];
  warnungen: string[];
};

/**
 * Misst, legt ab, urteilt. Der Stichtag wird hereingereicht, damit ein Test
 * denselben Tag beurteilen kann, ohne von einer Uhr abzuhängen.
 */
export async function messeKosten(jetzt: Date): Promise<KostenBefund> {
  const b: KostenBefund = { zeilen: [], fuerClaude: [], warnungen: [] };
  const token = vercelToken();
  const tag = zuBeurteilenderTag(jetzt);

  if (!token) {
    b.warnungen.push(
      "Kostenwache: kein Zugang zur Plattform (VERCEL_TOKEN fehlt) — die Tagesmengen wurden weder erfasst " +
        "noch beurteilt. Kein Urteil heißt hier nicht „in Ordnung“: Die Protokolle werden nur einen Tag " +
        "aufbewahrt, ein verpasster Tag ist für immer verpasst.",
    );
    return b;
  }
  if (!supabaseZugang()) {
    b.warnungen.push(
      "Kostenwache: keine Datenbank erreichbar — ohne Ablage gibt es kein Vergleichsniveau und damit kein Urteil.",
    );
    return b;
  }

  for (const p of KOSTEN_PROJEKTE) {
    const bestand = await kostenZeilen(p.schluessel, tag);
    if (bestand === null) {
      b.warnungen.push(`Kostenwache ${p.name}: Ablage nicht lesbar — kein Urteil über diesen Tag.`);
      continue;
    }

    let heute = bestand.find((z) => z.tag === tag) ?? null;

    // Erst messen, wenn der Tag noch fehlt. Zweimal am Tag dieselbe Abfrage
    // liefert dasselbe und belastet die Plattform ohne Erkenntnis.
    if (!heute) {
      const [statusAusgang, pfadAusgang] = await Promise.all([
        protokollGruppen(token, p.projectId, tag, "statusCode"),
        protokollGruppen(token, p.projectId, tag, "requestPath"),
      ]);

      const abgewiesen = [statusAusgang, pfadAusgang].find((a) => a.art === "kein-zugang");
      if (abgewiesen && abgewiesen.art === "kein-zugang") {
        b.warnungen.push(
          `Kostenwache ${p.name}: Der Zugang zur Plattform wurde abgewiesen (HTTP ${abgewiesen.status}). ` +
            `Das ist kein leerer Tag, sondern ein ungültiges oder abgelaufenes Geheimnis — VERCEL_TOKEN in den ` +
            `Repo-Geheimnissen prüfen. Solange das steht, sammelt die Wache nichts, und jeder Tag ist danach ` +
            `unwiederbringlich weg (die Protokolle werden nur ${PROTOKOLL_AUFBEWAHRUNG_TAGE} Tag aufbewahrt).`,
        );
        continue;
      }

      const last = statusAusgang.art === "ok" ? leseGruppen(statusAusgang.text) : null;
      const flaeche = pfadAusgang.art === "ok" ? leseGruppen(pfadAusgang.text) : null;

      if (!last || !flaeche) {
        b.warnungen.push(
          `Kostenwache ${p.name}: Der ${tag} war nicht abrufbar — kein Wert abgelegt. ` +
            `Eine Null wäre hier eine Falschaussage (die Protokolle werden nur ${PROTOKOLL_AUFBEWAHRUNG_TAGE} Tag ` +
            `aufbewahrt; „nichts gefunden“ heißt fast immer „zu spät gefragt“, nicht „kein Verkehr“).`,
        );
        continue;
      }

      // Die Antwort listet nur die größten Gruppen auf. Fehlt etwas, ist es
      // höchstens so groß wie die kleinste gezeigte Gruppe — das wird
      // AUSGERECHNET statt behauptet. Bei der Gruppierung nach Statuscode sind
      // es eine Handvoll Gruppen und die Lücke rechnerisch belanglos; wächst sie
      // eines Tages, soll das auffallen und nicht in die Vergleichszahl wandern.
      const luecke = fehlbetragObergrenze(last);
      if (luecke > last.summe * FEHLBETRAG_MELDEN_AB_ANTEIL) {
        b.warnungen.push(
          `Kostenwache ${p.name}: Die Antwort für den ${tag} hat nur ${last.gezeigt} von ${last.verschiedene} ` +
            `Gruppen aufgelistet; die Zahl der Aufbauten kann um bis zu ${menge(luecke)} zu niedrig sein. ` +
            `Der Wert wird trotzdem abgelegt — er ist dann eine Untergrenze, keine Summe.`,
        );
      }

      const geschrieben = await kostenSchreiben({
        projekt: p.schluessel,
        tag,
        aufbauten: last.summe,
        adressen: flaeche.verschiedene,
        quelle: KOSTENWACHE_ZUGANG.quelle,
        gruppen_gezeigt: last.gezeigt,
        gruppen_gesamt: last.verschiedene,
      });
      if (!geschrieben) {
        b.warnungen.push(`Kostenwache ${p.name}: Tageswert für ${tag} konnte nicht abgelegt werden.`);
        continue;
      }
      heute = { projekt: p.schluessel, tag, aufbauten: last.summe, adressen: flaeche.verschiedene, gemeldet_am: null };
      bestand.unshift(heute);
    }

    // Number() auch hier: Große Ganzzahlen können aus der Datenbank als
    // Zeichenkette ankommen, und dann verglichen sich zwei Strings — der Sprung
    // fiele stumm aus, ohne Fehler und ohne dass es jemandem auffiele.
    const urteil = beurteileKostenTag(
      { tag: heute.tag, aufbauten: Number(heute.aufbauten), adressen: Number(heute.adressen) },
      bestand.map((z) => ({ tag: z.tag, aufbauten: Number(z.aufbauten), adressen: Number(z.adressen) })),
    );

    if (urteil.art === "kein-urteil") {
      // Ausdrücklich als offener Zustand ausgewiesen, nicht als grün.
      b.zeilen.push(`Kostenwache ${p.name} (${tag}): ${menge(Number(heute.aufbauten))} Aufbauten, ` +
        `${menge(Number(heute.adressen))} verschiedene Adressen — noch kein Urteil möglich (${urteil.grund})`);
      continue;
    }

    const reihe = bestand.map((z) => ({
      tag: z.tag,
      aufbauten: Number(z.aufbauten),
      adressen: Number(z.adressen),
    }));
    const maxLast = groesstesVielfaches(reihe, "aufbauten");
    const maxFlaeche = groesstesVielfaches(reihe, "adressen");
    const teil = urteil.groessen
      .map((g) => `${g.groesse === "aufbauten" ? "Aufbauten" : "Adressen"} ${menge(g.wert)} ` +
        `(Niveau ${menge(Math.round(g.basis))}, ${g.vielfaches === null ? "—" : `${g.vielfaches.toFixed(2)}×`})`)
      .join(" · ");
    b.zeilen.push(
      `Kostenwache ${p.name} (${tag}): ${teil}; Schwelle ${SPRUNG_FAKTOR}× — ` +
        `größtes bisher abgelegtes Vielfaches: Last ${maxLast ?? "—"}×, Fläche ${maxFlaeche ?? "—"}×`,
    );

    if (urteil.art === "sprung") {
      if (heute.gemeldet_am) continue; // schon gemeldet, nicht achtmal am Tag
      const details = urteil.groessen
        .filter((g) => g.gesprungen)
        .map((g) => `${g.name} liegt bei ${menge(g.wert)} statt der üblichen ${menge(Math.round(g.basis))} ` +
          `(${g.vielfaches?.toFixed(2)}-faches des Niveaus der Vortage)`)
        .join("; ");
      b.fuerClaude.push(
        `Kostensprung bei ${p.name} am ${tag}: ${details}. ${urteil.satz} ` +
          `Gemessen sind Mengen, nicht Euro — aber genau diese Mengen treiben den größten Rechnungsposten. ` +
          `Die Schwelle liegt beim ${SPRUNG_FAKTOR}-fachen des Medians der bis zu ${BASIS_TAGE} Vortage. ` +
          `Nachsehen: welche Adressen dazugekommen sind, wer sie aufruft (Bot-Kennung, Netzbetreiber), ` +
          `und ob sie aus dem CDN kommen. Die Schwelle NICHT hochsetzen, damit der Befund verschwindet.`,
      );
      await kostenGemeldet(p.schluessel, tag);
    }
  }

  return b;
}

function verdict(seconds: number, limits: { warn: number; fail: number }): "gruen" | "gelb" | "rot" {
  if (seconds >= limits.fail) return "rot";
  if (seconds >= limits.warn) return "gelb";
  return "gruen";
}

// ─── Cache-Wirksamkeit ───────────────────────────────────────────────────────
//
// Antwortzeit und Statuscode sagen NICHT, ob eine Seite noch vom CDN
// ausgeliefert wird. Genau daran ist der Juli-Ausfall vorbeigelaufen: Die
// Atlas-Seiten wurden live ungecacht ausgeliefert, obwohl im Code `revalidate`
// stand (fehlendes generateStaticParams + ungecachte Fetches). Sichtbar war das
// nur an `x-vercel-cache` — gemessen hat es niemand, und einzeln aufgerufen war
// die Seite schnell genug, um nicht aufzufallen. Erst die Summe riss die
// Notbremse.
//
// Die Probe stellt die Frage, die der Statuscode nicht beantwortet: Kommt
// dieselbe URL beim ZWEITEN Abruf aus dem Cache? Ein dauerhaftes MISS heißt,
// dass jeder Besucher den vollen Aufbau bezahlt.
//
// Bewusst NICHT über den Cache-Control-Header geprüft: Vercel ersetzt den
// Origin-Header, bevor er den Client erreicht (ISR-Seiten kommen als
// `max-age=0, must-revalidate` an, API-Routen als nacktes `public`). Wer dort
// nach `s-maxage` sucht, misst eine Zahl, die es im Netz gar nicht gibt.
const CACHE_PFLICHT = [
  { label: "Startseite", path: "/" },
  { label: "Atlas-Einstieg", path: "/solar-atlas" },
  // Der teuerste Seitentyp im Atlas: Der erste Aufbau der Klassen-Uebersicht lag
  // bei 4,9 s, aus dem Zwischenspeicher bei 0,3 s. Faellt der Speicher aus,
  // zahlt jeder Besucher die 4,9 s — und der Googlebot kommt ueber 119 Verweise
  // von den indexierten Atlas-Seiten.
  { label: "Ranglisten-Uebersicht", path: "/solar-atlas/ranking/zubau-3-jahre-je-einwohner" },
  { label: "Förder-Bundeslandseite", path: "/photovoltaik-foerderung/bayern" },
  { label: "Ratgeber", path: "/ratgeber/gasheizung-oder-waermepumpe" },
  { label: "Standort-Ertrag (30 Tage haltbar)", path: "/api/pvgis?lat=52.52&lon=13.405&plzPrefix=10" },
  { label: "Kühlgradstunden (30 Tage haltbar)", path: "/api/cooling-degree?lat=52.52&lon=13.405&plzPrefix=10" },
];

/** Zustände, die belegen, dass die Antwort aus dem CDN kam. */
const CACHE_TREFFER = new Set(["HIT", "STALE", "PRERENDER", "REVALIDATED"]);

export type CacheBefund = { label: string; ersterAbruf: string; zweiterAbruf: string; gecacht: boolean };

/**
 * Zwei Abrufe derselben URL. Der erste darf MISS sein (er füllt den Cache),
 * der zweite muss aus dem Cache kommen.
 *
 * `bypass` wird gesondert behandelt: dann greift eine bewusste Ausnahme
 * (Middleware-Matcher, no-store im Code) und die Seite gehört nicht in diese
 * Liste — das ist ein Befund über die LISTE, nicht über die Seite.
 */
export function cacheBefundAusZustaenden(label: string, erster: string, zweiter: string): CacheBefund {
  return {
    label,
    ersterAbruf: erster || "—",
    zweiterAbruf: zweiter || "—",
    gecacht: CACHE_TREFFER.has(zweiter.toUpperCase()),
  };
}

/** Wie oft nachgefasst wird, bevor „nicht gecacht" feststeht. */
const CACHE_VERSUCHE = 3;

async function pruefeCacheWirksamkeit(): Promise<CacheBefund[]> {
  const befunde: CacheBefund[] = [];
  for (const { label, path } of CACHE_PFLICHT) {
    const erster = await probe(label, path);
    // Nur bei erfolgreicher erster Antwort ist die Cache-Frage überhaupt
    // sinnvoll — ein 500er ist ein anderer Befund und wird oben schon gemeldet.
    if (erster.status !== 200) {
      befunde.push(cacheBefundAusZustaenden(label, erster.cache, "kein 200"));
      continue;
    }

    // Mehrfach nachfassen, bevor der Befund steht. Ein einzelner Fehlschlag
    // beweist nichts: Aufeinanderfolgende Abrufe landen nicht zwingend auf
    // demselben CDN-Knoten, und ein Eintrag kann zwischendurch verdrängt
    // werden. Beim ersten scharfen Lauf (29.07.2026) meldete genau das die
    // Kühlgradstunden als ungecacht — eine Minute später kamen sie sauber als
    // Treffer zurück. Ein Wächter, der so etwas rot meldet, startet den Autofix
    // ohne Grund und wird nach zwei Wochen weggefiltert; dann geht auch der
    // echte Befund unter.
    //
    // Die Unterscheidung trägt trotzdem: Eine wirklich ungecachte Route
    // verfehlt JEDEN Versuch (nachgestellt an /api/prices/health, bewusst
    // no-store), eine gesunde trifft spätestens beim zweiten.
    let letzter = erster.cache;
    for (let versuch = 0; versuch < CACHE_VERSUCHE; versuch++) {
      const weiterer = await probe(label, path);
      letzter = weiterer.cache;
      if (cacheBefundAusZustaenden(label, erster.cache, letzter).gecacht) break;
    }
    befunde.push(cacheBefundAusZustaenden(label, erster.cache, letzter));
  }
  return befunde;
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
 *
 * EINMAL JE ROT-SERIE, NICHT JE LAUF (24.08.2026) — das ist der Kern dieser
 * Funktion, nicht die Schwelle. Die erste Fassung fragte nur „sind die letzten
 * zwei rot?", und das ist ab dem dritten roten Lauf für immer wahr: Der Check
 * läuft alle drei Stunden, also ging dieselbe Frage acht Mal am Tag hinaus.
 * Gemessen am 23./24.08.2026: sechs wortgleiche Mails in fünfzehn Stunden, alle
 * über denselben abgebrochenen Förder-Lauf — dessen Behebung schon gepusht war
 * und nur auf den nächsten Tageslauf wartete. Genau der Fall, der Teil 3 des
 * Wächter-Gates ausgelöst hat („sieben Mails in drei Tagen ... zu viel Text, zu
 * viel was irrelevant ist"): Ein Absender, der sich wiederholt, wird
 * weggefiltert — und dann fehlt die eine Mail, die zählt.
 *
 * Deshalb wird die FLANKE gemeldet, also nur der Lauf, mit dem die Serie die
 * Schwelle erreicht: davor muss ein Lauf stehen, der nicht rot war. Das ist
 * ausdrücklich kein Hochsetzen einer Schwelle, damit ein Befund verschwindet
 * (Gate, Teil 2) — der Befund bleibt unverändert sichtbar, der Workflow bleibt
 * rot, die Autofix-Action läuft weiter, und im Sonntagsbericht steht er auch.
 * Was wegfällt, ist allein die Wiederholung derselben Frage.
 *
 * Bekannte Grenze, bewusst nicht gelöst: Löst sich Befund A und tritt in
 * derselben Rot-Serie Befund B auf, meldet sich niemand ein zweites Mal. Dafür
 * müsste die Historie den Befundtext tragen, den die GitHub-API nicht kennt —
 * und der Preis wäre die Zustandsdatei, die oben aus gutem Grund verworfen ist.
 * Rot bleibt rot; gesehen wird B über den Workflow, nicht über das Postfach.
 */
export function eskalationNoetig(vorherigeLaeufe: ("success" | "failure" | string)[]): boolean {
  if (vorherigeLaeufe.length < ESKALATION_AB_LAEUFEN - 1) return false;
  // -1, weil der laufende (rote) Durchgang selbst mitzählt.
  const serie = vorherigeLaeufe.slice(0, ESKALATION_AB_LAEUFEN - 1);
  if (!serie.every((c) => c === "failure")) return false;
  // Der Lauf VOR der Serie entscheidet, ob wir gerade erst die Schwelle
  // erreichen (melden) oder längst darüber hinaus sind (schweigen). Reicht die
  // Historie nicht so weit zurück, fängt die Serie am Anfang des Bekannten an —
  // dann ist es die Flanke.
  const davor = vorherigeLaeufe[ESKALATION_AB_LAEUFEN - 1];
  return davor === undefined || davor !== "failure";
}

/** Ein abgeschlossener Lauf, wie ihn die GitHub-API beschreibt. */
export type LaufAkte = { conclusion: string; dauerMin: number | null };

async function letzteLaeufe(workflow = "health-check.yml"): Promise<LaufAkte[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return [];
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?status=completed&per_page=5`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      workflow_runs?: { conclusion: string; run_started_at?: string; created_at?: string; updated_at?: string }[];
    };
    return (data.workflow_runs ?? []).map((r) => {
      // Gemessen wird ab `run_started_at`, nicht ab `created_at`: Sonst zählt die
      // Wartezeit auf einen freien Runner mit, und die hat mit dem Job-Zeitlimit
      // nichts zu tun. Bekannte Grenze der Näherung: Über den ganzen Lauf
      // gerechnet, nicht je Job — bei einem Workflow mit einem einzigen Job
      // (unsere geplanten Läufe) ist das derselbe Wert.
      const start = r.run_started_at ?? r.created_at;
      const ende = r.updated_at;
      const dauerMin =
        start && ende ? Math.max(0, (new Date(ende).getTime() - new Date(start).getTime()) / 60000) : null;
      return { conclusion: r.conclusion, dauerMin: Number.isFinite(dauerMin) ? dauerMin : null };
    });
  } catch {
    return [];
  }
}

async function letzteLaufErgebnisse(workflow = "health-check.yml"): Promise<string[]> {
  return (await letzteLaeufe(workflow)).map((l) => l.conclusion);
}

/**
 * Das Job-Zeitlimit aus der Workflow-Datei — gelesen, nicht angenommen.
 *
 * Zweite Liste wäre die falsche Lösung (dieselbe Begründung wie beim Zeitplan im
 * Test daneben): Wer das Limit in der Datei anhebt und die Kopie hier vergisst,
 * bekommt eine Warnung, die auf eine Zahl zeigt, die es nicht mehr gibt.
 * Ohne Angabe gilt GitHubs Vorgabe von 360 Minuten je Job.
 */
export function jobZeitlimitMinuten(workflowText: string): number {
  const treffer = [...workflowText.matchAll(/^\s*timeout-minutes:\s*(\d+)/gm)].map((m) => Number(m[1]));
  // Der größte Wert ist das Job-Limit: Die kleineren gehören einzelnen Schritten
  // (bei uns Browser-Download und Systempakete), und ein Schritt-Limit sagt über
  // die Gesamtdauer nichts.
  return treffer.length ? Math.max(...treffer) : 360;
}

/**
 * Wie viel Reserve muss ein geplanter Lauf zu seinem Zeitlimit behalten?
 *
 * Ein Viertel — und die Zahl kommt aus der MELDEVERZÖGERUNG, nicht aus Optik:
 * Reißt ein Lauf sein Limit, endet er „cancelled", und das meldet `laufStumm`
 * erst nach `LAUF_STUMM_AB` erfolglosen Läufen. Bei einem nächtlichen Lauf sind
 * das drei Nächte ohne Prüfung, bevor überhaupt jemand hinsieht — genau so ist
 * es dem Förder-Wächter im August 2026 ergangen. Die Warnung muss deshalb
 * greifen, solange noch Luft für einen gewöhnlichen Ausbau ist (eine Frage mehr
 * im Flow, ein Rechner mehr), nicht erst, wenn er schon abbricht.
 */
export const ZEITRESERVE_ANTEIL = 0.25;

/**
 * Braucht dieser geplante Lauf zu viel von seinem Zeitlimit?
 *
 * Bewertet wird der jüngste ERFOLGREICHE Lauf. Abgebrochene sind hier wertlos:
 * Sie dauern per Definition genau so lange wie das Limit, „knapp" daraus
 * abzuleiten wäre ein Zirkelschluss — und der Fall gehört ohnehin `laufStumm`.
 *
 * Reine Funktion mit hereingereichten Läufen: ohne Netz prüfbar. Kein Ergebnis,
 * keine Dauer, kein Urteil — nicht behaupten, was nicht gemessen wurde.
 */
export function zeitreserveKnapp(
  laeufe: ReadonlyArray<LaufAkte>,
  limitMin: number,
): { knapp: boolean; dauerMin: number; anteil: number } | null {
  const letzterErfolg = laeufe.find((l) => l.conclusion === "success" && l.dauerMin !== null);
  if (!letzterErfolg || letzterErfolg.dauerMin === null || !(limitMin > 0)) return null;
  const anteil = letzterErfolg.dauerMin / limitMin;
  return { knapp: anteil > 1 - ZEITRESERVE_ANTEIL, dauerMin: letzterErfolg.dauerMin, anteil };
}

/**
 * Die TÄGLICH geplanten Läufe, die niemand von Hand anstößt — und die deshalb
 * ausfallen können, ohne dass es jemandem auffällt.
 *
 * Drei Sorten stehen bewusst NICHT hier, jede aus einem eigenen Grund:
 *  · **Push-getriebene** (`ci`, `claude-autofix`): Ihr Ausbleiben heißt „niemand
 *    hat etwas geschoben", nicht „kaputt" — an einem ruhigen Wochenende wäre das
 *    ein sicherer Fehlalarm.
 *  · **Nur auf Zuruf** (`gsc-sitemap` hat allein `workflow_dispatch`): dasselbe.
 *    Diese Zeile stand hier schon einmal, weil ich den Zeitplan angenommen statt
 *    nachgesehen habe — Gate-Regel 3, am eigenen Code geprüft, nicht geglaubt.
 *  · **Selten geplante** (`laender-sync` monatlich, `mastr-refresh` monatlich):
 *    Drei Läufe ohne Erfolg wären dort ein Vierteljahr. Ein Melder, der so spät
 *    anschlägt, ist keiner; die gehören an ihr Prüfdatum, nicht hierher.
 *  · **Der Gesundheitscheck selbst**: Läuft der nicht, läuft auch diese Prüfung
 *    nicht. Dafür gibt es `eskalationNoetig` weiter oben.
 */
export const GEPLANTE_LAEUFE: ReadonlyArray<{ datei: string; was: string }> = [
  { datei: "foerder-watch.yml", was: "Förder-Seiten-Wächter" },
  { datei: "flows-nightly.yml", was: "Nächtlicher Flow-Läufer" },
];

/** Ab so vielen Läufen ohne Erfolg in Folge ist ein geplanter Lauf auffällig. */
export const LAUF_STUMM_AB = 3;

/**
 * Läuft dieser geplante Lauf noch durch — und wenn nicht, wie endet er?
 *
 * WARUM DAS HIER STEHT (23.08.2026): Der Abschnitt „Stillstehende Wächter"
 * darüber merkt einen Ausfall daran, dass ein PRÜFDATUM sich nicht mehr bewegt.
 * Das trägt nur für die modellgesteuerten Aufträge — ein GitHub-Workflow
 * stempelt kein Prüfdatum, sein Ausfall ist dort strukturell unsichtbar.
 *
 * Genau so ist es passiert: Der Förder-Seiten-Wächter endete vom 20. bis
 * 23.08.2026 viermal in Folge mit `cancelled` (Zeitlimit), und vier Tage lang
 * fielen Technik-Einordnung, Screening und Leseliste aus — die Arbeit an der
 * Katalog-Vollständigkeit. Gemeldet hat das nichts: Der Prüfstand war
 * vollständig grün, weil die Prüfdaten an anderen Läufen hängen.
 *
 * `cancelled` ist dabei die gefährlichste Endung und wird deshalb eigens
 * benannt. Rot sieht man; „abgebrochen" liest man als „egal" — dabei ist ein
 * Lauf ohne Urteil schlimmer als ein roter, weil niemand weiß, wie weit er kam.
 *
 * Reine Funktion mit hereingereichter Liste: Sie soll ohne Netz prüfbar sein.
 * Eine leere Liste (kein Token, lokaler Lauf) meldet NICHTS — im Zweifel nicht
 * behaupten, ein Lauf sei stumm, wenn wir bloß nicht nachsehen konnten.
 */
export function laufStumm(
  ergebnisse: ReadonlyArray<string | null>,
): { stumm: boolean; wie: string } {
  const jung = ergebnisse.slice(0, LAUF_STUMM_AB);
  if (jung.length < LAUF_STUMM_AB) return { stumm: false, wie: "" };
  if (jung.some((c) => c === "success")) return { stumm: false, wie: "" };

  // Wie endeten sie? Häufigste Endung zuerst — sie benennt die Ursache besser
  // als ein pauschales „nicht erfolgreich".
  const zaehler = new Map<string, number>();
  for (const c of jung) zaehler.set(c ?? "ohne Ergebnis", (zaehler.get(c ?? "ohne Ergebnis") ?? 0) + 1);
  const haeufigste = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { stumm: true, wie: haeufigste };
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
  // Geht an den Betreiber wie `forOperator`, macht den Lauf aber NICHT rot:
  // für Dinge, die nur er erledigen kann und bei denen es nichts zu analysieren
  // gibt. Rot würde hier den Autofix starten, der nichts ausrichten kann, und
  // uns nebenbei abgewöhnen, Rot ernst zu nehmen.
  const fuerBetreiberOhneRot: string[] = [];
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

  // ── Soft-404 im Atlas ─────────────────────────────────────────────────────
  //
  // Erfundene Atlas-Adressen antworteten bis 29.07.2026 mit HTTP 200 und der
  // 404-Seite im Body. Ursache war ein `loading.tsx`, das eine Suspense-Grenze um
  // die ganze Route legte: Die Hülle ging sofort raus, der Statuscode stand fest,
  // bevor die Seite wusste, ob es die Region gibt.
  //
  // Warum das hier gemessen wird und nicht nur im Test: Der Test
  // (lib/__tests__/atlas-soft-404.test.ts) nagelt die Code-STRUKTUR fest, aber ob
  // daraus am Ende wirklich ein 404 wird, entscheidet das Framework — genau das
  // hat sich schon einmal geändert. Ein Soft-404 ist von außen sonst unsichtbar:
  // Die Seite ist schnell, grün und liefert 200. Nur ein Aufruf, der ein 404
  // ERWARTET, findet ihn. Für Google zählt der Statuscode, nicht der Text.
  const soft404 = await probe("Atlas-Fantasieadresse", SOFT_404_PFAD);
  lines.push(`Erfundene Atlas-Adresse: HTTP ${soft404.status || "keine Antwort"} (erwartet 404)`);
  if (soft404.status !== 404) {
    forClaude.push(
      `Soft-404: ${SOFT_404_PFAD} antwortet mit ${soft404.status || "keiner Antwort"} statt 404. ` +
        `Google behandelt damit erfundene Adressen als gültige Seiten. Zuerst prüfen, ob wieder ein ` +
        `loading.tsx unter app/(site)/solar-atlas/ liegt oder die Routing-Entscheidung hinter das ` +
        `<Suspense> gerutscht ist.`,
    );
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
    // Je Ebene eine eigene Zeile: die Kreisseiten sind die nächste indexierbare
    // Ebene, ihr Wert soll im Bericht ablesbar sein und nicht in einer
    // gemeinsamen Zahlenreihe verschwinden.
    const gemeindeHits = coldResult.all.filter((p) => p.label.includes("Gemeinde"));
    const kreisHits = coldResult.all.filter((p) => p.label.includes("Landkreis"));
    for (const [name, hits] of [
      ["Atlas-Gemeinden", gemeindeHits],
      ["Atlas-Landkreise", kreisHits],
    ] as const) {
      if (!hits.length) continue;
      lines.push(
        `${name} frisch aufgebaut (${hits.length} Stichproben): ` +
          `${hits.map((p) => p.seconds.toFixed(1)).join(" / ")} s`,
      );
    }
    if (!kreisHits.length) {
      lines.push("Atlas-Landkreise: kein echter Kaltaufbau erwischt (alle Stichproben lagen im Cache).");
    }
    lines.push(
      `Langsamster Kaltaufbau ${cold.seconds.toFixed(2)} s (${cold.label}), ` +
        `${luft.toFixed(1)} s Luft bis zur Notbremse bei ${NOTBREMSE_S} s`,
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
      `Atlas-Datenbankabfragen, je schnellste aus ${DB_PROBE_RUNS} Messungen: ` +
        `${dbProbes.map((d) => `${d.label} ${d.ms} ms`).join(" · ")}` +
        ` (Vergleichs-Read ${dbProbes[0].baselineMs} ms)`,
    );
    for (const d of dbProbes) {
      if (d.error) {
        forClaude.push(`Die Atlas-Abfrage „${d.label}" antwortet nicht sauber: ${d.error}`);
      } else if (dbProbeVerdictRelativ(d.ms, d.baselineMs) === "rot") {
        forClaude.push(
          `Die Atlas-Abfrage „${d.label}" braucht ${d.ms} ms bei einem Vergleichs-Read von ${d.baselineMs} ms — ` +
            `und zwar in ihrem SCHNELLSTEN von ${DB_PROBE_RUNS} Versuchen, es ist also kein Ausreißer. ` +
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

  // ── Frische der MaStR-Daten ───────────────────────────────────────────────
  // Weder Statuscode noch Antwortzeit beantworten die Frage, ob die Zahlen im
  // Atlas noch von diesem Monat sind. Eine stehengebliebene Import-Pipeline
  // sieht von außen gesund aus — das ist genau die Sorte Fehler, die niemand
  // bemerkt.
  const mastr = await messeMastrFrische();
  if (mastr) {
    lines.push(`MaStR-Datenstand: ${mastr.importedAt.slice(0, 10)} (${mastr.alterTage} Tage alt).`);
    if (mastr.urteil === "rot") {
      forClaude.push(
        `Der Anlagenbestand im Atlas ist ${mastr.alterTage} Tage alt (Stand ${mastr.importedAt.slice(0, 10)}), ` +
          `damit sind mindestens zwei monatliche Importe ausgefallen. Über 11.000 Gemeindeseiten zeigen ` +
          `Zahlen von vorletztem Monat — sichtbar am Datenstand, aber sonst völlig unauffällig. ` +
          `Zu tun: den MaStR-Lauf lokal nachholen (scripts/mastr-refresh.ts, danach den Rollup auffrischen — ` +
          `ohne das bleibt der Atlas auf den alten Aggregaten). Der Autofix in GitHub Actions kann das NICHT: ` +
          `Er darf die Datenbank nicht anfassen, und der Gesamtdatenexport wird dort auch nicht geladen. ` +
          `Er soll deshalb berichten statt es zu versuchen.`,
      );
    } else if (mastr.urteil === "gelb") {
      warnings.push(
        `MaStR-Daten sind ${mastr.alterTage} Tage alt (Stand ${mastr.importedAt.slice(0, 10)}) — ` +
          `ein monatlicher Import fehlt.`,
      );
    }
  } else {
    // Kein Urteil über die Frische, sondern über den Abruf. Beides zu vermengen
    // hieße, eine Beobachtung zu behaupten, die es nicht gab.
    warnings.push("MaStR-Datenstand nicht abrufbar — keine Aussage über die Frische der Atlas-Zahlen.");
  }

  // ── Kann die Produktion Abo-Mails verschicken? ────────────────────────────
  const aboBereit = await messeAboBereit();
  if (aboBereit) {
    lines.push(
      aboBereit.bereit
        ? "Gemeinde-Abo: Versandweg und Signatur sind in der Produktion gesetzt."
        : `Gemeinde-Abo: ${aboBereit.fehlt.length} Einstellung(en) fehlen in der Produktion.`,
    );
    if (!aboBereit.bereit) {
      forClaude.push(
        `Das Gemeinde-Abo kann in der PRODUKTION nicht arbeiten — es fehlt: ${aboBereit.fehlt.join(", ")}. ` +
          `Jede Anmeldung endet damit für den Nutzer bei „Die Bestätigungsmail konnte gerade nicht verschickt ` +
          `werden", und niemand kommt ins Abo. Von außen ist das unsichtbar: Die Seite lädt, der Knopf ` +
          `funktioniert, kein Test wird rot — lokal ist ja alles gesetzt. Zu tun: die genannten Einstellungen ` +
          `in der Produktionsumgebung nachtragen und danach EINMAL neu ausliefern, sonst greifen sie nicht.`,
      );
    }
    // Und die zweite Hälfte: hat es auch gewirkt?
    if (aboBereit.ohneBeleg !== null && aboBereit.bereit) {
      lines.push(
        aboBereit.ohneBeleg === 0
          ? "Gemeinde-Abo: keine frische Anmeldung wartet auf eine Bestätigungsmail."
          : `Gemeinde-Abo: ${aboBereit.ohneBeleg} frische Anmeldung(en) ohne Versandbeleg.`,
      );
    }
    if (aboVersandStockt(aboBereit)) {
      forClaude.push(
        `${aboBereit.ohneBeleg} frische Anmeldung(en) im Gemeinde-Abo tragen keinen Versandbeleg, während die ` +
          `Zugangsdaten des Postfachs vollständig gesetzt sind. Beides ist gemessen; der Schluss daraus nicht — ` +
          `deshalb steht hier keine Diagnose, sondern der nächste Schritt. Zwei Lesarten: entweder die Mail hat ` +
          `den Server nicht verlassen (dann kommt niemand ins Abo, und der Anmelder sieht nur „Bitte später ` +
          `erneut" — gesetzt heißt eben nicht richtig, ein falsch getipptes Passwort ist gesetzt), oder sie ging ` +
          `hinaus und das Nachtragen des Belegs schlug fehl (dann fehlt der Einwilligungsnachweis, den die ` +
          `Datenschutzerklärung zusagt). Zu tun: das Protokoll der Produktion nach „[Abo]" durchsehen — dort ` +
          `steht, welcher der beiden Fälle vorliegt.`,
      );
    }
  }

  // ── Schreibt der Code in Spalten, die es gibt? ────────────────────────────
  const spalten = await messeSpaltenAbgleich();
  if (spalten) {
    const summe = spalten.fehlend.length + spalten.nullKollision.length;
    lines.push(
      summe === 0
        ? `Gespeicherte Berechnungen: Code und Tabelle passen zusammen.`
        : `Gespeicherte Berechnungen: ${summe} Abweichung(en) zwischen Code und Tabelle.`,
    );
    if (spalten.fehlend.length) {
      forClaude.push(
        `Beim Speichern einer Berechnung schreibt der Code ${spalten.fehlend.length === 1 ? "ein Feld" : "Felder"}, ` +
          `die es in der Tabelle nicht gibt: ${spalten.fehlend.join(", ")}. Damit scheitert JEDER Speicherversuch ` +
          `mit HTTP 500 — und zwar unsichtbar: kein Typfehler, kein roter Test, keine kaputte Seite, und bei drei ` +
          `Aufrufen die Woche fällt es auch an keiner Fehlerquote auf. Genau so blieb es von 03/2026 bis 08/2026 ` +
          `liegen. Zu tun: Spalte über /api/calculations/setup nachziehen (die Route trägt die Migration).`,
      );
    }
    if (spalten.nullKollision.length) {
      forClaude.push(
        `Beim Speichern einer Berechnung schreibt der Code NULL in Spalten, die einen Wert verlangen: ` +
          `${spalten.nullKollision.join(", ")}. Betroffen ist der Normalfall — der Nutzer hat dort nichts ` +
          `eigenes gesetzt. Auch das endet in HTTP 500 und ist von außen unsichtbar. Entweder darf die Spalte ` +
          `leer sein (dann Nullbarkeit nachziehen, /api/calculations/setup) oder der Code muss einen Wert ` +
          `liefern — was von beidem stimmt, entscheidet die Bedeutung des Feldes, nicht die Bequemlichkeit.`,
      );
    }
  }

  // ── Ablauf der Social-Zugänge ─────────────────────────────────────────────
  for (const s of await messeSocialAblauf()) {
    const wer = s.konto ? ` (${s.konto})` : "";
    // DIE ADRESSE MUSS ZUR PLATTFORM PASSEN. Sie stand fest auf LinkedIn, weil
    // es lange nur die eine gab — mit einem zweiten Kanal wird daraus eine
    // Anleitung, die ins Leere führt: Der Betreiber klickt, meldet LinkedIn neu
    // an, und der Instagram-Zugang läuft weiter aus. Dieselbe Fehlerklasse wie
    // eine Beschriftung, die etwas anderes sagt, als die Zahl daneben misst.
    const start = `solar-check.io/api/${s.plattform}/start`;
    fuerBetreiberOhneRot.push(
      s.tageBisAblauf < 0
        ? `Der ${s.plattform}-Zugang${wer} ist abgelaufen — seitdem wird nichts mehr veröffentlicht. ` +
          `Zum Erneuern einmal ${start} aufrufen (eingeloggt als Admin). ` +
          `Das kann nur jemand mit deinem Konto, ich komme da nicht heran.`
        : `Der ${s.plattform}-Zugang${wer} läuft in ${s.tageBisAblauf} Tagen ab. Danach hört das ` +
          `Veröffentlichen still auf. Einmal ${start} aufrufen (eingeloggt ` +
          `als Admin) setzt die Frist zurück — das dauert zwei Klicks und kann nur jemand mit deinem Konto.`,
    );
  }

  // ── Kostenwache ───────────────────────────────────────────────────────────
  // Weder Statuscode noch Antwortzeit noch Cache-Treffer beantworten die Frage,
  // ob die Mengen gerade davonlaufen. Der größte Rechnungsposten hat sich im
  // August verdreifacht und stand tagelang sichtbar da, ohne dass etwas
  // angeschlagen hätte — es gab schlicht niemanden, der hinsah.
  const kosten = await messeKosten(new Date());
  lines.push(...kosten.zeilen);
  forClaude.push(...kosten.fuerClaude);
  warnings.push(...kosten.warnungen);

  // ── Cache-Wirksamkeit ─────────────────────────────────────────────────────
  // Kein Zeitmaß, sondern eine Ja/Nein-Frage: Kommt die Seite beim zweiten
  // Abruf aus dem CDN? Läuft NACH den Zeitmessungen, damit die zusätzlichen
  // Abrufe die Kaltrender-Stichproben nicht vorwärmen.
  const cacheBefunde = await pruefeCacheWirksamkeit();
  const ungecacht = cacheBefunde.filter((c) => !c.gecacht);
  lines.push(
    `Cache-Wirksamkeit (zweiter Abruf derselben Adresse): ` +
      `${cacheBefunde.length - ungecacht.length}/${cacheBefunde.length} aus dem CDN` +
      (ungecacht.length ? ` — daneben: ${ungecacht.map((c) => `${c.label} (${c.zweiterAbruf})`).join(", ")}` : ""),
  );
  for (const c of ungecacht) {
    forClaude.push(
      `„${c.label}" wird nicht mehr aus dem CDN ausgeliefert: der zweite Abruf derselben Adresse kam als ` +
        `${c.zweiterAbruf} zurück (erster: ${c.ersterAbruf}), müsste aber ein Cache-Treffer sein. ` +
        `Das heißt, JEDER Besucher zahlt den vollen Aufbau — die Seite ist dann noch schnell genug, kippt aber ` +
        `unter Parallel-Last, und genau so ist der Juli-Ausfall entstanden. Übliche Ursachen: bei einer Seite ein ` +
        `fehlendes generateStaticParams oder ein Aufruf, der sie dynamisch macht (Cookies, Header, searchParams); ` +
        `bei einer API-Route ein fehlender oder überschriebener Cache-Control-Header. ` +
        `Ist die Ausnahme gewollt, gehört der Eintrag aus CACHE_PFLICHT heraus — mit Begründung.`,
    );
  }

  // ── Stillstehende Wächter ─────────────────────────────────────────────────
  //
  // WARUM DAS HIER STEHT UND NICHT NUR IM WÄCHTER-LAUF: `npm run stand:faellig`
  // lief bis zum 18.08.2026 ausschließlich INNERHALB von zwei Wächter-Aufträgen
  // (foerder-news-waechter täglich, Wochenbericht sonntags). Damit meldete der
  // Melder für stillstehende Wächter selbst nur, solange ein Wächter lief —
  // fällt der tägliche Lauf aus, fällt die Meldung über seinen Ausfall mit ihm
  // aus. Man merkt nicht einmal, dass man nichts merkt.
  //
  // Genau so ist es passiert: Der Grüngas-Rechtsstand stand 21 Tage unbewegt
  // (erlaubt: 14), ohne dass irgendjemand etwas gemeldet hat. Die Wächter laufen
  // nur, wenn der Rechner des Betreibers an ist; diese Action läuft alle drei
  // Stunden in GitHubs Rechenzentrum und ist damit die einzige Stelle, die den
  // Ausfall überhaupt bemerken kann.
  //
  // Der Aufruf braucht weder Netz noch Datenbank — er liest nur Konstanten aus
  // dem Code. Er kann diesen Lauf also nicht zum Kippen bringen.
  const heuteIso = new Date().toISOString().slice(0, 10);
  const offen = faelligkeiten(heuteIso);
  lines.push(
    `Prüfstand: ${PRUEFSTAND.length} Werte, ${offen.length} überfällig` +
      (offen.length ? ` — ${offen.map((f) => f.was).join(", ")}` : ""),
  );
  for (const f of offen) {
    // Zwei Befunde, zwei Adressaten — die Trennung stammt aus lib/pruefstand.ts
    // und ist hier genauso wichtig: "Termin überzogen" heißt, der WERT gehört
    // geprüft (das kann nur ein Wächter-Lauf mit Modell). "Stillstand" heißt,
    // der LAUF selbst schweigt — und das ist der gefährlichere Fall, weil ein
    // Wächter, der nicht läuft, auch keinen Fehler meldet.
    if (f.grund === "stillstand" || f.grund === "beides") {
      forClaude.push(
        `Der Prüfwert „${f.was}" steht seit ${f.alterTage} Tagen unbewegt (erlaubt: ${f.maxAlterTage}). ` +
          `Zuständig ist der Wächter „${f.waechter}" (${f.rhythmus}), Runbook ${f.runbook}, Feld ${f.feld}. ` +
          `Das heißt NICHT, dass der Wert falsch ist — es heißt, dass niemand mehr nachsieht. ` +
          `Prüfen: Läuft der Auftrag noch? Kommt er an seine Quelle? Kennt sein Auftrag das Feld? ` +
          `Das Datum NICHT von Hand hochsetzen — das wäre eine behauptete Prüfung, die nie stattfand.`,
      );
    } else {
      forClaude.push(
        `Der Prüfwert „${f.was}" ist seit ${f.terminUeberzogen} Tagen über seinem Termin. ` +
          `Zuständig: „${f.waechter}" (${f.rhythmus}), Runbook ${f.runbook}. ` +
          `Der Wächter läuft, hat den Wert aber nicht nachgezogen.`,
      );
    }
  }

  // ── Geplante Läufe, die nicht mehr durchkommen ────────────────────────────
  //
  // Der Abschnitt darüber sieht Prüfdaten; dieser sieht die Läufe selbst. Beides
  // ist nötig, weil ein GitHub-Workflow kein Prüfdatum stempelt und deshalb
  // oben nicht auftauchen kann (Begründung an `laufStumm`).
  for (const lauf of GEPLANTE_LAEUFE) {
    const akten = await letzteLaeufe(lauf.datei);
    const ergebnisse = akten.map((a) => a.conclusion);
    if (!ergebnisse.length) continue; // kein Token / lokal — nichts behaupten

    // Frühindikator: nicht der Abbruch, sondern der Abstand zum Zeitlimit.
    // Dieselbe Logik wie beim Kaltaufbau gegen die Notbremse — wer erst auf das
    // „cancelled" wartet, hat drei Nächte ohne Prüfung hinter sich.
    //
    // Steht ausdrücklich in `warnings` und macht den Lauf NICHT rot: Es ist
    // nichts kaputt, und rot würde die Autofix-Action auf ein Problem ansetzen,
    // dessen naheliegendster Griff — das Limit hochsetzen — genau der verbotene
    // ist (Gate, Teil 2). Gehört gemessen, nicht weggedrückt.
    const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const pfad = resolve(wurzel, ".github", "workflows", lauf.datei);
    if (existsSync(pfad)) {
      const limitMin = jobZeitlimitMinuten(readFileSync(pfad, "utf8"));
      const reserve = zeitreserveKnapp(akten, limitMin);
      if (reserve?.knapp) {
        warnings.push(
          `Der geplante Lauf „${lauf.was}" braucht ${Math.round(reserve.dauerMin)} von ${limitMin} erlaubten Minuten ` +
            `(${Math.round(reserve.anteil * 100)} %). Reißt er das Limit, endet er „abgebrochen" — und das fällt erst ` +
            `nach ${LAUF_STUMM_AB} Läufen auf. Nachsehen, was gewachsen ist; das Limit NICHT ohne Messung hochsetzen.`,
        );
      }
    }

    const { stumm, wie } = laufStumm(ergebnisse);
    if (!stumm) continue;
    forClaude.push(
      `Der geplante Lauf „${lauf.was}" (${lauf.datei}) endete ${LAUF_STUMM_AB}× in Folge ohne Erfolg, zuletzt „${wie}". ` +
        (wie === "cancelled"
          ? `„Abgebrochen" heißt Zeitlimit, nicht Fehler — und es liest sich als „egal", ` +
            `deshalb steht es hier. Nachsehen, welcher Schritt die Zeit frisst und ob die ` +
            `Schritte DANACH überhaupt noch drankommen; ein Lauf ohne Urteil ist schlimmer als ein roter. `
          : `Nachsehen, woran er scheitert. `) +
        `Das Job-Zeitlimit NICHT ohne Messung hochsetzen — erst herausfinden, was gewachsen ist.`,
    );
  }

  // ── Releaseplan ───────────────────────────────────────────────────────────
  //
  // Aus demselben Grund hier und nicht nur im Wächter-Lauf (siehe oben): Ein
  // Plan, der sich nur meldet, wenn ihn jemand abfragt, meldet sich nicht. Der
  // Plan entscheidet, welche Ortsseiten wann erscheinen — verstreicht ein Datum
  // unbemerkt, passiert nichts Schlimmes, aber es passiert eben auch nichts.
  // Liest nur Konstanten, kein Netz, keine Datenbank.
  const planOffen = planMeldungen(new Date());
  lines.push(
    `Releaseplan: ${RELEASE_PLAN.length} Schübe, ${planOffen.length} offen` +
      (planOffen.length ? ` — ${planOffen.map((p) => p.schub).join(", ")}` : ""),
  );
  // Nie an den Betreiber: Ein anstehender Schub ist ein Arbeitsschritt, keine
  // Entscheidung. Und nur ein widersprüchlicher Plan ist ROT — eine fehlende
  // Messung ist Arbeitsvorrat und steht tage- bis wochenlang an. Stünde der
  // Gesundheitscheck deswegen alle drei Stunden auf Rot, liefe jedes Mal die
  // Selbstheilung an, nach drei Läufen ginge eine Frage an den Betreiber, und
  // vor allem gewöhnte es uns ab, Rot ernst zu nehmen. Genau davor warnt die
  // Meldelogik in CLAUDE.md — die gelbe Schwelle sitzt aus demselben Grund bei
  // 4 s und nicht im Normalbereich.
  for (const p of planOffen) {
    if (p.schwere === "fehler") forClaude.push(p.text);
    else warnings.push(p.text);
  }

  // ── Bericht ───────────────────────────────────────────────────────────────
  const ampel =
    forOperator.length || forClaude.length
      ? "ROT"
      : selfHealed.length
        ? "REPARIERT"
        : // Eine Sache, die nur der Betreiber erledigen kann, ist mindestens gelb:
          // grün mit einer offenen Bitte im Bericht wäre ein Widerspruch.
          warnings.length || fuerBetreiberOhneRot.length
          ? "GELB"
          : "GRUEN";
  const report = [
    `Solar Check Gesundheitscheck: ${ampel}`,
    "",
    ...lines,
    ...(selfHealed.length ? ["", "Selbst repariert (nichts zu tun):", ...selfHealed.map((s) => `- ${s}`)] : []),
    ...(forOperator.length || fuerBetreiberOhneRot.length
      ? ["", "Entscheidung des Betreibers:", ...[...forOperator, ...fuerBetreiberOhneRot].map((p) => `- ${p}`)]
      : []),
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
    ...fuerBetreiberOhneRot,
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
