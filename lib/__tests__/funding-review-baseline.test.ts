import { describe, expect, it } from "vitest";
import { FUNDING_PROGRAMS } from "../funding-programs";
import { baselineMatches, readReviewSources, reviewedProgramHash, reviewSourceHash, type ReviewBaseline } from "../funding-review-baseline";
const program = FUNDING_PROGRAMS["heidelberg-rev"];
const urls = ["https://example.org/program", "https://example.org/rules.pdf"];
const sources = { [urls[0]]: "html-v1:a", [urls[1]]: "pdf-v1:b" };
const baseline: ReviewBaseline = { version: 1, reviewedAt: "2026-10-12T10:00:00Z", programHash: reviewedProgramHash(program), sources };
const now = new Date("2026-10-12T12:00:00Z");
const html = (text: string) => Buffer.from(`<main>${"Official funding information for residents and enterprises. ".repeat(20)}${text}</main>`);
describe("reviewed funding baseline", () => {
  it("renews only the exact reviewed programme and complete source set", () => {
    expect(baselineMatches(baseline, program, sources, now)).toBe(true);
    expect(baselineMatches(baseline, {...program, lastVerified:"2026-10-13", pageSeenAt:"2026-10-13"}, sources, now)).toBe(true);
    expect(baselineMatches(baseline, {...program, status:"pausiert"}, sources, now)).toBe(false);
    expect(baselineMatches(baseline, program, {[urls[0]]: sources[urls[0]]}, now)).toBe(false);
    expect(baselineMatches(baseline, program, {...sources, [urls[1]]:"pdf-v1:changed"}, now)).toBe(false);
    expect(baselineMatches({...baseline, reviewedAt:"2099-01-01"}, program, sources, now)).toBe(false);
  });
  it("never blesses a changed source just because the next observation repeats it", () => {
    const changed = {...sources, [urls[0]]:"html-v1:changed"};
    expect(baselineMatches(baseline, program, changed, now)).toBe(false);
    expect(baselineMatches(baseline, program, changed, new Date("2026-10-13"))).toBe(false);
  });
  it("detects reordered amounts, changed PDF links and PDF bytes", () => {
    expect(reviewSourceHash(html('roof 100 facade 200'), 'text/html')).not.toBe(reviewSourceHash(html('roof 200 facade 100'), 'text/html'));
    expect(reviewSourceHash(html('<a href="old.pdf">Rules</a>'), 'text/html')).not.toBe(reviewSourceHash(html('<a href="new.pdf">Rules</a>'), 'text/html'));
    const pdf = Buffer.from('%PDF-1.7\n'+ 'data'.repeat(200)+'\n%%EOF');
    expect(reviewSourceHash(pdf, 'application/pdf')).not.toBe(reviewSourceHash(Buffer.from(pdf.toString().replace('data','edit')), 'application/pdf'));
    expect(()=>reviewSourceHash(Buffer.from('Unavailable'), 'text/html')).toThrow();
    expect(()=>reviewSourceHash(Buffer.from(`<title>Just a moment...</title>${html('x').toString()}`), 'text/html')).toThrow();
    expect(()=>reviewSourceHash(html('Please solve the captcha to continue'), 'text/html')).toThrow();
    expect(reviewSourceHash(Buffer.from(`<script>{"captchaInvisibleRecaptchaSitekey":"k"}</script>${html('x').toString()}`), 'text/html')).toMatch(/^html-v3:/);
    expect(()=>reviewSourceHash(Buffer.from('%PDF-1.7 truncated'), 'application/pdf')).toThrow();
  });
  it("ignores page navigation but preserves notices inside semantic main content", () => {
    const page = (nav: string, status: string) => Buffer.from(`<nav>${nav}</nav><div role="main">${"Programme information residents applicants. ".repeat(25)}<header>${status}</header></div>`);
    expect(reviewSourceHash(page('News A', 'Applications open'), 'text/html')).toBe(reviewSourceHash(page('News B', 'Applications open'), 'text/html'));
    expect(reviewSourceHash(page('News A', 'Applications open'), 'text/html')).not.toBe(reviewSourceHash(page('News A', 'Applications closed'), 'text/html'));
  });
  it("ignores only rotating contact-card cache keys, preserving document parameters", () => {
    const source = (link: string) => reviewSourceHash(html(`<a href="${link}">Download</a>`), "text/html");
    expect(source("/contacts/cached/vcard.vcf?key=0.first")).toBe(source("/contacts/cached/vcard.vcf?key=0.second"));
    expect(source("/rules.pdf?key=first")).not.toBe(source("/rules.pdf?key=second"));
    expect(source("/a/cached/vcard.vcf?key=first")).not.toBe(source("/b/cached/vcard.vcf?key=first"));
  });
  it("rejects incomplete fetches and archives without partial confirmation", async () => {
    const fetcher = async (input: string | URL | Request) => String(input).endsWith('.pdf') ? new Response('failed',{status:503}) : new Response(html('100 EUR'),{headers:{'content-type':'text/html'}});
    await expect(readReviewSources(urls, fetcher as typeof fetch)).rejects.toThrow();
    await expect(readReviewSources([])).rejects.toThrow();
    const archived = new Response(html('100 EUR'),{headers:{'content-type':'text/html'}});
    Object.defineProperty(archived,'url',{value:'https://web.archive.org/web/2026/page'});
    await expect(readReviewSources([urls[0]], (async()=>archived) as typeof fetch)).rejects.toThrow();
  });
});
