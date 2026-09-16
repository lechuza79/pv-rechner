import { execFile } from "node:child_process";
import { load } from "cheerio";
import { contactContentGap } from "../../lib/contact-discovery";

export const htmlText = (text: string) => `<article>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</article>`;
/** Use the original PDF bytes, bounded locally. Scans stay unresolved. */
export async function fundingPdfText(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("PDF exceeds extraction budget");
  return new Promise((resolve, reject) => {
    const child = execFile("pdftotext", ["-layout", "-nopgbrk", "-", "-"], { timeout: 15000, maxBuffer: 4 * 1024 * 1024, encoding: "utf8" }, (error, stdout) => {
      if (error || stdout.trim().length < 40) reject(error ?? new Error("PDF has no readable text"));
      else resolve(stdout);
    });
    child.stdin?.on("error", () => {});
    child.stdin?.end(bytes);
  });
}
export function fundingContentGap(html: string) {
  const known = contactContentGap(html);
  if (known) return known;
  const $ = load(html);
  $("script,style,nav,header,footer").remove();
  return $("body").text().trim().length < 180 && /<script\b/i.test(html) && /id=["'](?:app|root|__next)["']/i.test(html) ? "loading-shell" : null;
}
// Browser rendering is a fallback for content gaps, never a challenge bypass.
let browserTail: Promise<unknown> = Promise.resolve();
export function renderFundingSource(url: string): Promise<string> {
  const job = browserTail.then(async () => {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.route("**/*", route => ["image", "media", "font"].includes(route.request().resourceType()) ? route.abort() : route.continue());
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      // Give published async content a bounded opportunity to arrive.
      for (let attempt = 0; attempt < 8; attempt++) {
        const html = await page.content();
        if (!fundingContentGap(html)) return html;
        await page.waitForTimeout(500);
      }
      throw new Error("Rendered source remains incomplete");
    } finally { await browser.close(); }
  });
  browserTail = job.catch(() => {});
  return job;
}
