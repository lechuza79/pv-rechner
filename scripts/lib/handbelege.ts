/**
 * Addresses proven outside the contact search — by hand or by the follow-up
 * search — with the page that publishes them. One JSON file per town.
 *
 * They never enter the contact search's own selection, so the last check
 * before sending turned every one of them away (05.10.2026). The send now
 * accepts them, but only after the publishing page is fetched again and still
 * shows the address.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Handbeleg } from "../../lib/contact-v2-gate";
import { contactCandidates } from "../../lib/contact-evidence";
import { deobfuscatePublishedMail } from "../../lib/mail-deobfuscation";
import { decodeEntities, entschleiere } from "../../lib/kommunen-profil";
import { fetchLive } from "./kontakt-lauf";
import { MAIN_CHECKOUT } from "./contact-v2-config";

export const HANDBELEG_DIR = resolve(MAIN_CHECKOUT, "scripts/.cache/kommunen-handbelege");

export function handbelegLesen(id: string): Handbeleg | null {
  const p = resolve(HANDBELEG_DIR, `${id}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Handbeleg) : null;
}

export function handbelegSchreiben(id: string, b: Handbeleg): void {
  mkdirSync(HANDBELEG_DIR, { recursive: true });
  writeFileSync(resolve(HANDBELEG_DIR, `${id}.json`), JSON.stringify({ ...b, email: b.email.trim().toLowerCase() }, null, 1));
}

/** Fetch the publishing page again: is the address still there? */
export async function handbelegNachpruefen(id: string, b: Handbeleg) {
  const email = b.email.trim().toLowerCase();
  const out = { id, email, checkedAt: new Date().toISOString(), ok: false, url: b.url as string | null, reason: null as string | null };
  const live = await fetchLive(b.url);
  if ("error" in live) {
    out.reason = live.error;
    return out;
  }
  const host = new URL(b.url).hostname.replace(/^www\./, "");
  // '<span class="at"></span>' stands for "@" on several municipal sites (Rheine).
  const roh = live.html.replace(/<span[^>]*class=["']at["'][^>]*>\s*<\/span>/gi, "@");
  const html = entschleiere(decodeEntities(deobfuscatePublishedMail(wsmnAufloesen(roh))));
  out.ok =
    contactCandidates(html, b.url, host).some((c) => c.email.toLowerCase() === email) ||
    html.toLowerCase().includes(email);
  if (!out.ok) out.reason = "Adresse steht nicht mehr auf der Seite";
  return out;
}

/**
 * The "wsmn('…')" mail cloak of one municipal CMS (Tecklenburg, Borken): every
 * third character from position 1, reversed, then a fixed letter swap. Read
 * from the page's own script on 05.10.2026; the decoded address is appended
 * next to the call so the normal search finds it.
 */
export function wsmnAufloesen(html: string): string {
  return html.replace(/wsmn\('([^']*)'\)/g, (ganz, ml: string) => {
    let m = "";
    for (let i = 0; i < ml.length / 3; i++) m = ml.substr(i * 3 + 1, 1) + m;
    const mail = m
      .replace(/\?.*$/, "")
      .replace(/a/g, "@")
      .replace(/e/g, ".")
      .replace(/\*/g, "a")
      .replace(/;/g, "e")
      .replace(/:/g, "o")
      .replace(/,/g, "u")
      .replace(/!/g, "i");
    return `${ganz} ${mail} `;
  });
}
