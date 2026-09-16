import { fundingNavigationSignature, repeatedFundingPath } from "./funding-source-loop";
import { entschluesseltOderRoh } from "./uri-sicher";
import { seitenSchluessel } from "./funding-seiten";
import { load } from "cheerio";
import { contactUrl, contactBranch, nextContactUrl, contactContentGap } from "./contact-discovery";
import { bewerteLink, type LinkKandidat } from "./funding-url-suche";
import { einordnen, sichtbarerText } from "./funding-screen-erkennung";

export type FundingLead = LinkKandidat & {
  referrer: string; relation: "same-site" | "published-external";
  kind: "page" | "document" | "embedded"; depth: number;
  observed?: boolean; attempted?: boolean; substantiveSignal?: boolean; via?: "published-link" | "sitemap"; duplicateOf?: string;
};
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const navigation = /klima|energie|umwelt|bauen|wohnen|rathaus|bürgerservice|buergerservice|verwaltung|verbandsgemeinde|amtsverwaltung/i;
const continuation = /^(?:zur aufgerufenen seite|weiter(?: zur| zum)? (?:startseite|homepage|internetauftritt)|continue to (?:the )?(?:website|site))\s*[»›→.!]*$/iu;

/** Published links only. An outbound link proves provenance, not eligibility. */
export function fundingLinks(html: string, base: string, root: string, depth = 1): FundingLead[] {
  const $ = load(html), result = new Map<string, FundingLead>();
  const documentBase = contactUrl($("base[href]").first().attr("href") ?? base, base) ?? base;
  $("a[href],frameset frame[src],iframe[src],embed[src],object[data],integration-bim[result-url]").each((_, el) => {
    const node = $(el), tag = el.tagName.toLowerCase();
    let raw = node.attr("href") ?? node.attr("src") ?? node.attr("data") ?? node.attr("result-url") ?? "";
    // Resolve only the document explicitly named by a published PDF viewer.
    try { const viewer = new URL(raw, documentBase); if (/\/viewer\.(?:html?|php)$/i.test(viewer.pathname) && viewer.searchParams.get("file")) raw = new URL(viewer.searchParams.get("file")!, viewer).href; } catch { return; }
    const url = contactUrl(raw, documentBase);
    if (!url || /\{\{|\}\}|\$\{|%7b%7b|%7d%7d/i.test(entschluesseltOderRoh(url))) return;
    let label = node.text().replace(/\s+/g, " ").trim() || node.attr("title") || "";
    if (/^(?:hier|download|hier herunterladen)[.!]?$/i.test(label)) {
      const parent = node.parent(), context = parent.text().replace(/\s+/g, " ").trim();
      if (parent.is("p,li") && parent.find("a").length === 1 && context.length < 300) label = context;
    }
    const document = /\.pdf(?:$|\?)|[?&](?:ext|format)=pdf/i.test(url) || tag === "object" || tag === "embed";
    const embedded = tag !== "a";
    // Score a document using its label and leaf rather than rejecting its format.
    const scoringUrl = document ? url.replace(/\.pdf(?=$|\?)/i, ".html") : url;
    const value = bewerteLink(scoringUrl, label);
    const local = host(url) === host(base);
    const section = navigation.test(label + " " + new URL(url).pathname.split("/").at(-1));
    const forward = continuation.test(label);
    if (!local && !(value.thema > 0 || (value.foerder > 0 && !value.fremdesRessort) || /verwaltungsgemeinschaft|verbandsgemeinde|amtsverwaltung/i.test(label))) return;
    if (value.punkte < 5 && !section && !forward && !embedded) return;
    const lead: FundingLead = { ...value, url, text: label, punkte: Math.max(value.punkte + (document ? 8 : 0), embedded || forward ? 14 : section ? 5 : 0),
      referrer: base, via: "published-link", relation: host(url) === host(root) ? "same-site" : "published-external", kind: document ? "document" : embedded ? "embedded" : "page", depth };
    if (!result.has(url) || result.get(url)!.punkte < lead.punkte) result.set(url, lead);
  });
  return [...result.values()];
}

/** Collapse only equivalences declared by the publisher, never guessed locale paths. */
export function publishedLanguageAliases(html: string, base: string): Map<string, string> {
  const $ = load(html), links = $("link[rel='alternate'][hreflang][href]").toArray();
  const documentBase = contactUrl($("base[href]").first().attr("href") ?? base, base) ?? base;
  const preferred = links.find(el => /^de(?:-|$)/i.test($(el).attr("hreflang") ?? "")) ?? links.find(el => $(el).attr("hreflang") === "x-default");
  const target = preferred && contactUrl($(preferred).attr("href")!, documentBase);
  const result = new Map<string, string>();
  if (!target || host(target) !== host(base)) return result;
  for (const el of links) {
    const url = contactUrl($(el).attr("href")!, documentBase);
    if (url && host(url) === host(base) && seitenSchluessel(url) !== seitenSchluessel(target)) result.set(seitenSchluessel(url), target);
  }
  return result;
}

/** Fair, bounded traversal: sibling sections survive a stronger first branch. */
export async function walkFundingSources(options: {
  html: string; root: string; seeds?: LinkKandidat[]; priorLeads?: FundingLead[]; budget: number;
  read: (url: string) => Promise<{ html: string; url: string } | null>;
}) {
  const pending = new Map<string, number>(), leads = new Map<string, FundingLead>();
  const aliases = publishedLanguageAliases(options.html, options.root);
  const seen = new Set([options.root]), branches = new Map<string, number>();
  const add = (lead: FundingLead) => {
    if (/\{\{|%7b%7b|%7d%7d/i.test(entschluesseltOderRoh(lead.url))) return;
    const alias = aliases.get(seitenSchluessel(lead.url));
    if (alias) { leads.set(lead.url, { ...lead, duplicateOf: alias }); return; }
    if (seen.has(lead.url)) return;
    if (!leads.has(lead.url) || lead.punkte > leads.get(lead.url)!.punkte) leads.set(lead.url, lead);
    pending.set(lead.url, lead.punkte);
  };
  for (const lead of options.priorLeads ?? []) add(lead);
  const previous = new Set((options.priorLeads ?? []).map(l => l.url));
  for (const lead of fundingLinks(options.html, options.root, options.root)) add(lead);
  for (const seed of options.seeds ?? []) add({ ...seed, referrer: new URL("/sitemap.xml", options.root).href, via: "sitemap", relation: "same-site", kind: "page", depth: 1 });
  const signatures = new Map<string, string[]>([[fundingNavigationSignature(options.html), [options.root]]]);
  let requests = 0;
  const unreadable: string[] = [];
  while (pending.size && requests < options.budget) {
    const carried = new Map([...pending].filter(([url]) => previous.has(url)));
    const url = nextContactUrl(carried.size ? carried : pending, branches), lead = leads.get(url)!;
    pending.delete(url); seen.add(url);
    branches.set(contactBranch(url), (branches.get(contactBranch(url)) ?? 0) + 1);
    requests++; lead.attempted = true;
    const page = await options.read(url);
    if (!page) { unreadable.push(url); continue; }
    seen.add(page.url);
    const signature = fundingNavigationSignature(page.html);
    const previousSources = signatures.get(signature) ?? [];
    const loopOrigin = previousSources.find(previous => repeatedFundingPath(previous, page.url));
    if (loopOrigin) { lead.duplicateOf = loopOrigin; lead.observed = true; continue; }
    signatures.set(signature, [...previousSources, page.url]);
    for (const [key, canonical] of publishedLanguageAliases(page.html, page.url)) aliases.set(key, canonical);
    for (const existing of leads.values()) {
      const canonical = aliases.get(seitenSchluessel(existing.url));
      if (canonical) {
        existing.duplicateOf = canonical; pending.delete(existing.url);
        if (!seen.has(canonical)) add({ ...existing, url: canonical, referrer: page.url, duplicateOf: undefined });
      }
    }
    const gap = contactContentGap(page.html);
    lead.observed = !gap;
    lead.substantiveSignal = !gap && einordnen(sichtbarerText(page.html)).techniken.length > 0;
    // Keep the observed destination, without erasing the original link path.
    if (page.url !== url) {
      lead.duplicateOf = page.url;
      leads.set(page.url, { ...lead, url: page.url, referrer: url, duplicateOf: aliases.get(seitenSchluessel(page.url)), relation: host(page.url) === host(options.root) ? "same-site" : "published-external" });
    }
    if (gap) unreadable.push(url);
    if (lead.depth < 5) for (const next of fundingLinks(page.html, page.url, options.root, lead.depth + 1)) {
      // Do not spread from one foreign portal into a web-wide crawl.
      if (lead.relation === "published-external" && host(next.url) !== host(page.url)) continue;
      add(next);
    }
  }
  const candidates = qualifiedFundingSources([...leads.values()]);
  return { candidates, leads: [...leads.values()], requests, unreadable, remaining: pending.size, aliases };
}

/** URL wording alone is discovery work, not a source ready for semantic review. */
export function qualifiedFundingSources(leads: FundingLead[]): FundingLead[] {
  return leads.filter(l => !l.duplicateOf && l.relation === "same-site" && l.observed === true && l.substantiveSignal === true);
}
