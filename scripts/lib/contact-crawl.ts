import { abortableContactRead } from "./contact-deadline";
import { load } from "cheerio";
import { contactBranch, contactLinks, externalContactLinks, contactLinkPriority, contactUrl, nextContactUrl, type ContactDataset } from "../../lib/contact-discovery";
import { contactQuality } from "../../lib/contact-quality";
import { sameDomain } from "../../lib/contact-evidence";
import { fetchContactPage, type PageObservation } from "./contact-fetch";

export type DiscoveryObservation = { url: string; status: "read" | "failed"; error: string | null };
export type CrawlOptions = {
  website: string | null; dataset: ContactDataset; pageBudget?: number;
  fetcher?: typeof fetch; render?: (url: string) => Promise<string>;
  record?: (page: PageObservation) => void;
};

/** A single bounded crawl used by live research and replay evaluation. */
export async function crawlContacts(options: CrawlOptions) {
  const pages: PageObservation[] = [];
  const discovery: DiscoveryObservation[] = [];
  const pending = new Map<string, number>();
  const visited = new Set<string>();
  const branches = new Map<string, number>();
  const external = new Map<string, number>();
  let externalReads = 0;
  const budget = options.pageBudget ?? 12;
  if (!Number.isInteger(budget) || budget < 1 || budget > 30) throw Error("pageBudget must be 1..30");
  const finish = (status: string) => ({ status, pages, discovery, candidates: pages.flatMap(p => p.candidates),
    pending_urls: [...pending.keys()], external_sources: [...external.keys()], requests: pages.length + discovery.length,
    quality: contactQuality(pages.flatMap(p => p.candidates), options.dataset,
      [...(status !== "found" ? [status] : []), ...(pending.size ? ["unread-linked-pages"] : []),
        ...(external.size ? ["external-sources-unread"] : []), ...(discovery.some(d => d.status === "failed") ? ["discovery-failed"] : [])]) });
  if (!options.website) return finish("missing-website");
  const start = contactUrl(/^[a-z][a-z0-9+.-]*:/i.test(options.website) ? options.website : `https://${options.website}`);
  if (!start) return finish("invalid-website");
  const domain = new URL(start).hostname.replace(/^www\./, "");
  let scope = domain;
  let root = new URL("/", start).href;
  let renderBudget = 2;
  const rendered = new Map<string, string>();
  let sitemapTried = false;
  const queue = (url: string, priority: number) => {
    const normalized = contactUrl(url);
    if (normalized && !visited.has(normalized)) pending.set(normalized, Math.max(priority, pending.get(normalized) ?? 0));
  };
  pending.set(start, 200);
  const requests = () => pages.length + discovery.length;
  // Discovery requests share the HTML request budget. Their failures remain
  // visible but a missing optional sitemap is not a failed contact-page read.
  const raw = async (url: string): Promise<string | null> => {
    if (requests() >= budget) return null;
    const observation: DiscoveryObservation = { url, status: "failed", error: null };
    discovery.push(observation);
    try {
      const signal = AbortSignal.timeout(12000);
      const response = await abortableContactRead((options.fetcher ?? fetch)(url, { signal,
        headers: { "User-Agent": "solar-check.io contact-research/1.0 (+https://solar-check.io)" } }), signal);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      if (!sameDomain(new URL(response.url || url).hostname.replace(/^www\./, ""), scope)) throw Error("External discovery redirect requires review");
      const text = await abortableContactRead(response.text(), signal);
      if (text.length > 4_000_000) throw Error("Discovery document too large");
      observation.status = "read";
      return text;
    } catch (error) { observation.error = String(error).slice(0, 200); return null; }
  };
  const discoverSitemap = async () => {
    sitemapTried = true;
    const robots = await raw(new URL("robots.txt", root).href);
    const maps = [...(robots ?? "").matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(m => m[1]);
    maps.push(new URL("sitemap.xml", root).href);
    const seen = new Set<string>();
    while (maps.length && discovery.length < 4 && requests() < budget - 1) {
      const url = maps.shift()!;
      let host: string;
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
      if (seen.has(url) || !sameDomain(host, scope)) continue;
      seen.add(url);
      const xml = await raw(url);
      if (!xml) continue;
      const $ = load(xml, { xmlMode: true });
      const index = $("sitemapindex").length > 0;
      $(index ? "sitemap > loc" : "url > loc").each((_, el) => {
        const value = $(el).text().trim();
        const normalized = contactUrl(value);
        if (!normalized || !sameDomain(new URL(normalized).hostname.replace(/^www\./, ""), scope)) return;
        if (index) maps.push(normalized);
        else {
          const priority = contactLinkPriority(normalized, "", options.dataset);
          if (priority) queue(normalized, priority);
        }
      });
    }
  };
  while (requests() < budget) {
    // Reserve the last two reads for explicitly linked external contact leads;
    // a long internal news queue must not hide the publisher indefinitely.
    if (external.size && externalReads < 2 && requests() >= budget - 2) {
      const entry = [...external].filter(([url]) => !visited.has(url)).sort((a,b) => b[1] - a[1])[0];
      if (entry) { external.delete(entry[0]); queue(entry[0], 10000); externalReads++; }
    }
    if (!sitemapTried && pages.length >= Math.floor(budget / 2) && requests() < budget - 2) {
      await discoverSitemap();
    }
    if (!pending.size) {
      if (!visited.has(root)) { queue(root, 100); continue; }
      if (!sitemapTried && requests() < budget - 2) { await discoverSitemap(); if (pending.size) continue; }
      if (external.size && externalReads < 2) {
        const entry = [...external].sort((a,b) => b[1] - a[1])[0];
        external.delete(entry[0]); queue(entry[0], entry[1]); externalReads++;
        continue;
      }
      break;
    }
    const url = nextContactUrl(pending, branches);
    pending.delete(url); visited.add(url);
    const branch = contactBranch(url);
    branches.set(branch, (branches.get(branch) ?? 0) + 1);
    const result = await fetchContactPage(url, { fetcher: options.fetcher, organizationDomain: domain,
      record: options.record, render: options.render ? async target => {
        if (rendered.has(target)) return rendered.get(target)!;
        if (renderBudget-- <= 0) throw Error("Browser budget exhausted");
        const html = await options.render!(target); rendered.set(target, html); return html;
      } : undefined });
    pages.push(result.observation);
    const final = result.observation.finalUrl ? contactUrl(result.observation.finalUrl) : null;
    if (final) {
      visited.add(final); pending.delete(final);
      // Follow an observed site relocation for discovery only. Attribution still
      // uses the original domain, so a redirect cannot verify the new owner.
      if (pages.length === 1) { scope = new URL(final).hostname.replace(/^www\./, ""); root = new URL("/", final).href; }
    }
    if (!result.html || !final) continue;
    const withinScope = sameDomain(new URL(final).hostname.replace(/^www\./, ""), scope);
    if (withinScope) {
      for (const link of contactLinks(result.html, final, scope, options.dataset)) queue(link.url, link.priority);
      for (const link of externalContactLinks(result.html, final, scope, options.dataset)) {
        if (!visited.has(link.url)) external.set(link.url, link.priority);
      }
    }
  }
  return finish(pages.some(p => p.status !== "read") ? "partial" : pending.size ? "budget-exhausted" :
    pages.some(p => p.candidates.length) ? "found" : "no-find-in-read-pages");
}
