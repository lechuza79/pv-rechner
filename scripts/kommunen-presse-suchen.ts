/**
 * Did a contacted municipality get its ranking into the press or onto its own
 * site — anywhere on the web, not only on its own domain?
 *
 *   npm run kommunen:presse             read only
 *   npm run kommunen:presse -- --trocken  only show what would be asked
 *
 * CHECK BEFORE TRUSTING A CHANGE: Berkenthin, Riedstadt, Nidda, Aue-Bad
 * Schlema, Heringen and Wallertheim must come out of it; they are known
 * publications. The third version (22.09.2026) found all six plus two nobody
 * knew: Urmitz on LinkedIn and Nidda on a second news portal.
 *
 * WHY THIS RUN EXISTS (22.09.2026): Berkenthin and Riedstadt had published —
 * Berkenthin on its own site and in the regional paper "Herzogtum direkt",
 * Riedstadt in the Rhein Main Verlag — and none of our four sources knew:
 *   - the backlink index lags weeks behind and never sees a page without a link,
 *   - the per-domain search (`kommunen:verweise`) only looks at the municipal
 *     domain, and a newspaper is not on it,
 *   - visitor referrers only exist once somebody clicks.
 * Both were found by a plain web search for place + measure + "Platz 1". This
 * run makes that search systematic: per municipality one normal web search
 * and one news search (the news index had both articles on the day they
 * appeared), plus ONE query across the web for our address next to "Platz 1" —
 * that one found Aue-Bad Schlema's own Facebook post, which the Facebook
 * search itself did not show.
 *
 * FIRST VERSION FAILED ITS CHECK AND IS WHY THE FILTER LOOKS AT TITLES: with
 * quoted terms and a full-text check it returned 362 "candidates" (archived
 * computer magazines, cleaning companies) and missed both known articles. A
 * result counts only if its TITLE names the place and a ranking word.
 *
 * It WRITES NOTHING. A hit is a candidate until a human has read the page: the
 * query matches any "Platz 1" article about the place, and "Platz 1" is a
 * common phrase. Only a link to our domain is reported as a proof.
 */
import { envLaden } from "./env-laden";
envLaden();
import { createClient } from "@supabase/supabase-js";

const trocken = process.argv.includes("--trocken");
const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORT = process.env.DATAFORSEO_PASSWORD;
const PREIS_JE_ABRUF = 0.002;
let ausgegeben = 0;

/**
 * The measure as the letter wrote it ("Balkonkraftwerken", "privater
 * Speicherkapazität") — a press text copies the headline, so the letter's exact
 * words find it. Stemming them ("Balkonkraftwerk") lost Berkenthin's article.
 */
function stichwort(betreff: string | null): string {
  return betreff?.match(/\bbei (.+?) auf Platz 1\b/)?.[1] ?? "Solar";
}

type Fund = { url: string; titel: string };

async function serp(frage: string, art: "organic" | "news" = "organic", tiefe = 10): Promise<{ adressen: Fund[]; fehler: string | null }> {
  // The service answers "Internal SE Server Error" on a few percent of calls
  // (14 of 289 in one run); a second try usually goes through.
  const erst = await serpEinmal(frage, art, tiefe);
  return erst.fehler ? serpEinmal(frage, art, tiefe) : erst;
}

async function serpEinmal(frage: string, art: "organic" | "news", tiefe: number): Promise<{ adressen: Fund[]; fehler: string | null }> {
  const auth = Buffer.from(`${LOGIN}:${PASSWORT}`).toString("base64");
  ausgegeben += PREIS_JE_ABRUF;
  try {
    const res = await fetch(`https://api.dataforseo.com/v3/serp/google/${art}/live/advanced`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ keyword: frage, location_code: 2276, language_code: "de", depth: tiefe }]),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return { adressen: [], fehler: `HTTP ${res.status}` };
    const d: any = await res.json();
    const a = d?.tasks?.[0];
    if (/no search results/i.test(String(a?.status_message ?? ""))) return { adressen: [], fehler: null };
    if (a?.status_code >= 40000) return { adressen: [], fehler: String(a.status_message) };
    const items: any[] = a?.result?.[0]?.items ?? [];
    return {
      adressen: items
        .filter((i) => (i?.type === "organic" || i?.type === "news_search") && i.url)
        .map((i) => ({ url: String(i.url), titel: String(i.title ?? "") })),
      fehler: null,
    };
  } catch (e) {
    return { adressen: [], fehler: String((e as Error)?.message ?? e).slice(0, 60) };
  }
}

type Befund = "link" | "erwaehnt" | "kandidat" | "unerreichbar";

/** Our own pages and aggregator portals repeat every place name; they prove nothing. */
const EIGEN_ODER_PORTAL = /solar-check\.io|wikipedia\.org|dasoertliche|balkonkraftwerk-check|rechnerphotovoltaik|enfsolar|houzz|selfmade-energy|pv-navi|solaranlagen-portal/i;

/** Title names the place and a ranking — everything else is noise (measured). */
const RANG = /Platz\s*1\b|Spitzenplatz|Spitzenreiter|vorne|Rang 1/i;
function titelPasst(titel: string, ort: string): boolean {
  return titel.includes(ort) && RANG.test(titel);
}

