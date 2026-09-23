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
import { browserSchliessen, mitFrist, seiteGerendert } from "./kontakt-browser";

export type Pruefling = { schluessel: string; email: string; belegUrl: string | null; domain: string };
export type Freigabe = { schluessel: string; email: string; grund: string | null };

const mxCache = new Map<string, Promise<boolean>>();
function nimmtMails(domain: string): Promise<boolean> {
  if (!mxCache.has(domain)) mxCache.set(domain, resolveMx(domain).then(r => r.length > 0, () => false));
  return mxCache.get(domain)!;
}

/**
 * The addresses a page carries, read plainly and, if needed, in a browser.
 *
 * `gelesen` says whether we got the page AT ALL. Without it an unreachable page
 * is indistinguishable from one the address has left, and the contact is then
 * blocked with a reason that states something we never observed — the same
 * fault class as a check date nobody checked.
 */
async function adressenAuf(url: string, domain: string, gesucht: string[]): Promise<{ gefunden: Set<string>; gelesen: boolean }> {
  const gefunden = new Set<string>();
  let gelesen = false;
  const lesen = (html: string) => {
    gelesen = true;
    for (const c of contactCandidates(html, url, domain)) gefunden.add(c.email.toLowerCase());
  };
  const live = await fetchLive(url);
  if ("html" in live) lesen(live.html);
  if (gelesen && gesucht.every(m => gefunden.has(m))) return { gefunden, gelesen };
  const gerendert = await seiteGerendert(url);
  if (gerendert) lesen(gerendert);
  return { gefunden, gelesen };
}

/** No single proof page may hold the run; see mitFrist in kontakt-browser. */
const SEITE_MAX_MS = 120_000;

/**
 * `urteil` is called as soon as a contact is decided, so a run that dies late
 * keeps what it already learned — collecting everything and writing at the end
 * threw away 45 minutes of reads when one page hung (23.09.2026).
 */
export async function freigeben(
  liste: Pruefling[],
  opts: { parallel?: number; fortschritt?: (n: number) => void; urteil?: (u: Freigabe) => Promise<void> | void } = {},
): Promise<Freigabe[]> {
  const ergebnis: Freigabe[] = [];
  const offen: Pruefling[] = [];
  for (const p of liste) {
    const email = p.email.trim().toLowerCase();
    const t = postfachTauglich(email);
    if (!t.ok) { const u = { schluessel: p.schluessel, email, grund: t.grund }; ergebnis.push(u); await opts.urteil?.(u); continue; }
    if (!(await nimmtMails(email.split("@")[1]))) { const u = { schluessel: p.schluessel, email, grund: "Domain nimmt keine Mails an" }; ergebnis.push(u); await opts.urteil?.(u); continue; }
    if (!p.belegUrl) { const u = { schluessel: p.schluessel, email, grund: "keine Fundstelle" }; ergebnis.push(u); await opts.urteil?.(u); continue; }
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
        const da = await mitFrist(
          adressenAuf(url, pruef[0].domain, pruef.map(p => p.email)),
          SEITE_MAX_MS,
          { gefunden: new Set<string>(), gelesen: false },
        );
        for (const p of pruef) {
          const grund = da.gelesen
            ? (da.gefunden.has(p.email) ? null : "Adresse steht nicht mehr auf der Fundstelle")
            : "Fundstelle war nicht lesbar";
          const u = { schluessel: p.schluessel, email: p.email, grund };
          ergebnis.push(u);
          await opts.urteil?.(u);
        }
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
