/**
 * Fundstellen: Wo steht etwas über unsere Aussendungen, das noch nicht
 * eingetragen ist?
 *
 *   npm run outreach:fundstellen
 *
 * Zwei Quellen, die die übrige Auswertung nicht hat (Regeln und Anlass in
 * lib/outreach-fundstellen.ts):
 *   1. der Backlink-Index, Seite für Seite — jede verlinkende Seite, die nach
 *      einer Veröffentlichung aussieht;
 *   2. die Websites aller angeschriebenen Gemeinden und Redaktionen, gelesen
 *      nach einer Erwähnung von uns — auch ohne Link.
 *
 * Ausgabe: offene Funde und die Websites, die nicht lesbar waren. Exit-Code 2,
 * wenn etwas offen ist — die Auswertung meldet dann NICHT „vollständig".
 * Erledigt ist ein Fund, sobald seine Adresse eingetragen ist
 * (kommunen:veroeffentlichungen -- --eintragen) oder in einer Notiz steht.
 */
import { envLaden } from "./env-laden";
envLaden();
import { createClient } from "@supabase/supabase-js";
import { UA } from "../lib/website-abruf";
import {
  adressenIn,
  domainVon,
  LINK_THEMA,
  LINK_UEBERSICHT,
  moeglicheVeroeffentlichung,
  nenntUns,
  offeneFunde,
  ohneUebersichten,
  verlinktUns,
  type Fund,
} from "../lib/outreach-fundstellen";

const PARALLEL = 4; // different sites; many small towns share one host, so stay low
// Gentle by design (07.10.2026): 40 pages per site with no pause got this
// machine blocked by a municipal hosting provider serving ~45 towns ("Zugriff
// verweigert" for any user agent) — the same towns whose contact pages the
// send run re-reads before a letter goes out. A news item sits on the start
// page or one click below; twelve pages and a pause per site are enough.
const MAX_SEITEN_JE_WEBSITE = 12;

type Ziel = { name: string; url: string };

let zeitlimitMs = 15_000;
/** Pause zwischen zwei Seiten derselben Website (nur im zweiten Durchgang). */
let pauseMs = 1_000;
const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hole(url: string): Promise<{ html: string; url: string } | null> {
  const ctrl = new AbortController();
  const uhr = setTimeout(() => ctrl.abort(), zeitlimitMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return { html: (await res.text()).slice(0, 1_000_000), url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(uhr);
  }
}

const sichtbar = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

function links(html: string, basis: string, host: string): { url: string; text: string }[] {
  const aus: { url: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], basis);
      if (u.host === host) aus.push({ url: u.href, text: m[2].replace(/<[^>]+>/g, " ") });
    } catch {
      // not a usable address
    }
  }
  return aus;
}

/** Eine Website lesen: Startseite, Nachrichten-Übersichten, themennahe Seiten. */
async function lies(ziel: Ziel): Promise<{ erreichbar: boolean; funde: Fund[] }> {
  const start = await hole(ziel.url);
  if (!start) return { erreichbar: false, funde: [] };
  const host = new URL(start.url).host;
  const gelesen = new Set<string>([start.url]);
  const funde: Fund[] = [];
  const pruefe = (s: { html: string; url: string }) => {
    if (nenntUns(sichtbar(s.html))) funde.push({ quelle: "website", url: s.url, empfaenger: ziel.name, mitLink: verlinktUns(s.html) });
  };
  pruefe(start);
  const erste = links(start.html, start.url, host).filter((l) => LINK_THEMA.test(l.url + " " + l.text) || LINK_UEBERSICHT.test(l.url + " " + l.text));
  const warteschlange = [...new Set(erste.map((l) => l.url))];
  while (warteschlange.length && gelesen.size < MAX_SEITEN_JE_WEBSITE) {
    const u = warteschlange.shift()!;
    if (gelesen.has(u)) continue;
    gelesen.add(u);
    if (pauseMs) await warte(pauseMs);
    const s = await hole(u);
    if (!s) continue;
    pruefe(s);
    // From an overview page, follow what sounds like our topic — that is where a news item sits.
    if (LINK_UEBERSICHT.test(u)) {
      for (const l of links(s.html, s.url, host)) if (LINK_THEMA.test(l.url + " " + l.text) && !gelesen.has(l.url)) warteschlange.push(l.url);
    }
  }
  return { erreichbar: true, funde };
}

