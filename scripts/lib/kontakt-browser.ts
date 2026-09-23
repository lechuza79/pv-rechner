/**
 * Second pass for entries a plain fetch could not read: render the site in a
 * real browser and store what a visitor sees.
 *
 * Measured on the PV craft businesses (22.09.2026): of 308 without an address,
 * about half were single-page sites whose imprint only exists after the script
 * ran, sites that decode their address in the browser, or sites that answer a
 * plain fetch with an error (certificate only valid for www., 403). A rendered
 * page is stored like a fetched one and judged by the same rules.
 *
 * No disguise: the browser announces itself with our crawler name, and a site
 * that still refuses stays unread.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Browser } from "playwright";
import type { Bestand, Eintrag } from "./kontakt-lauf";
import { host, siteOf } from "../../lib/kontakt-suche";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/**
 * A promise that must not outlive its deadline, falling back to `bei`.
 * Measured 23.09.2026: the craft business release stalled at 2.700 of 2.759
 * proof pages — 0 % CPU, no open socket, the process alive. A single page that
 * never settles held six workers and, because nothing is written before the
 * last page, would have thrown away 45 minutes of reads. A rejection counts as
 * the deadline too: an abandoned promise that rejects later would otherwise
 * take the whole process down as an unhandled rejection.
 */
export function mitFrist<T>(p: Promise<T>, ms: number, bei: T): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const frist = new Promise<T>(r => { t = setTimeout(() => r(bei), ms); });
  return Promise.race([p.catch(() => bei), frist]).finally(() => clearTimeout(t));
}
const KONTAKT_LINK = /impressum|imprint|kontakt|contact|legal|about|über uns|ueber-uns|uber-uns/i;

// A promise, not the browser: parallel callers would otherwise each launch one.
let browser: Promise<Browser> | null = null;
function oeffnen(): Promise<Browser> {
  browser ??= import("playwright").then(({ chromium }) => chromium.launch({ headless: true }));
  return browser;
}
export async function browserSchliessen() {
  const b = browser;
  browser = null;
  if (!b) return;
  await mitFrist((async () => { await (await b).close(); })(), 20000, undefined as void);
}

/** Start addresses in the order a visitor would reach the site. */
export function startAdressen(website: string): string[] {
  const h = host(website);
  const bare = h.replace(/^www\./, "");
  return [...new Set([`https://${h}/`, `https://www.${bare}/`, `http://www.${bare}/`, `http://${bare}/`])];
}

/** The page's HTML; a page that is still redirecting is given time to settle. */
async function inhalt(page: import("playwright").Page): Promise<string | null> {
  for (let versuch = 0; versuch < 3; versuch++) {
    // page.content() carries no deadline of its own and can hang for good.
    const html = await mitFrist(page.content(), 15000, null);
    if (html !== null) return html;
    await mitFrist(page.waitForLoadState("load", { timeout: 10000 }), 12000, undefined as void);
  }
  return null;
}

function speichern(b: Bestand, id: string, url: string, finalUrl: string, html: string) {
  const digest = sha(html);
  const dir = resolve(b.out, "sources", id);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(resolve(dir, `${digest}.html`), html, { mode: 0o600 });
  writeFileSync(resolve(dir, `${digest}.json`), JSON.stringify({ url, finalUrl, status: 200, observedAt: new Date().toISOString(), digest, originalDigest: null, gerendert: true }, null, 1), { mode: 0o600 });
}

/**
 * Render the start page and up to `max - 1` imprint/contact pages it links to.
 * Returns what was read, for the log.
 */
export async function rendern(b: Bestand, e: Eintrag, max = 5): Promise<{ gelesen: string[]; fehler: string | null }> {
  if (!e.website) return { gelesen: [], fehler: "keine Website" };
  const br = await oeffnen();
  const ctx = await br.newContext({
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${br.version()} Safari/537.36 solar-check-kontaktpruefung/2.0 (+https://solar-check.io/impressum)`,
  });
  const page = await ctx.newPage();
  const gelesen: string[] = [];
  let fehler: string | null = null;
  try {
    let start: string | null = null;
    for (const url of startAdressen(e.website)) {
      try {
        const res = await page.goto(url, { waitUntil: "load", timeout: 15000 });
        // Scripts that build the page or decode addresses run after "load".
        await page.waitForTimeout(2000);
        if (res && res.status() < 400) { start = url; break; }
        fehler = `HTTP ${res?.status()}`;
      } catch (err: any) { fehler = String(err?.message ?? err).split("\n")[0].slice(0, 80); }
    }
    if (!start) return { gelesen, fehler };
    fehler = null;
    const startHtml = await inhalt(page);
    if (!startHtml) return { gelesen, fehler: "Seite kam nicht zur Ruhe" };
    speichern(b, e.id, start, page.url(), startHtml);
    gelesen.push(page.url());
    const site = siteOf(host(page.url()));
    const links = await page.$$eval("a[href]", as => as.map(a => ({ href: (a as HTMLAnchorElement).href, text: (a.textContent ?? "").trim() })));
    const ziele = [...new Set(links.filter(l => KONTAKT_LINK.test(l.href) || KONTAKT_LINK.test(l.text)).map(l => l.href))]
      .filter(u => /^https?:/.test(u) && siteOf(host(u)) === site && !/\.(pdf|jpe?g|png)(\?|$)/i.test(u))
      .sort((a, b2) => Number(/impressum|imprint/i.test(b2)) - Number(/impressum|imprint/i.test(a)));
    for (const ziel of ziele.slice(0, max - 1)) {
      try {
        const res = await page.goto(ziel, { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(1500);
        // A hash route of a single-page site navigates without a response.
        if (res && res.status() >= 400) continue;
        const html = await inhalt(page);
        if (!html) continue;
        speichern(b, e.id, ziel, page.url(), html);
        gelesen.push(page.url());
      } catch { /* one unreadable page does not end the pass */ }
    }
  } finally {
    await ctx.close();
  }
  return { gelesen, fehler };
}

/** One page as a visitor sees it, without storing it — for the check right before use. */
export async function seiteGerendert(url: string): Promise<string | null> {
  const br = await oeffnen();
  const ctx = await br.newContext({
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${br.version()} Safari/537.36 solar-check-kontaktpruefung/2.0 (+https://solar-check.io/impressum)`,
  });
  const lesen = async () => {
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(2000);
    return res && res.status() >= 400 ? null : await inhalt(page);
  };
  try {
    // One page may cost at most this long, whatever the browser is doing.
    return await mitFrist(lesen(), 60000, null);
  } catch { return null; } finally {
    // Closing a stuck context can hang as well; a leaked context is the
    // cheaper loss, browserSchliessen() takes the whole browser down anyway.
    await mitFrist(ctx.close(), 15000, undefined as void);
  }
}
