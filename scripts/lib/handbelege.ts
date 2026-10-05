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
  const html = entschleiere(decodeEntities(deobfuscatePublishedMail(live.html)));
  out.ok =
    contactCandidates(html, b.url, host).some((c) => c.email.toLowerCase() === email) ||
    html.toLowerCase().includes(email);
  if (!out.ok) out.reason = "Adresse steht nicht mehr auf der Seite";
  return out;
}