async function pruefeSeite(url: string): Promise<Befund> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return "unerreichbar";
    const html = await res.text();
    if (/<a[^>]*href="[^"]*solar-check\.io[^"]*"/i.test(html)) return "link";
    const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
    return /solar-check\.io/i.test(text) ? "erwaehnt" : "kandidat";
  } catch {
    return "unerreichbar";
  }
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, outreach_status, draft_subject, mastr_regions!inner(name)")
    .not("contacted_at", "is", null)
    .limit(1000);
  if (error) throw new Error(error.message);
  const gemeinden = ((data ?? []) as any[]).map((z) => {
    const name = String(z.mastr_regions?.name ?? z.region_id);
    // "Heringen (Werra)" is written "Heringen" in a newspaper.
    const ort = name.replace(/\s*\(.*\)$/, "");
    return { ags: z.region_id, name, ort, wort: stichwort(z.draft_subject), status: z.outreach_status };
  });

  console.log(`${gemeinden.length} angeschriebene Gemeinden, geschätzt ${(gemeinden.length * 2 * PREIS_JE_ABRUF).toFixed(2)} $\n`);
  if (trocken) {
    for (const g of gemeinden.slice(0, 8)) console.log(`  ${g.ort} ${g.wort} Platz 1`);
    return;
  }
  if (!LOGIN || !PASSWORT) {
    console.error("Zugangsdaten fehlen (DATAFORSEO_LOGIN/PASSWORD).");
    process.exit(1);
  }

  const treffer: { name: string; url: string; status: string; art: Befund }[] = [];
  const fehlgeschlagen: string[] = [];
  let fertig = 0;
  const warteschlange = [...gemeinden];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let g = warteschlange.shift(); g; g = warteschlange.shift()) {
        const frage = `${g.ort} ${g.wort} Platz 1`;
        const gesehen = new Map<string, string>();
        let gescheitert = 0;
        for (const art of ["organic", "news"] as const) {
          const { adressen, fehler } = await serp(frage, art);
          if (fehler) gescheitert++;
          for (const f of adressen) gesehen.set(f.url, f.titel);
        }
        if (gescheitert === 2) fehlgeschlagen.push(`${g.name}: Suche kam nicht durch`);
        for (const [u, titel] of gesehen) {
          if (EIGEN_ODER_PORTAL.test(u) || !titelPasst(titel, g.ort)) continue;
          treffer.push({ name: g.name, url: u, status: g.status, art: await pruefeSeite(u) });
        }
        if (++fertig % 25 === 0) console.error(`  … ${fertig} von ${gemeinden.length} gesucht`);
      }
    }),
  );

  // One query across the web: our address next to "Platz 1". Social posts by a
  // municipality turn up here and nowhere else.
  // Several phrasings: the service returns partial pages without saying which,
  // and one query came back empty in a run where it had found the post before.
  const fremdMap = new Map<string, string>();
  for (const q of [`"solar-check.io" Platz 1`, `"solar-check.io" Balkonkraftwerken`, `"solar-check.io" Solarleistung`, `"solar-check.io/solar-atlas"`]) {
    const r = await serp(q, "organic", 100);
    if (r.fehler) fehlgeschlagen.push(`Quer-Suche ${q}: ${r.fehler}`);
    for (const f of r.adressen) if (!EIGEN_ODER_PORTAL.test(f.url)) fremdMap.set(f.url, f.titel);
  }
  const fremd = [...fremdMap].map(([url, titel]) => ({ url, titel }));

  const nachName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");
  const links = treffer.filter((t) => t.art === "link").sort(nachName);
  const kandidaten = treffer.filter((t) => t.art === "kandidat").sort(nachName);
  console.log(`MIT LINK AUF UNS: ${links.length}`);
  for (const t of links) console.log(`  ${t.name.padEnd(26)} [${t.status}] ${t.url}`);
  const erwaehnt = treffer.filter((t) => t.art === "erwaehnt").sort(nachName);
  console.log(`\nNENNT UNS, OHNE LINK: ${erwaehnt.length}`);
  for (const t of erwaehnt) console.log(`  ${t.name.padEnd(26)} [${t.status}] ${t.url}`);
  console.log(`\nKANDIDATEN (Titel passt, uns nicht genannt) — von Hand lesen, ob es unsere Meldung ist: ${kandidaten.length}`);
  for (const t of kandidaten) console.log(`  ${t.name.padEnd(26)} [${t.status}] ${t.url}`);
  console.log(`\nQUER-SUCHE „solar-check.io" + „Platz 1", fremde Seiten: ${fremd.length}`);
  for (const f of fremd) console.log(`  ${f.url}\n    ${f.titel}`);
  if (fehlgeschlagen.length) {
    console.log(`\nSUCHE KAM NICHT DURCH: ${fehlgeschlagen.length}`);
    for (const f of fehlgeschlagen.slice(0, 10)) console.log(`  ${f}`);
  }
  console.log(`\nKosten: ${ausgegeben.toFixed(3)} $`);
  console.log(
    `\nVORBEHALT: Print und geschlossene Kanäle (Facebook, LinkedIn, Apps) findet auch diese Suche nicht,\n` +
      `und eine Meldung, die den Aufhänger umformuliert, fällt durch die Abfrage.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
