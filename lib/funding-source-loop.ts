import { createHash } from "node:crypto";
import { load } from "cheerio";
import { sichtbarerText } from "./funding-screen-erkennung";

/** Ignore script nonces, but include published raw targets so real new navigation survives. */
export function fundingNavigationSignature(html: string): string {
  const $ = load(html);
  const targets = $("a[href],frame[src],iframe[src],embed[src],object[data],[result-url]").toArray()
    .map(el => $(el).attr("href") ?? $(el).attr("src") ?? $(el).attr("data") ?? $(el).attr("result-url") ?? "").sort();
  return createHash("sha256").update(JSON.stringify([sichtbarerText(html), $("base[href]").first().attr("href"), targets])).digest("hex");
}

/** One repeated path block inserted into the same origin; never rewrite a URL. */
export function repeatedFundingPath(previous: string, current: string): boolean {
  const a = new URL(previous), b = new URL(current);
  if (a.origin !== b.origin || a.search !== b.search) return false;
  const old = a.pathname.split("/").filter(Boolean), next = b.pathname.split("/").filter(Boolean);
  const extra = next.length - old.length;
  if (extra <= 0 || !old.length) return false;
  for (let start = 0; start + extra <= next.length; start++) {
    const removed = next.slice(start, start + extra);
    const restored = next.slice(0, start).concat(next.slice(start + extra));
    if (restored.join("/") !== old.join("/")) continue;
    const before = next.slice(Math.max(0, start - extra), start);
    const after = next.slice(start + extra, start + 2 * extra);
    if (removed.join("/") === before.join("/") || removed.join("/") === after.join("/")) return true;
  }
  return false;
}
