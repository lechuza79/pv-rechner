/**
 * Who really links to us — sorting the backlink measurement by provenance.
 *
 * The outreach report counted a link only when the linking domain was the
 * website of a municipality we had written to. Measured on 01.10.2026 that
 * reported 2 links while 29 domains linked, 8 of them earned: the regional
 * press (wetterau.news, gude.news, herzogtum-direkt.de, nachrichten-kl.de,
 * suedhessen.app) and a village app carried the story, and none of them is a
 * municipal domain. A report that undercounts its own result by a factor of
 * four is worse than none — it argues against the channel that works.
 *
 * We do not classify spam. Deciding what is junk needs a list, and a list is
 * the same losing race as the CMS path guesses in the funding crawl. Instead
 * every domain is matched against what we can PROVE: the municipalities we
 * wrote to, and the articles we have on file. What matches is earned, the
 * rest is printed for a human to look at, never counted.
 */

export type VerweisHerkunft = {
  /** Domain of a municipality we wrote to. */
  gemeinden: { domain: string; gemeinde: string; url: string }[];
  /** Domain of an article we have on file (press, apps, anything else). */
  beitraege: { domain: string; url: string }[];
  /** Everything else — shown, never counted. */
  unzugeordnet: { domain: string; url: string }[];
};

/** Beleg-Zahl: nur was wir einer eigenen Quelle zuordnen können. */
export const belegteVerweise = (h: VerweisHerkunft): number => h.gemeinden.length + h.beitraege.length;

/**
 * @param domains linking domain -> first linking page (from the backlink check)
 * @param gemeinden domain -> municipality name, for the places we wrote to
 * @param beitragsDomains domains of the articles we recorded ourselves
 */
export function ordneVerweise(
  domains: Map<string, string>,
  gemeinden: Map<string, string>,
  beitragsDomains: Set<string>,
): VerweisHerkunft {
  const h: VerweisHerkunft = { gemeinden: [], beitraege: [], unzugeordnet: [] };
  for (const [domain, url] of [...domains].sort(([a], [b]) => a.localeCompare(b))) {
    const gemeinde = gemeinden.get(domain);
    // A municipality that also published elsewhere stays in the first group:
    // its own website is the stronger signal, and double counting one domain
    // would inflate the total.
    if (gemeinde) h.gemeinden.push({ domain, gemeinde, url });
    else if (beitragsDomains.has(domain)) h.beitraege.push({ domain, url });
    else h.unzugeordnet.push({ domain, url });
  }
  return h;
}
