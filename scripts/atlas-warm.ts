/**
 * Atlas-Aufwärm-Crawl — hält alle Gemeinde- (und Kreis-)Seiten des Solar-Atlas
 * im CDN warm, damit der erste Besucher nach dem monatlichen MaStR-Datenlauf
 * keinen Kaltrender (~1,3–1,7 s DB-Reads) zahlt, sondern eine gecachte Seite
 * bekommt. Läuft als GitHub-Action-Job NACH `mastr:refresh-bnetza` (die Vercel-
 * ISR-Seiten sind dann stale und rendern beim nächsten Zugriff neu — dieser
 * Crawl löst genau das aus und legt sie in den CDN-Cache).
 *
 * Warum GitHub Action statt Vercel-Cron: 11k Seiten × gedrosselt = ~1 h, das
 * sprengt jedes Function-Timeout. Warum gedrosselt: jeder Kaltrender macht ~10
 * Supabase-Reads; ein ungedrosselter Burst über 11k Seiten legt die DB um
 * (ist 2026-07 passiert). Default bewusst konservativ.
 *
 * Freshness: der Crawl wärmt nur den Cache (Tempo). Die Daten-Aktualität regelt
 * die ISR-`revalidate` (3600 s) der Seiten selbst — spätestens 1 h nach dem
 * Datenlauf zeigen alle Seiten die neuen Zahlen; der Crawl beschleunigt das für
 * die Long-Tail-Seiten, die sonst niemand aufruft.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY  (Slug-Liste lesen)
 *   ATLAS_WARM_BASE_URL   Basis-URL (default https://solar-check.io)
 *   ATLAS_WARM_CONC       gleichzeitige Requests (default 3)
 *   ATLAS_WARM_DELAY_MS   Mindestpause zwischen Dispatches (default 150)
 *   ATLAS_WARM_LEVELS     "gemeinde,landkreis" (default) — kommasepariert
 *   ATLAS_WARM_LIMIT      optionale Obergrenze (Test/Teillauf)
 */

type RegionRow = { region_id: string; level: string; slug: string | null };

const BASE_URL = (process.env.ATLAS_WARM_BASE_URL ?? "https://solar-check.io").replace(/\/$/, "");
// Conc 4 hält den Vollauf (~11k Kaltrender à ~1,5 s) bei ~2 req/s → gut 1,5–2 h,
// Last ~15–20 leichte Supabase-Reads/s (Rollup-Point-Lookups). Bewusst niedrig
// wegen [[feedback_db_schonen]]; via Env hochstellbar, wenn die Instanz es trägt.
const CONC = Math.max(1, Number(process.env.ATLAS_WARM_CONC ?? 4));
const DELAY_MS = Math.max(0, Number(process.env.ATLAS_WARM_DELAY_MS ?? 100));
const LEVELS = (process.env.ATLAS_WARM_LEVELS ?? "gemeinde,landkreis")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = process.env.ATLAS_WARM_LIMIT ? Number(process.env.ATLAS_WARM_LIMIT) : Infinity;
const REQ_TIMEOUT_MS = 25000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Alle Regionen mit Slug laden (region_id = AGS: 8 Gemeinde, 5 Kreis, 2 Land).
 *  Paginiert, weil Supabase pro Abfrage bei 1000 Zeilen deckelt. Eine leichte
 *  Spalten-Auswahl, kein Aggregat — schont die DB. */
async function loadRegions(): Promise<Map<string, RegionRow>> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const byId = new Map<string, RegionRow>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mastr_regions")
      .select("region_id, level, slug")
      .not("slug", "is", null)
      .order("region_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`mastr_regions read failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data as RegionRow[]) byId.set(r.region_id, r);
    if (data.length < PAGE) break;
  }
  return byId;
}

/** URL-Pfade aus den Slugs bauen. Kreis = bl/kreis, Gemeinde = bl/kreis/gemeinde.
 *  Der Eltern-Slug kommt aus dem AGS-Präfix (kein Parent-Walk nötig). Fehlt ein
 *  Eltern-Slug (Region noch nicht in der Registry), wird der Pfad übersprungen. */
function buildPaths(byId: Map<string, RegionRow>): string[] {
  const paths: string[] = [];
  let skipped = 0;
  for (const r of Array.from(byId.values())) {
    if (!LEVELS.includes(r.level) || !r.slug) continue;
    const blSlug = byId.get(r.region_id.slice(0, 2))?.slug;
    if (r.level === "landkreis") {
      if (!blSlug) { skipped++; continue; }
      paths.push(`/solar-atlas/${blSlug}/${r.slug}`);
    } else if (r.level === "gemeinde") {
      const kreisSlug = byId.get(r.region_id.slice(0, 5))?.slug;
      if (!blSlug || !kreisSlug) { skipped++; continue; }
      paths.push(`/solar-atlas/${blSlug}/${kreisSlug}/${r.slug}`);
    }
  }
  if (skipped > 0) console.log(`(${skipped} Regionen übersprungen — Eltern-Slug fehlt)`);
  // Kreise zuerst (füllen den unstable_cache der Eltern-Schnitte, die die
  // Gemeinde-Renders danach mitnutzen), dann Gemeinden.
  paths.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  return paths;
}

async function warmOne(path: string): Promise<"ok" | "fail"> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "user-agent": "solar-check-atlas-warmer/1.0" },
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    });
    // 200 und 304 sind Erfolg; alles andere zählt als Fehler (aber bricht nicht ab).
    return res.status === 200 || res.status === 304 ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

async function main() {
  const t0 = Date.now();
  console.log(`Atlas-Warmer → ${BASE_URL} · Levels [${LEVELS.join(", ")}] · Conc ${CONC} · Delay ${DELAY_MS}ms`);
  const byId = await loadRegions();
  console.log(`${byId.size} Regionen mit Slug geladen.`);
  let paths = buildPaths(byId);
  if (Number.isFinite(LIMIT)) paths = paths.slice(0, LIMIT);
  const total = paths.length;
  console.log(`${total} Seiten zu wärmen.`);

  let ok = 0;
  let fail = 0;
  let idx = 0;

  async function worker() {
    while (idx < total) {
      const path = paths[idx++];
      if (DELAY_MS) await sleep(DELAY_MS);
      const r = await warmOne(path);
      if (r === "ok") ok++;
      else fail++;
      const done = ok + fail;
      if (done % 500 === 0 || done === total) {
        const secs = (Date.now() - t0) / 1000;
        const rate = (done / secs).toFixed(1);
        console.log(`  ${done}/${total} · ok ${ok} · fail ${fail} · ${rate} req/s · ${Math.round(secs)}s`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, total) }, () => worker()));

  const secs = Math.round((Date.now() - t0) / 1000);
  const failRate = total ? fail / total : 0;
  console.log(`Fertig: ${ok} ok, ${fail} fehlgeschlagen von ${total} in ${secs}s (${(failRate * 100).toFixed(1)}% Fehler).`);
  // Nur abbrechen, wenn ein Großteil scheitert → die Site ist down o. Ä.
  // Einzelne 500er (z. B. ein DB-Schluckauf) sollen den Lauf NICHT rot färben.
  if (total > 0 && failRate > 0.5) {
    console.error("Über 50 % Fehler — vermutlich ist die Seite nicht erreichbar.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
