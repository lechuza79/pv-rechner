import { load } from "cheerio";
import { createHash } from "node:crypto";
import { fingerprintOf } from "./funding-fingerprint";
import type { FundingProgram } from "./funding-programs";

export const REVIEW_BASELINE_SOURCE = "reviewed-source-baseline";
export type ReviewBaseline = { version: 1; reviewedAt: string; programHash: string; sources: Record<string, string> };
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function reviewedProgramHash(program: FundingProgram): string {
  const { lastVerified, pageSeenAt, changedSinceIso, ...content } = program;
  return hash(stable(content));
}
/** Ordered text and link targets: changing a value's meaning or PDF URL must invalidate review. */
export function reviewSourceHash(bytes: Uint8Array, contentType: string): string {
  const body = Buffer.from(bytes);
  if (body.subarray(0, 5).toString() === "%PDF-") {
    if (body.length < 500 || !body.subarray(-2048).toString().includes("%%EOF")) throw new Error("Incomplete PDF");
    return `pdf-v1:${hash(body)}`;
  }
  if (!/text\/html|application\/xhtml/i.test(contentType)) throw new Error("Unsupported source format");
  const html = body.toString("utf8");
  if (!fingerprintOf(html) || /captcha|verify you are human|access denied|just a moment/i.test(html)) throw new Error("Source is not readable");
  const $ = load(html);
  const main = $("main, [role=main]").first();
  const content = main.length ? main.clone() : $("body").clone();
  content.find("script, style, nav, aside").remove();
  if (!main.length) content.find("header, footer").remove();
  const links = content.find("a[href], iframe[src], object[data]").map((_, node) => $(node).attr("href") ?? $(node).attr("src") ?? $(node).attr("data") ?? "").get();
  // Heidelberg contact-card downloads carry a per-request cache key, not funding content.
  const stableLinks = links.map(link => link.replace(/(\/cached\/vcard\.vcf)\?key=[^&#]+$/, "$1"));
  const text = content.text().replace(/\s+/g, " ").trim();
  return `html-v3:${hash(JSON.stringify({ text, links: stableLinks }))}`;
}
export async function readReviewSources(urls: string[], fetcher: typeof fetch = fetch): Promise<Record<string, string>> {
  if (!urls.length) throw new Error("No reviewed sources");
  const result: Record<string, string> = {};
  for (const url of [...new Set(urls)].sort()) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Official HTTPS source required");
    const response = await fetcher(url, { headers: { "User-Agent": "SolarCheck-FundingReview/1.0 (+https://solar-check.io)" }, signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!response.ok || /web\.archive\.org/.test(response.url)) throw new Error(`Source unavailable: ${url}`);
    result[url] = reviewSourceHash(new Uint8Array(await response.arrayBuffer()), response.headers.get("content-type") ?? "");
  }
  return result;
}
export function baselineMatches(baseline: ReviewBaseline, program: FundingProgram, sources: Record<string, string>, now = new Date()): boolean {
  return baseline?.version === 1 && Number.isFinite(Date.parse(baseline.reviewedAt)) && Date.parse(baseline.reviewedAt) <= now.getTime()
    && baseline.programHash === reviewedProgramHash(program) && Object.keys(baseline.sources).length > 0
    && stable(baseline.sources) === stable(sources);
}