async function backlinkSeiten(bekannt: Set<string>): Promise<Fund[] | null> {
  const login = process.env.DATAFORSEO_LOGIN, pass = process.env.DATAFORSEO_PASSWORD;
  if (!login || !pass) return null;
  const res = await fetch("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${login}:${pass}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify([{ target: "solar-check.io", mode: "as_is", limit: 1000, backlinks_status_type: "live", exclude_internal_backlinks: true }]),
  });
  const j: any = await res.json();
  const task = j.tasks?.[0];
  if (task?.status_code !== 20000) throw new Error(`Backlink-Index: ${task?.status_message ?? res.status}`);
  const funde: Fund[] = [];
  for (const it of task.result?.[0]?.items ?? []) {
    const d = domainVon(it.url_from ?? "");
    if (d === "solar-check.io" || !moeglicheVeroeffentlichung(it.url_to ?? "", d, bekannt)) continue;
    funde.push({ quelle: "verweis", url: it.url_from, mitLink: true });
  }
  return funde;
}

async function main() {
  const db = createClient((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const [gem, aus, pubs, pubs2] = await Promise.all([
    db.from("kommunen_kontakt").select("region_id, website, notes, mastr_regions(name)").not("contacted_at", "is", null).limit(5000),
    db.from("aussendungen").select("domain, antwort_notiz").limit(5000),
    db.from("kommunen_veroeffentlichung").select("url, notiz").limit(5000),
    db.from("aussendung_veroeffentlichung").select("url, notiz").limit(5000),
  ]);
  for (const r of [gem, aus, pubs, pubs2]) if (r.error) throw new Error(r.error.message);

  const erledigt: string[] = [];
  for (const p of [...pubs.data!, ...pubs2.data!]) erledigt.push(p.url, ...adressenIn(p.notiz));
  for (const g of gem.data!) erledigt.push(...adressenIn(g.notes));
  for (const a of aus.data!) erledigt.push(...adressenIn(a.antwort_notiz));

  const ziele: Ziel[] = [];
  const bekannt = new Set<string>();
  for (const g of gem.data! as any[]) {
    if (!g.website) continue;
    const url = /^https?:/.test(g.website) ? g.website : `https://${g.website}`;
    bekannt.add(domainVon(url));
    ziele.push({ name: g.mastr_regions?.name ?? g.region_id, url });
  }
  for (const d of new Set((aus.data! as any[]).map((a) => a.domain).filter(Boolean))) {
    bekannt.add(d);
    ziele.push({ name: d, url: `https://${d}` });
  }

  let verweise: Fund[] | null = null;
  let verweisFehler = "";
  try {
    verweise = await backlinkSeiten(bekannt);
  } catch (e) {
    verweisFehler = (e as Error).message;
  }

  const funde: Fund[] = [...(verweise ?? [])];
  const durchgang = async (liste: Ziel[], parallel: number): Promise<Ziel[]> => {
    const fehlt: Ziel[] = [];
    let i = 0;
    await Promise.all(
      Array.from({ length: parallel }, async () => {
        while (i < liste.length) {
          const z = liste[i++];
          const r = await lies(z);
          if (!r.erreichbar) fehlt.push(z);
          funde.push(...r.funde);
        }
      }),
    );
    return fehlt;
  };
  // Many small towns share one hosting provider (municipal IT services in
  // Brandenburg and Sachsen-Anhalt); a parallel crawl makes it throttle us for
  // minutes. Measured 07.10.2026: 79 sites lost in the first pass, still 49
  // after an immediate retry — every one of them answered in 0.1 s when asked
  // alone. Second pass: wait for the throttle to clear, one site at a time,
  // a pause between pages.
  const ersteFehlt = await durchgang(ziele, PARALLEL);
  if (ersteFehlt.length) await warte(120_000);
  zeitlimitMs = 30_000;
  pauseMs = 2_000;
  const unerreichbar = (await durchgang(ersteFehlt, 1)).map((z) => z.name);

  const offen = ohneUebersichten(offeneFunde(funde, erledigt), erledigt);
  console.log(`Backlink-Index: ${verweise ? `${verweise.length} mögliche Veröffentlichungen` : `NICHT gelesen${verweisFehler ? ` (${verweisFehler})` : " (Zugang fehlt)"}`}`);
  console.log(`Websites gelesen: ${ziele.length - unerreichbar.length} von ${ziele.length}`);
  if (unerreichbar.length) console.log(`  nicht lesbar (${unerreichbar.length}): ${unerreichbar.sort().join(", ")}`);
  if (!offen.length) {
    console.log("✓ keine offenen Fundstellen — alles Gefundene ist eingetragen oder in einer Notiz verworfen");
  } else {
    console.log(`\n! ${offen.length} offene Fundstellen — lesen, dann eintragen oder in der Notiz verwerfen:`);
    for (const f of offen) console.log(`  ${f.quelle === "verweis" ? "Verweis " : "Website "} ${f.empfaenger ? `${f.empfaenger} · ` : ""}${f.mitLink ? "mit Link" : "ohne Link"} · ${f.url}`);
  }
  // Unreadable sites are a gap, not a "nothing found": the verdict must not say complete.
  if (unerreichbar.length) console.log(`NICHT_LESBAR=${unerreichbar.length}`);
  process.exitCode = offen.length || !verweise || unerreichbar.length ? 2 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
