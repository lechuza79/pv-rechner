import { load } from "cheerio";
import { sameDomain } from "./contact-evidence";
import { entschluesseltOderRoh } from "./uri-sicher";

export type ContactDataset = "kommunen" | "fachbetriebe" | "presse" | "versorger";

/** Remove presentation/tracking variants, preserving identifiers and filters. */
export function contactUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/\.(?:jpe?g|png|gif|svg|webp|ico|mp4|mp3|zip|css|js|woff2?|ttf)$/i.test(url.pathname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key) ||
          (key === "modus" && url.searchParams.get(key) === "drucken")) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

/** Score the destination label and leaf, never an inherited folder name such as /team/news/. */
export function contactLinkPriority(url: string, label: string, dataset: ContactDataset): number {
  const parsed = new URL(url);
  const leaf = entschluesseltOderRoh(parsed.pathname.split("/").filter(Boolean).at(-1) ?? "");
  const text = `${label} ${leaf}`.replace(/[-_]/g, " ");
  const directory = /\b(kontakt\w*|contact\w*|ansprechpartner\w*|mitarbeiter\w*|team|redaktion\w*|organigramm|dienststellen|abteilungen)\b|ämter|aemter/iu;
  const climate = /\b(klimaschutz\w*|umweltschutz\w*|klima|umwelt|energiemanagement|energieberatung|nachhaltigkeit|erneuerbare)\b/iu;
  const communications = /\b(presse\w*|kommunikation|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|webredaktion)\b/iu;
  let score = directory.test(text) ? 80 : 0;
  if (/\b(kontakt\w*|contact\w*|ansprechpartner\w*)\b/iu.test(text)) score = 110;
  if (communications.test(text)) score = Math.max(score, 120);
  if (/\b(impressum|imprint)\b/i.test(text)) score = Math.max(score, 70);
  if ((dataset === "kommunen" || dataset === "versorger") && climate.test(text)) score = Math.max(score, 125);
  if (dataset === "fachbetriebe" && /\b(über uns|ueber uns|unternehmen|geschäftsführung|geschaeftsfuehrung|photovoltaik|solar)\b/iu.test(text)) score = Math.max(score, 85);
  // News can contain contacts, but must not consume the budget ahead of directories.
  if (/\/(nachrichten|news|aktuelles|pressemitteilungen)\/.+/i.test(parsed.pathname)) score = Math.min(score, 25);
  return score;
}

export function contactLinks(html: string, base: string, domain: string, dataset: ContactDataset): {url:string; priority:number}[] {
  const $ = load(html);
  const result = new Map<string, number>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
    let target: URL;
    try { target = new URL(href, base); } catch { return; }
    const normalized = contactUrl(target.href);
    if (!normalized) return;
    target = new URL(normalized);
    if (!/^https?:$/.test(target.protocol) || !sameDomain(target.hostname.replace(/^www\./,""),domain)) return;
    const priority = contactLinkPriority(target.href, $(el).text().replace(/\s+/g," ").trim(),dataset);
    if (priority) result.set(target.href,Math.max(priority,result.get(target.href)??0));
  });
  return [...result].map(([url,priority])=>({url,priority}));
}

/** Spread a bounded crawl across sections instead of exhausting one promising branch. */
export function contactBranch(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  if (/^(?:\d+|.*\.(?:html?|php|aspx))$/i.test(parts.at(-1) ?? '')) parts.pop();
  return parts.slice(0,2).join('/');
}

export function nextContactUrl(pending: Map<string,number>, branchVisits: Map<string,number>): string {
  const score = ([url,priority]:[string,number]) => priority - 15 * (branchVisits.get(contactBranch(url)) ?? 0);
  return [...pending].sort((a,b)=>score(b)-score(a) || a[0].localeCompare(b[0]))[0][0];
}
