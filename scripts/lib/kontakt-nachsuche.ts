/**
 * Follow-up search for public administrations the main contact search left
 * without an address — shared by districts and municipalities.
 *
 * Built on 30.09.2026 from three hand checks of district misses; each check
 * found a class the engine could not see:
 *  1. The right page sits three levels deep. `vormerken` finds it through the
 *     sitemap and the site's own search form and hands it to the research run.
 *  2. The office publishes a mailbox named after itself
 *     ("pressestelle@kreis-lippe.de") without a role sentence next to it.
 *     `postfachNachName` takes it as a fallback, with the page it stood on.
 *  3. The administration writes from a domain other than its website
 *     ("en-kreis.de" for "enkreis.de", "lra-mil.de", "landratsamt.dillingen.de"),
 *     also after redirects. `eigenePostfaecher` decides which domains are its own.
 *
 * The engine itself (scripts/lib/kontakt-lauf.ts) stays untouched: its files
 * are part of the rules fingerprint of the municipal letters.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { entschluesseltOderRoh } from "../../lib/uri-sicher";
import { suchAdresse, suchFormular, suchseitenLink } from "../../lib/funding-url-suche";
import { readJson } from "./kontakt-lauf";
import { deobfuscatePublishedMail } from "../../lib/mail-deobfuscation";
import { decodeEntities, entschleiere } from "../../lib/kommunen-profil";

export type Vormerkung = { url: string; priority: number };

export async function holen(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; solar-check.io contact research)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

/** Pages worth reading first: from the sitemap and the site's own search. */
export async function vormerken(website: string, ziel: RegExp, suchbegriffe: string[], vorrang: RegExp): Promise<Vormerkung[]> {
  const host = new URL(website).host.replace(/^www\./, "");
  const eigen = (u: string) => { try { return new URL(u).host.replace(/^www\./, "") === host; } catch { return false; } };
  const funde = new Map<string, number>();
  const nimm = (u: string, text = "") => {
    if (!eigen(u) || /\.(jpe?g|png|gif|svg|css|js|ics|zip)(\?|$)/i.test(u)) return;
    if (ziel.test(entschluesseltOderRoh(u).replace(/[-_/]/g, " ")) || ziel.test(text)) {
      const key = u.split("#")[0];
      funde.set(key, Math.max(funde.get(key) ?? 0, vorrang.test(u + text) ? 1000 : 900));
    }
  };
  const origin = new URL(website).origin;
  for (const pfad of ["/sitemap.xml", "/sitemap_index.xml"]) {
    const xml = await holen(origin + pfad);
    if (!xml) continue;
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
    for (const l of locs.filter(l => /sitemap/i.test(l) && l.endsWith(".xml")).slice(0, 8)) {
      const sub = await holen(l);
      if (sub) for (const m of sub.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) nimm(m[1]);
    }
    for (const l of locs) nimm(l);
    if (funde.size) break;
  }
  const start = await holen(website);
  if (start) {
    const formular = suchFormular(start, website);
    const suchseite = formular ? null : suchseitenLink(start, website);
    for (const begriff of suchbegriffe) {
      const url = formular ? suchAdresse(formular, begriff) : suchseite ? `${suchseite}${suchseite.includes("?") ? "&" : "?"}q=${encodeURIComponent(begriff)}` : null;
      if (!url) continue;
      const html = await holen(url);
      if (!html) continue;
      for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
        try { nimm(new URL(m[1], url).href, m[2].replace(/<[^>]+>/g, " ")); } catch { /* malformed link */ }
      }
    }
  }
  return [...funde].map(([url, priority]) => ({ url, priority })).sort((a, b) => b.priority - a.priority).slice(0, 12);
}

export const PRESSE_POSTFACH = /^(?:presse|pressestelle|pressebuero|medien|oeffentlichkeitsarbeit|kommunikation)[@.-]/;
export const KLIMA_POSTFACH = /^(?:klimaschutz|klima|klimaschutzmanagement|energie|energieberatung|klimaschutzagentur)[@.-]/;

