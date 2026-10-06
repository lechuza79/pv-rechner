/**
 * Who really links to us — sorting every known link by provenance.
 *
 * The outreach report counted a link only when the linking domain was the
 * website of a municipality we had written to. Measured on 01.10.2026 that
 * reported 2 links while 29 domains linked and 7 were earned: the regional
 * press (wetterau.news, gude.news, herzogtum-direkt.de, nachrichten-kl.de,
 * suedhessen.app) carries the story more often than the municipalities
 * themselves. A report that undercounts its own result argues against the
 * channel that works.
 *
 * TWO SOURCES, BECAUSE NEITHER IS COMPLETE. The backlink database only knows
 * what its own crawler has found, and it lags: on the same day trier.de (13
 * visitors), ln-online.de (9), riedstadt.de and lokalo.de were sending us
 * real people while the backlink check knew none of them. A visitor arriving
 * from a page is the stronger proof that a link exists — somebody used it.
 *
 * We do not classify spam. Deciding what is junk needs a list, and a list is
 * the same losing race as the CMS path guesses in the funding crawl. Every
 * domain is matched against what we can PROVE: the municipalities we wrote
 * to, the articles we have on file, and the referrers that brought visitors.
 * What matches is earned, the rest is printed for a human, never counted.
 */

export type VerweisQuelle = "verlinkung" | "besucher" | "beides";

export type Verweis = { domain: string; url: string; quelle: VerweisQuelle; besucher?: number };

export type VerweisHerkunft = {
  /** Domain of a municipality we wrote to. */
  gemeinden: (Verweis & { gemeinde: string })[];
  /** Domain of an article we have on file (press, apps, anything else). */
  beitraege: Verweis[];
  /** Neither, but it sent us real visitors — proof enough. */
  besucher: Verweis[];
  /** Only in the backlink database, nothing of ours matches. Shown, never counted. */
  unzugeordnet: Verweis[];
};

/** Beleg-Zahl: nur was wir einer eigenen Quelle zuordnen können. */
export const belegteVerweise = (h: VerweisHerkunft): number =>
  h.gemeinden.length + h.beitraege.length + h.besucher.length;

export type VerweisEingabe = {
  /** linking domain -> first linking page, from the backlink check */
  verlinkend: Map<string, string>;
  /** referring domain -> visitors, already filtered to real pages */
  besucherJeDomain: Map<string, number>;
  /** domain -> municipality name, for the places we wrote to */
  gemeinden: Map<string, string>;
  /** domains of the articles we recorded ourselves */
  beitragsDomains: Set<string>;
};

export function ordneVerweise({ verlinkend, besucherJeDomain, gemeinden, beitragsDomains }: VerweisEingabe): VerweisHerkunft {
  const h: VerweisHerkunft = { gemeinden: [], beitraege: [], besucher: [], unzugeordnet: [] };
  const alle = new Set([...verlinkend.keys(), ...besucherJeDomain.keys()]);
  for (const domain of [...alle].sort((a, b) => a.localeCompare(b))) {
    const imIndex = verlinkend.has(domain);
    const besucher = besucherJeDomain.get(domain) ?? 0;
    const quelle: VerweisQuelle = imIndex && besucher ? "beides" : imIndex ? "verlinkung" : "besucher";
    const v: Verweis = { domain, url: verlinkend.get(domain) ?? "", quelle, ...(besucher ? { besucher } : {}) };
    const gemeinde = gemeinden.get(domain);
    // A municipality that also published elsewhere stays in the first group:
    // its own website is the stronger signal, and counting one domain twice
    // would inflate the total.
    if (gemeinde) h.gemeinden.push({ ...v, gemeinde });
    else if (beitragsDomains.has(domain)) h.beitraege.push(v);
    else if (besucher > 0) h.besucher.push(v);
    else h.unzugeordnet.push(v);
  }
  return h;
}
