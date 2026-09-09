/**
 * Wer baut die Websites der PV-Fachbetriebe?
 *
 * Anlass (01.09.2026): Wenn wenige Agenturen viele Betriebs-Websites betreuen,
 * ist eine Kooperation mit ihnen der kürzere Weg als 3.114 Einzelansprachen —
 * eine Integration erreicht auf einen Schlag mehr Seiten als jedes Verzeichnis.
 * Ob es diese Konzentration gibt, ist eine MESSUNG, keine Vermutung.
 *
 * Bauweise wie beim CMS-Lauf: Stichprobe, deterministisch gezogen, seitenweise
 * aus der Datenbank gelesen (ein einfaches select() liefert stumm nur 1.000
 * Zeilen).
 *
 * Erkennung: Ein Agenturhinweis besteht aus ZWEI Teilen — einem Signalwort
 * ("Realisierung", "Umsetzung", "Webdesign" …) UND einem Link auf eine fremde
 * Domain in dessen Nähe. Nur der Link wäre wertlos (Fußbereiche sind voll
 * fremder Links: Netzwerke, Verbände, Hersteller); nur das Wort ebenso.
 *
 * Aufruf: npm run fachbetriebe:agenturen -- [--n 400]
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function makeClient(): Promise<SupabaseLike> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen (.env.local)");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Signalwörter für einen Erstellervermerk. Bewusst eng: "Design" allein träfe
// jede Seite, die über ihr eigenes Design spricht.
const SIGNAL =
  /(realisier\w*|umsetzung|umgesetzt\s+(von|durch)|webdesign|web-design|erstellt\s+(von|durch)|gestaltung\s+(von|durch)|konzeption\s+und|programmier\w*\s+(von|durch)|powered\s+by|website\s+by|ein\s+projekt\s+von)/i;

// Was nie eine Agentur ist, auch wenn ein Signalwort danebensteht.
const KEINE_AGENTUR =
  /(google|facebook|instagram|linkedin|youtube|twitter|x\.com|wordpress\.(org|com)|typo3\.org|joomla\.org|jimdo|wix\.com|ionos|strato|1und1|shopify|cloudflare|adobe|microsoft|apple|mozilla|schema\.org|w3\.org|gstatic|jquery|fontawesome|bootstrap|cookiebot|usercentrics|borlabs|etracker|matomo|handwerkskammer|innung|zveh|dehoga|tuv|tuev|dekra|provenexpert|trustedshops|ekomi|hwk-|ihk)/i;

function hostAus(url: string): string | null {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return h.includes(".") ? h : null;
  } catch {
    return null;
  }
}

/** Sucht Ersteller-Hinweise: ein Signalwort und in seiner Nähe ein Link auf
 *  eine FREMDE Domain. Gibt die gefundenen fremden Hosts zurück. */
function findeAgenturen(html: string, eigeneDomain: string): string[] {
  const treffer = new Set<string>();
  const eigen = eigeneDomain.replace(/^www\./, "").toLowerCase();

  // Alle Links mit ihrer Position einsammeln.
  const links: { pos: number; host: string; text: string }[] = [];
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const host = hostAus(m[1]);
    if (!host) continue;
    if (host === eigen || host.endsWith("." + eigen) || eigen.endsWith("." + host)) continue;
    if (KEINE_AGENTUR.test(host)) continue;
    links.push({ pos: m.index, host, text: m[2].replace(/<[^>]+>/g, " ") });
  }
  if (links.length === 0) return [];

  // Für jedes Signalwort: gibt es in den 300 Zeichen davor oder danach einen
  // fremden Link? Diese Fensterbreite ist dieselbe wie beim Förder-Screener.
  const sigRe = new RegExp(SIGNAL.source, "gi");
  while ((m = sigRe.exec(html)) !== null) {
    const von = m.index - 300;
    const bis = m.index + 300;
    for (const l of links) if (l.pos >= von && l.pos <= bis) treffer.add(l.host);
  }
  // Der Linktext selbst kann das Signal tragen ("Webdesign: Muster GmbH").
  for (const l of links) if (SIGNAL.test(l.text)) treffer.add(l.host);

  return [...treffer];
}

async function holeSeite(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "solar-check.io Erhebung (einmalige Stichprobe)",
        accept: "text/html",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return (await res.text()).slice(0, 500_000);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const nArg = args.indexOf("--n");
  const stichprobe = nArg >= 0 ? Number(args[nArg + 1]) : 400;

  const db = await makeClient();

  const alle: { domain: string; impressum_url: string | null }[] = [];
  const SEITE = 1000;
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await db
      .from("fachbetriebe")
      .select("domain, impressum_url")
      .eq("art", "betrieb")
      .order("domain", { ascending: true })
      .range(von, von + SEITE - 1);
    if (error) throw new Error(`Datenbank: ${error.message}`);
    const teil = data ?? [];
    alle.push(...teil);
    if (teil.length < SEITE) break;
  }

  const schritt = Math.max(1, Math.floor(alle.length / stichprobe));
  const probe = alle.filter((_, i) => i % schritt === 0).slice(0, stichprobe);
  console.log(`Bestand: ${alle.length} · Stichprobe: ${probe.length} (jeder ${schritt}.)`);

  const zaehler = new Map<string, number>();
  let mitHinweis = 0;
  let erreicht = 0;
  let fertig = 0;
  let naechster = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const i = naechster++;
      if (i >= probe.length) return;
      const { domain, impressum_url } = probe[i];
      // Der Vermerk steht im Fußbereich der Startseite ODER im Impressum.
      const seiten = [`https://${domain}/`];
      if (impressum_url) seiten.push(impressum_url);
      const gefunden = new Set<string>();
      let hatAntwort = false;
      for (const url of seiten) {
        const html = await holeSeite(url);
        if (html === null) continue;
        hatAntwort = true;
        findeAgenturen(html, domain).forEach((h) => gefunden.add(h));
      }
      if (hatAntwort) erreicht++;
      if (gefunden.size) {
        mitHinweis++;
        gefunden.forEach((h) => zaehler.set(h, (zaehler.get(h) ?? 0) + 1));
      }
      fertig++;
      if (fertig % 50 === 0) console.log(`  ${fertig}/${probe.length} …`);
    }
  }

  await Promise.all(Array.from({ length: 8 }, () => arbeiter()));

  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nErreicht: ${erreicht} von ${probe.length}`);
  console.log(
    `Mit Ersteller-Hinweis: ${mitHinweis} (${((mitHinweis / Math.max(1, erreicht)) * 100).toFixed(1)} % der erreichten)`,
  );
  console.log(`Verschiedene Ersteller: ${sortiert.length}\n`);
  console.log("Häufigste (ab 2 Betrieben):");
  const mehrfach = sortiert.filter(([, n]) => n >= 2);
  if (mehrfach.length === 0) console.log("  KEINE — jeder Hinweis kommt genau einmal vor.");
  for (const [host, n] of mehrfach.slice(0, 30)) console.log(`  ${String(n).padStart(3)}  ${host}`);
  console.log(`\nNur ein Betrieb: ${sortiert.length - mehrfach.length} Ersteller`);
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
