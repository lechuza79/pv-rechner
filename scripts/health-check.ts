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

import { DB_READ_TIMEOUT_MS } from "../lib/db-timeout";

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
const SLOW = { atlasCold: { warn: 3.0, fail: 5.0 }, page: { warn: 2.0, fail: 4.0 } };

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

  // Zufälliger Ausschnitt statt Vollscan: ein Offset in die Gemeindeliste.
  const offset = Math.floor(Math.random() * 9000);
  const gem = await q(
    `mastr_regions?select=slug,parent_region_id&level=eq.gemeinde&slug=not.is.null&limit=${count}&offset=${offset}`,
  );
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

/** Misst echte Kaltrender. Ein Treffer im Cache misst nichts Interessantes (dann
 *  liefert das CDN eine fertige Seite aus), solche Versuche zählen nicht mit. */
async function measureColdAtlas(): Promise<{ worst: Probe; all: Probe[] } | null> {
  const candidates = [...(await randomGemeindePaths(COLD_SAMPLES + 2)), ...FALLBACK_GEMEINDEN];
  const hits: Probe[] = [];
  for (const path of candidates) {
    if (hits.length >= COLD_SAMPLES) break;
    const p = await probe("Atlas-Gemeinde (kalt)", path);
    if (p.cache !== "HIT") hits.push(p);
  }
  if (!hits.length) return null;
  return { worst: hits.reduce((a, b) => (b.seconds > a.seconds ? b : a)), all: hits };
}

function verdict(seconds: number, limits: { warn: number; fail: number }): "gruen" | "gelb" | "rot" {
  if (seconds >= limits.fail) return "rot";
  if (seconds >= limits.warn) return "gelb";
  return "gruen";
}

async function main() {
  const lines: string[] = [];
  const problems: string[] = [];
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

  // ── Function-Region ───────────────────────────────────────────────────────
  const regions = Array.from(
    new Set([...pageProbes, ...(coldResult?.all ?? [])].map((p) => p.region).filter(Boolean)),
  );
  const wrongRegion = regions.filter((r) => r !== EXPECTED_REGION);
  if (wrongRegion.length) {
    problems.push(
      `Function-Region ist ${wrongRegion.join("/")} statt ${EXPECTED_REGION}. Die Datenbank steht in Frankfurt — ` +
        `aus einer anderen Region kostet jeder Datenbank-Zugriff Latenz über den Atlantik, und genau daran ist ` +
        `der Atlas im Juli 2026 gestorben. Prüfen: "regions" in vercel.json.`,
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
      problems.push(`${p.label} antwortet mit ${p.status || "keiner Antwort"} (${p.cache || "—"}).`);
    }
  }
  if (cold && cold.status !== 200) {
    problems.push(`Atlas-Gemeindeseite antwortet mit ${cold.status || "keiner Antwort"} — ${cold.url}`);
  }

  // ── Zeiten ────────────────────────────────────────────────────────────────
  const slowest = pageProbes.reduce((a, b) => (b.seconds > a.seconds ? b : a), pageProbes[0]);
  lines.push(
    `Normale Seiten: langsamste ${slowest.seconds.toFixed(2)} s (${slowest.label}), ` +
      `Rest ${pageProbes.map((p) => p.seconds.toFixed(1)).join(" / ")} s`,
  );
  const pageVerdict = verdict(slowest.seconds, SLOW.page);
  if (pageVerdict === "rot") problems.push(`${slowest.label} braucht ${slowest.seconds.toFixed(2)} s — deutlich zu lang.`);
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
      problems.push(
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

  // ── Bericht ───────────────────────────────────────────────────────────────
  const ampel = problems.length ? "ROT" : warnings.length ? "GELB" : "GRUEN";
  const report = [
    `Solar Check Gesundheitscheck: ${ampel}`,
    "",
    ...lines,
    ...(problems.length ? ["", "Probleme:", ...problems.map((p) => `- ${p}`)] : []),
    ...(warnings.length ? ["", "Auffaellig:", ...warnings.map((w) => `- ${w}`)] : []),
  ].join("\n");

  console.log(report);

  if (ALERT && (problems.length || warnings.length)) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error("\n--alert gesetzt, aber CRON_SECRET fehlt — keine Mail verschickt.");
    } else {
      const res = await fetch(`${BASE_URL}/api/alert`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          subject: `Gesundheitscheck ${ampel}`,
          body: report,
          tag: "health-check",
        }),
      });
      console.log(res.ok ? "\nMeldung per Mail verschickt." : `\nMail fehlgeschlagen: ${res.status}`);
    }
  }

  // Exit 1 lässt den GitHub-Workflow rot werden — das ist der Kanal, der auch
  // dann greift, wenn niemand eine App offen hat.
  if (problems.length) process.exit(1);
}

main().catch((e) => {
  console.error("Gesundheitscheck selbst fehlgeschlagen:", e);
  process.exit(1);
});
