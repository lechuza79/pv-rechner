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
/** Text below this carries no programme; it is the floor `sourceFailure` uses. */
const FOERDERTEXT_MINDESTLAENGE = 300;
export function fundingContentGap(html: string) {
  const known = contactContentGap(html);
  // AN UNLOADED STAFF DIRECTORY IS A GAP IN THE CONTACT DATA, NEVER IN THE
  // FUNDING TEXT BESIDE IT. The contact dataset is right to stop there — an
  // unpopulated personnel widget is exactly the absence it measures. Funding
  // reads the same page for something else, and the programme text arrives
  // server-rendered while that widget is still empty.
  //   MEASURED 18.09.2026 over 54 sources filed as "shell", one per host: 28
  //   carry 2,590 to 16,943 characters of readable text, among them the
  //   municipal funding pages of Gernsheim, Straelen, VG Nahe-Glan, Minden,
  //   Herzogenrath, Dreieich, Hohenahr, Kronberg, Bad Dürkheim, Gudensberg and
  //   Rodgau. Lohfelden is in that set and sits in the catalogue already,
  //   found by another route — proof that these are programme pages, not
  //   husks. The stock was 516 sources across 325 hosts.
  //   THE FAILURE CLASS IS INVISIBLE: the fetch succeeds, the bytes are
  //   complete, the page looks normal in a browser, and the source is filed
  //   away unread with a seven-day retry that renews the same verdict. The
  //   browser fallback could not rescue them either — it only runs for
  //   "loading-shell", and its own loop waits for a gap that a staff widget
  //   never closes.
  //   THE VERDICT ONLY STANDS ON A PAGE TOO THIN TO CARRY A PROGRAMME, so a
  //   page whose text is missing as well is still held back rather than
  //   screened as "no municipal funding" — a wrong negative is the expensive
  //   direction here. The floor is an order of magnitude below the smallest
  //   readable page measured.
  if (known && known !== "dynamic-directory") return known;
  const $ = load(html);
  $("script,style,nav,header,footer").remove();
  const text = $("body").text().trim();
  if (known === "dynamic-directory") return text.length < FOERDERTEXT_MINDESTLAENGE ? known : null;
  return text.length < 180 && /<script\b/i.test(html) && /id=["'](?:app|root|__next)["']/i.test(html) ? "loading-shell" : null;
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