/** Freemail hosts: a club or a resident, never the administration — unless the
 * mailbox carries the place name ("gemeinde-gries@t-online.de", hand check 01.10.2026). */
const FREIMAIL = /^(?:gmx\.(?:de|net|at)|web\.de|t-online\.de|gmail\.com|googlemail\.com|outlook\.(?:de|com)|hotmail\.(?:de|com)|yahoo\.(?:de|com)|freenet\.de|arcor\.de|posteo\.de|mail\.de|online\.de|icloud\.com|aol\.(?:de|com))$/;
/** Hosts that publish on every portal and are never the administration itself. */
const FREMD = /kirche|pfarr|kath|evang|bistum|erzbistum|dekanat|diakonie|caritas|kita|schule|gymnasium|feuerwehr|verein|sportverein|news|zeitung|anzeiger|kurier|rundschau|verbraucher|vhs|volkshochschule|musikschule|jobcenter|klinik|sparkasse|touris|advantic|ionos|kommune365|komm\.one|bund\.de$|\.bwl\.de$|niedersachsen\.de$|nrw\.de$|rlp\.de$|hessen\.de$/;

export type Verwaltungsart = {
  /** Prefixes of the website name that are not the place ("landkreis-", "gemeinde-"). */
  namensvorsatz: RegExp;
  /** Office markers a foreign-looking mail domain may carry ("lra", "vg", "amt"). */
  amtsmarke: RegExp;
  /** Office hosts that are the administration by form ("lra-mil.de", "kreis-fs.de"). */
  amtshost: RegExp;
};

export const KREIS: Verwaltungsart = {
  namensvorsatz: /^(?:landkreis|kreis|lk|lra|landratsamt)-?/,
  amtsmarke: /^(?:lra|landratsamt|landkreis|kreis|lk|kv)/,
  amtshost: /^(?:(?:lra|landratsamt|kreis|kv|kreisverwaltung|lk)[-.]?[a-z-]+\.de|(?:lra|landratsamt)[-.]?[a-z-]+\.(?:bayern|thueringen)\.de)$/,
};

export const GEMEINDE: Verwaltungsart = {
  namensvorsatz: /^(?:gemeinde|stadt|markt|vg|verbandsgemeinde|samtgemeinde|amt)-?/,
  amtsmarke: /^(?:gemeinde|stadt|markt|vgem|vg|verbandsgemeinde|verwaltungsgemeinschaft|samtgemeinde|amt|rathaus)/,
  amtshost: /^(?:gemeinde|stadt|markt|vgem|vg|verbandsgemeinde|verwaltungsgemeinschaft|samtgemeinde|amt)[-.][a-z-]+\.(?:de|info)$/,
};

/**
 * Every mailbox on the administration's own stored pages, restricted to the
 * domains that count as its own. Every stored page came from this entry's own
 * crawl, also after a redirect to another host.
 */
