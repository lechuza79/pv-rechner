/**
 * Heading context for addresses: the nearest preceding content heading when no
 * other address intervenes, plus the page heading when the main content
 * publishes exactly one address. Part of page extraction, cached per page.
 */
import { load } from "cheerio";
import { entwirreAdressen } from "./personen-fund";
import { entschluesseltOderRoh } from "./uri-sicher";

const MAIL = /[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g;

export function headingContext(html: string): { headings: Map<string, string[]>; title: string } {
  const $ = load(html, { scriptingEnabled: false });
  $("script,style").remove();
  const out = new Map<string, string[]>();
  const main = new Set<string>();
  let heading = "";
  let since = new Set<string>();
  const push = (raw: string, chrome: boolean) => {
    const addr = raw.toLowerCase().replace(/\.$/, "");
    if (chrome) return;
    main.add(addr);
    if (heading && [...since].every(a => a === addr)) out.set(addr, [...(out.get(addr) ?? []), heading]);
    since.add(addr);
  };
  const walk = (node: any, chrome: boolean) => {
    for (const child of node.children ?? []) {
      if (child.type === "text") { for (const m of entwirreAdressen(child.data ?? "").matchAll(MAIL)) push(m[0], chrome); continue; }
      if (child.type !== "tag") continue;
      const tag: string = child.name;
      const inChrome = chrome || ["nav", "header", "footer", "aside"].includes(tag)
        || /(?:^|\s)(?:footer|header|nav|navigation|breadcrumb|menu)(?:\s|$|-)/i.test(child.attribs?.class ?? "");
      if (/^h[1-4]$/.test(tag) && !inChrome) { heading = $(child).text().replace(/\s+/g, " ").trim().slice(0, 160); since = new Set(); continue; }
      const href: string = child.attribs?.href ?? "";
      if (tag === "a" && href.toLowerCase().startsWith("mailto:")) {
        push(entschluesseltOderRoh(href.slice(7).split("?")[0]), inChrome);
      }
      walk(child, inChrome);
    }
  };
  walk($.root()[0], false);
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  if (main.size === 1) {
    const only = [...main][0];
    out.set(only, [...(out.get(only) ?? []), $("h1").first().text().replace(/\s+/g, " ").trim()]);
  }
  return { headings: out, title };
}

