import { load } from "cheerio";
import { sameDomain } from "./contact-evidence";
import { entschluesseltOderRoh } from "./uri-sicher";

const continuationLabel = /^(?:zur aufgerufenen seite|weiter (?:zur|zum) (?:startseite|homepage|internetauftritt)|continue to (?:the )?(?:website|site))\s*[»›→.!]*$/iu;
function employeeDirectorySource(raw: string): boolean {
  try {
    const url = new URL(raw, "https://relative-source.invalid/");
    return /^https?:$/.test(url.protocol) && /\/employee-list\.html$/i.test(url.pathname);
  } catch { return false; }
}

/** Recognizable navigation/loading wrappers are not substantive negative evidence. */
export function contactContentGap(html: string): "frameset" | "loading-shell" | "continuation-page" | "dynamic-directory" | null {
  const $ = load(html);
  if ($("frameset frame[src]").length) return "frameset";
  // A populated article can still contain an unloaded staff directory. Its
  // empty-state template is not an observed absence of employees.
  if ($("integration-bim[result-url]").toArray().some(el => {
    if (!employeeDirectorySource($(el).attr("result-url") ?? "")) return false;
    const id = $(el).attr("id");
    const result = $(el).siblings("[id]").filter((_, sibling) => $(sibling).attr("id") === `${id}-result`);
    const loading = $(el).siblings("[id]").filter((_, sibling) => $(sibling).attr("id") === `${id}-loading`);
    return !id || !result.text().trim() || loading.hasClass("is-active");
  })) return "dynamic-directory";
  $("script,style,nav,header,footer").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  if (text.length < 1200 && /(?:beitragsliste|inhalte?|content)\s+(?:wird|werden)\s+geladen|loading\s+(?:content|contacts)/iu.test(text)) return "loading-shell";
  if (text.length < 1200 && $("a[href]").toArray().some(el => continuationLabel.test($(el).text().trim()))) return "continuation-page";
  return null;
}

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
  const directory = /\b(kontakt\w*|contact\w*|ansprechpartner\w*|ansprechperson\w*|mitarbeiter\w*|team|redaktion\w*|organigramm|dienststellen|abteilungen|rathaus|bürgerservice|buergerservice|verwaltung|mediadaten|verlag)\b|ämter|aemter/iu;
  const climate = /\b(klimaschutz\w*|umweltschutz\w*|klima|umwelt|energiemanagement|energieberatung|nachhaltigkeit|erneuerbare)\b/iu;
  const communications = /\b(presse\w*|kommunikation|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|webredaktion)\b/iu;
  let score = directory.test(text) ? 80 : 0;
  if (/\b(gemeindevertretung|gemeinderat|b[üu]rgermeister\w*|buergermeister\w*|telefonliste|telefonverzeichnis)\b/iu.test(text)) score = 100;
  if (continuationLabel.test(label.trim())) score = 160;
  if (/\b(kontakt\w*|contact\w*|ansprechpartner\w*|ansprechperson\w*)\b/iu.test(text)) score = 110;
  if (/\bansprechperson\w*\b|\bansprechpartner\w*\b/iu.test(text)) score = 140;
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
    let label = $(el).text().replace(/\s+/g," ").trim();
    // A literal "here" document link needs its own short sentence, not the
    // complete surrounding directory or unrelated navigation labels.
    if (/^(?:hier|hier herunterladen|download|here)[.!]?$/iu.test(label)) {
      const parent = $(el).parent();
      const context = parent.text().replace(/\s+/g, " ").trim();
      if (parent.is("p,li") && parent.find("a[href]").length === 1 && context.length <= 240) label = context;
    }
    const priority = contactLinkPriority(target.href, label,dataset);
    if (priority) result.set(target.href,Math.max(priority,result.get(target.href)??0));
  });
  // Follow only published frame destinations. Embedded third-party content
  // does not establish municipal ownership and is not queued here.
  $("frameset frame[src]").each((_, el) => {
    const url = contactUrl($(el).attr("src") ?? "", base);
    if (url && sameDomain(new URL(url).hostname.replace(/^www\./, ""), domain)) result.set(url, 150);
  });
  $("integration-bim[result-url]").each((_, el) => {
    const published = $(el).attr("result-url") ?? "";
    if (!employeeDirectorySource(published)) return;
    const url = contactUrl(published, base);
    if (url && sameDomain(new URL(url).hostname.replace(/^www\./, ""), domain)) result.set(url, 150);
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

/** Explicit outbound contact/publisher links are research leads, not ownership. */
export function externalContactLinks(html: string, base: string, domain: string, dataset: ContactDataset) {
  const $ = load(html);
  const links = new Map<string, number>();
  $("a[href]").each((_, el) => {
    const url = contactUrl($(el).attr("href") ?? "", base);
    if (!url || sameDomain(new URL(url).hostname.replace(/^www\./, ""), domain)) return;
    const label = $(el).text().replace(/\s+/g, " ").trim();
    if (!/kontakt|ansprechpartner|ansprechperson|redaktion|mediadaten|verlag|verwaltungsgemeinschaft|verbandsgemeinde/iu.test(label)) return;
    if (/facebook\.com|instagram\.com|linkedin\.com|youtube\.com/.test(new URL(url).hostname)) return;
    links.set(url, contactLinkPriority(url, label, dataset));
  });
  return [...links].map(([url, priority]) => ({url, priority}));
}