export function eigenePostfaecher(quellen: string, website: string, art: Verwaltungsart): { email: string; url: string }[] {
  if (!existsSync(quellen)) return [];
  const site = (h: string) => h.toLowerCase().split(".").slice(-2).join(".");
  const flach = (h: string) => site(h).replace(/[^a-z0-9]/g, "");
  const own = site(new URL(website).hostname);
  const funde: { email: string; url: string }[] = [];
  for (const f of readdirSync(quellen).filter(f => f.endsWith(".html"))) {
    const metaPfad = resolve(quellen, f.replace(/\.html$/, ".json"));
    const meta = existsSync(metaPfad) ? readJson(metaPfad) : {};
    const url = meta.finalUrl ?? meta.url ?? website;
    // Imprints encode their address against spam (TYPO3 shift, "info[at]…");
    // the same decoders the main search uses (hand check, 01.10.2026).
    const html = entschleiere(decodeEntities(deobfuscatePublishedMail(readFileSync(resolve(quellen, f), "utf8"))));
    for (const m of html.match(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,6}\b/gi) ?? []) {
      const email = m.toLowerCase(), domain = email.split("@")[1];
      if (/de-mail\.de$|\.(png|jpe?g|gif|svg|webp)$/.test(email) || FREMD.test(domain)) continue;
      funde.push({ email, url });
    }
  }
  const jeDomain = new Map<string, Set<string>>();
  for (const x of funde) { const d = site(x.email.split("@")[1]); jeDomain.set(d, (jeDomain.get(d) ?? new Set()).add(x.email)); }
  const ohneVorsatz = own.split(".")[0].replace(art.namensvorsatz, "");
  const token = ohneVorsatz.replace(/[^a-z0-9]/g, "");
  // A one-word district shares its name with its county town ("kitzingen.de",
  // "goslar.de" are the towns); only a compound name is the district's own.
  // For a municipality the one word IS its own name — so this guard only bites
  // where the office marker says otherwise.
  const einzelwort = !/-/.test(ohneVorsatz);
  const ohneTld = (h: string) => h.split(".").slice(0, -1).join(".").replace(/[^a-z0-9]/g, "");
  // An office site lists every member's mayor; a freemail mayor box counts only
  // when it is the only one on the pages (else it may be a neighbour's).
  const einzigerBgm = new Set(funde.filter(x => FREIMAIL.test(x.email.split("@")[1]) && /^(?:buergermeister|bgm)/.test(x.email)).map(x => x.email)).size === 1;
  const eigen = (email: string) => {
    const domain = email.split("@")[1], d = site(domain), label = d.split(".")[0].replace(/[^a-z0-9]/g, "");
    // A mailbox named after the place itself, also on the shared administration's
    // domain ("riesweiler@sim-rhb.de", "og.dill@kirchberg-hunsrueck.de") — the
    // usual form for a Rhineland-Palatinate Ortsgemeinde (hand check, 30.09.2026).
    const lokal = email.split("@")[0].replace(/[^a-z0-9]/g, "");
    if (FREIMAIL.test(domain)) return art === GEMEINDE && token.length >= 4 && (lokal === token || (/^(?:buergermeister|bgm)/.test(lokal) && einzigerBgm) || (/^(?:gemeinde|ortsgemeinde|og|stadt|markt|rathaus)/.test(lokal) && lokal.includes(token)));
    if (art === GEMEINDE && token.length >= 4 && (lokal === token || lokal === `og${token}` || lokal === `ortsgemeinde${token}`)) return true;
    // A municipality hosted under a state domain ("gemeinde-malente.landsh.de"):
    // the place name sits in the first label, not in the registrable domain.
    const erstes = domain.split(".")[0].replace(art.namensvorsatz, "").replace(/[^a-z0-9]/g, "");
    if (art === GEMEINDE && token.length >= 4 && domain.split(".").length >= 3 && erstes === token) return true;
    // "amtplau.de" for Plau am See: office marker plus the start of the place name.
    const rest = label.replace(art.amtsmarke, "");
    if (art === GEMEINDE && rest.length >= 4 && rest !== label && token.startsWith(rest)) return true;
    return d === own || flach(domain) === flach(own) || ohneTld(d) === ohneTld(own)
      || art.amtshost.test(domain)
      // The name inside a domain counts only with an office marker
      // ("landratsamt-ansbach.de") or as the whole compound name
      // ("limburg-weilburg.de"); "era-goslar.de" is a solar business.
      || (token.length >= 5 && label.includes(token) && (art.amtsmarke.test(label) || (label === token && (art === GEMEINDE || !einzelwort))))
      || (label.length >= 6 && token.startsWith(label))
      || (!/\.(?:bayern|thueringen)\.de$/.test(domain) && !(art === KREIS && einzelwort && label === token) && (jeDomain.get(d)?.size ?? 0) >= 3);
  };
  const gesehen = new Set<string>();
  return funde.filter(x => eigen(x.email) && !gesehen.has(x.email) && gesehen.add(x.email));
}

export function postfachNachName(quellen: string, website: string, art: Verwaltungsart, muster: RegExp): { email: string; url: string } | null {
  return eigenePostfaecher(quellen, website, art).find(x => muster.test(x.email)) ?? null;
}
