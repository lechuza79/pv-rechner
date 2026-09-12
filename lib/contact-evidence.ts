import { entschluesseltOderRoh } from "./uri-sicher";
import { load } from "cheerio";

export type ContactCandidate = {
  email: string;
  sourceUrl: string;
  context: string;
  relation: "same-domain" | "unconfirmed";
  purpose: "press" | "website" | "sales" | "general" | "excluded" | "unknown";
};

export function sameDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** A navigation label alone cannot validate a contact destination. */
export function confirmedContactPage(html: string): boolean {
  const $ = load(html);
  $("nav,header,footer,script,style,aside").remove();
  const heading = $("h1,h2,title").text();
  if (!/kontakt|ansprechpartner|erreichbarkeit/i.test(heading)) return false;
  if (/nicht gefunden|404|seite existiert nicht/i.test($("h1,title").text())) return false;
  return $("a[href^='mailto:'],a[href^='tel:']").length > 0 ||
    $("form").toArray().some(el => $(el).find("textarea,input[type='email']").length > 0) ||
    /[\w.+%-]+@[\w-]+\.[\w.-]+/.test($("body").text());
}

export function contactPurpose(email: string): ContactCandidate["purpose"] {
  const local = email.toLowerCase().split("@")[0];
  if (/^(datenschutz|dsb|privacy|abuse|noreply|no-reply|postmaster)([._-]|$)/.test(local)) return "excluded";
  if (/^(presse|pressestelle|redaktion|newsroom)([._-]|$)/.test(local)) return "press";
  if (/^(webmaster|webteam|online-redaktion|internetredaktion)([._-]|$)/.test(local)) return "website";
  if (/^(vertrieb|sales|marketing)([._-]|$)/.test(local)) return "sales";
  if (/^(info|kontakt|rathaus|poststelle|gemeinde|stadtverwaltung|verwaltung|service|buero|office)$/.test(local)) return "general";
  return "unknown";
}

/** Keep every observed address and its local evidence. A foreign address is not an attribution. */
export function contactCandidates(html: string, sourceUrl: string, domain: string): ContactCandidate[] {
  const $ = load(html);
  $("script,style,noscript").remove();
  const candidates = new Map<string, ContactCandidate>();
  const add = (email: string, context: string) => {
    email = email.trim().toLowerCase();
    if (!/^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(email)) return;
    if (candidates.has(email)) return;
    candidates.set(email, { email, sourceUrl, context: context.replace(/\s+/g, " ").trim().slice(0, 600),
      relation: sameDomain(email.split("@")[1], domain) ? "same-domain" : "unconfirmed", purpose: contactPurpose(email) });
  };
  $("a[href^='mailto:']").each((_, el) => {
    const raw = ($(el).attr("href") ?? "").slice(7).split("?")[0];
    try { add(entschluesseltOderRoh(raw), $(el).closest("p,li,td,article,section,div").text()); } catch { /* Malformed source. */ }
  });
  $("p,li,td,div,article,section,body").each((_, el) => {
    // Prefer the smallest local block; ancestors only add addresses not seen yet.
    const text = $(el).clone().children("div,p,li,td,article,section").remove().end().text();
    for (const m of text.matchAll(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g)) add(m[0], text.slice(Math.max(0, m.index! - 220), m.index! + 380));
  });
  return [...candidates.values()];
}

/** Missing observations never erase previously known facts. Explicit retractions need a separate action. */
export function observedFields<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && !value.length))) as Partial<T>;
}

export function chooseOwnedMailbox(emails: string[], domain: string): string | null {
  const normalized = [...new Set(emails.map(e => e.toLowerCase().replace(/[.,;:)]+$/, "")))];
  const owned = normalized.filter(e => sameDomain(e.split("@")[1] ?? "", domain) && contactPurpose(e) !== "excluded");
  const score = (email: string) => contactPurpose(email) === "general" ? 0 : contactPurpose(email) === "sales" ? 1 : 2;
  return owned.sort((a, b) => score(a) - score(b) || a.localeCompare(b))[0] ?? null;
}
