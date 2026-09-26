/**
 * Wo kommt Verkehr an — und wo lohnt sich Arbeit?
 *
 *   npm run traffic:bericht            ausgeben
 *   npm run traffic:bericht -- --melden  zusätzlich in die Wächter-Ablage (wöchentlicher Lauf)
 *
 * Three questions, each from the source that actually measures it:
 *   1. Which pages get visitors, and what moved against the week before?
 *      (Vercel Web Analytics, last 7 full days vs the 7 before)
 *   2. Where do visitors come from, apart from search engines? (same source)
 *   3. Which search queries are close enough to be worth work — sharpen an
 *      existing page, or write a new one? (Search Console, 28 days, 3 days lag)
 *
 * Numbers are lower bounds: the analytics run in the browser, script blockers
 * are invisible.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { aggregat } from "../lib/web-analytics";
import { heuteInBerlin } from "../lib/zeit";
import { ordneHerkunft } from "../lib/outreach-herkunft";
import { bewegungen, chancen, type Suchanfrage, type Zeile } from "../lib/traffic-bericht";
import { berichtAblegen } from "../lib/alert-senden";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const tag = (tageZurueck: number) => heuteInBerlin(new Date(Date.now() - tageZurueck * 86_400_000));

async function zeilen(seit: string, bis: string, nach: string): Promise<Zeile[]> {
  // "bis" is exclusive in Vercel's reading (a date is a day boundary).
  return (await aggregat({ datensatz: "visits", zeitraum: { seit, bis }, nach: [nach], limit: 100 })).map((r) => ({
    schluessel: String(r[nach] ?? "") || "(ohne Verweis)",
    besucher: Number(r.visitors ?? 0),
  }));
}

async function main() {
  loadEnvFile();
  const melden = process.argv.includes("--melden");
  const out: string[] = [];
  const log = (z = "") => { out.push(z); console.log(z); };

  // Last 7 FULL days: today is incomplete and would always look like a drop.
  const heute = tag(0), w1 = tag(7), w2 = tag(14);
  log(`Traffic ${w1} bis ${tag(1)} gegen ${w2} bis ${tag(8)}\n`);

  const [seitenJ, seitenV, herkunftJ, herkunftV] = await Promise.all([
    zeilen(w1, heute, "requestPath"), zeilen(w2, w1, "requestPath"),
    zeilen(w1, heute, "referrerHostname"), zeilen(w2, w1, "referrerHostname"),
  ]);
  const summe = (z: Zeile[]) => z.reduce((s, x) => s + x.besucher, 0);
  log(`Besucher gesamt (Summe über Seiten): ${summe(seitenJ)} gegen ${summe(seitenV)}`);

  log("\nMeistbesuchte Seiten:");
  for (const s of seitenJ.filter((x) => x.schluessel !== "Others").slice(0, 15)) log(`  ${String(s.besucher).padStart(5)}  ${s.schluessel}`);

  const b = bewegungen(seitenJ, seitenV);
  log("\nSteigt (mind. +5 Besucher):");
  for (const x of b.steigt.slice(0, 10)) log(`  +${String(x.delta).padEnd(4)} ${x.schluessel} (${x.vorher} → ${x.jetzt})`);
  if (!b.steigt.length) log("  nichts");
  log("\nFällt (mind. −5 Besucher):");
  for (const x of b.faellt.slice(0, 10)) log(`  ${String(x.delta).padEnd(5)} ${x.schluessel} (${x.vorher} → ${x.jetzt})`);
  if (!b.faellt.length) log("  nichts");

  // Sources other than search engines — and for each, where they land. A
  // source that sends people to one calculator says which page to sharpen.
  log("\nHerkunft außer Suchmaschinen (Besucher, Vorwoche, Zielseiten):");
  const vorher = new Map(herkunftV.map((z) => [z.schluessel, z.besucher]));
  for (const h of herkunftJ) {
    const host = h.schluessel;
    if (host === "Others" || host === "(ohne Verweis)") continue;
    const art = ordneHerkunft(host);
    if (art === "suche" || art === "intern" || art === "pruefdienst") continue;
    const ziele = await aggregat({
      datensatz: "visits", zeitraum: { seit: w1, bis: heute }, nach: ["requestPath"],
      filter: `referrerHostname eq '${host.replace(/'/g, "''")}'`, limit: 3,
    });
    log(`  ${String(h.besucher).padStart(4)} (${vorher.get(host) ?? 0})  ${host} → ${ziele.filter((z) => z.requestPath !== "Others").map((z) => `${z.requestPath} ${z.visitors}`).join(", ")}`);
  }
  const suche = herkunftJ.filter((h) => ordneHerkunft(h.schluessel) === "suche").reduce((s, x) => s + x.besucher, 0);
  const ohne = herkunftJ.find((h) => h.schluessel === "(ohne Verweis)")?.besucher ?? 0;
  log(`  Suchmaschinen und KI zusammen: ${suche} · ohne Verweis (direkt, Apps, Mail): ${ohne}`);

  // Search Console lags 2–3 days; "final" data only.
  log("\nSuchanfragen mit Potenzial (Search Console, 28 Tage, Position 4–30, ab 20 Impressionen):");
  try {
    // The service account lives on Vercel only; locally and in Actions the
    // production route answers for it (same auth as the alert filing).
    const { gscConfigured, querySearchAnalyticsByQuery } = await import("../lib/gsc-search-analytics");
    let anfragen: Suchanfrage[];
    if (gscConfigured()) {
      anfragen = await querySearchAnalyticsByQuery({ startDate: tag(31), endDate: tag(3) });
    } else {
      const basis = process.env.ALERT_BASE_URL ?? "https://solar-check.io";
      const res = await fetch(`${basis}/api/seo/gsc?dim=query&days=28`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`, "User-Agent": "solar-check-health-check" },
      });
      const j = (await res.json()) as { configured?: boolean; error?: string; queries?: Suchanfrage[] };
      if (!res.ok || !j.queries) throw new Error(j.error ?? (j.configured === false ? "auf Vercel nicht eingerichtet" : `HTTP ${res.status}`));
      anfragen = j.queries;
    }
    const c = chancen(anfragen);
    if (!c.length) log("  keine");
    for (const x of c.slice(0, 20)) {
      const was = x.art === "neuer-inhalt" ? "eigene Seite?" : "nachschärfen";
      log(`  ${String(x.impressions).padStart(5)} Impr · Pos ${x.position.toFixed(1).padStart(4)} · ${x.clicks} Klicks · ${was.padEnd(13)} „${x.query}" → ${x.page.replace(/^https?:\/\/[^/]+/, "")}`);
    }
  } catch (e) {
    log(`  ! Search Console NICHT erreichbar: ${(e as Error).message} — dieser Teil fehlt, er ist nicht leer.`);
  }

  if (melden) {
    await berichtAblegen(
      { tag: "traffic-bericht", subject: "Traffic-Bericht der Woche", audience: "claude", details: out.join("\n"), decisions: [], done: ["Traffic der Woche ausgewertet"] },
      process.env.CRON_SECRET ?? "",
      { basis: process.env.ALERT_BASE_URL },
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
