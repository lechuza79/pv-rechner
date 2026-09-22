/**
 * Release a contact for a letter — one check for every population.
 *
 * Three questions, in this order, and a contact passes only all three:
 *   1. Is it a mailbox that takes a letter at all? (lib/kontakt-tauglichkeit)
 *   2. Does its domain accept mail?
 *   3. Does it still stand on the page that proved it — read now, and read in a
 *      real browser where the page is built by scripts?
 *
 * Built once after the craft businesses had their own copy (22.09.2026); press
 * and utilities need exactly the same check, and a second copy would drift.
 * Pages are fetched once per proof page, not once per address: a newspaper
 * imprint carries a dozen addresses.
 */
import { resolveMx } from "node:dns/promises";
import { postfachTauglich } from "../../lib/kontakt-tauglichkeit";
import { contactCandidates } from "../../lib/contact-evidence";
import { host } from "../../lib/kontakt-suche";
import { fetchLive } from "./kontakt-lauf";
import { browserSchliessen, seiteGerendert } from "./kontakt-browser";

export type Pruefling = { schluessel: string; email: string; belegUrl: string | null; domain: string };
export type Freigabe = { schluessel: string; email: string; grund: string | null };

const mxCache = new Map<string, Promise<boolean>>();
function nimmtMails(domain: string): Promise<boolean> {
  if (!mxCache.has(domain)) mxCache.set(domain, resolveMx(domain).then(r => r.length > 0, () => false));
  return mxCache.get(domain)!;
}

/** The addresses a page carries, read plainly and, if needed, in a browser. */
async function adressenAuf(url: string, domain: string, gesucht: string[]): Promise<Set<string>> {
  const gefunden = new Set<string>();
  const lesen = (html: string) => { for (const c of contactCandidates(html, url, domain)) gefunden.add(c.email.toLowerCase()); };
  const live = await fetchLive(url);
  if ("html" in live) lesen(live.html);
  if (gesucht.every(m => gefunden.has(m))) return gefunden;
  const gerendert = await seiteGerendert(url);
  if (gerendert) lesen(gerendert);
  return gefunden;
}

export async function freigeben(liste: Pruefling[], opts: { parallel?: number; fortschritt?: (n: number) => void } = {}): Promise<Freigabe[]> {
  const ergebnis: Freigabe[] = [];
  const offen: Pruefling[] = [];
  for (const p of liste) {
    const email = p.email.trim().toLowerCase();
    const t = postfachTauglich(email);
    if (!t.ok) { ergebnis.push({ schluessel: p.schluessel, email, grund: t.grund }); continue; }
    if (!(await nimmtMails(email.split("@")[1]))) { ergebnis.push({ schluessel: p.schluessel, email, grund: "Domain nimmt keine Mails an" }); continue; }
    if (!p.belegUrl) { ergebnis.push({ schluessel: p.schluessel, email, grund: "keine Fundstelle" }); continue; }
    offen.push({ ...p, email });
  }
  // One read per proof page; pages of one host one after another, hosts in parallel.
  const jeSeite = new Map<string, Pruefling[]>();
  for (const p of offen) jeSeite.set(p.belegUrl!, [...(jeSeite.get(p.belegUrl!) ?? []), p]);
  const jeHost = new Map<string, string[]>();
  for (const url of jeSeite.keys()) jeHost.set(host(url), [...(jeHost.get(host(url)) ?? []), url]);
  const hosts = [...jeHost.values()];
  let fertig = 0;
  const arbeiter = async () => {
    for (let urls = hosts.shift(); urls; urls = hosts.shift()) {
      for (const url of urls) {
        const pruef = jeSeite.get(url)!;
        const da = await adressenAuf(url, pruef[0].domain, pruef.map(p => p.email));
        for (const p of pruef) ergebnis.push({ schluessel: p.schluessel, email: p.email, grund: da.has(p.email) ? null : "Adresse steht nicht mehr auf der Fundstelle" });
        opts.fortschritt?.(++fertig);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: opts.parallel ?? 6 }, arbeiter));
  } finally {
    await browserSchliessen();
  }
  return ergebnis;
}
