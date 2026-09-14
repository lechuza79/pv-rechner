import { entschluesseltOderRoh } from "./uri-sicher";
import { load } from "cheerio";
import { entwirreAdressen } from "./personen-fund";

export type ContactCandidate = {
  email: string;
  sourceUrl: string;
  context: string;
  departments?: string[];
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

/** These are literal subject hints near the address, never inferred responsibility. */
export function contactDepartments(context: string): string[] {
  const rules: [string, RegExp][] = [
    ["climate-environment", /klimaschutz|umweltschutz|klima[- und]+umwelt|nachhaltigkeit/iu],
    ["energy", /energieberatung|energiemanagement|erneuerbare energien/iu],
    ["communications", /pressestelle|presse und kommunikation|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|webredaktion/iu],
    ["editorial", /redaktion|newsroom/iu],
    ["customer-service", /kundenservice|kundenzentrum|kundencenter/iu],
    ["network-service", /netzservice|netzanschluss|einspeisung/iu],
    ["management", /geschäftsführ|geschaeftsfuehr|betriebsleitung/iu],
  ];
  return rules.filter(([,pattern])=>pattern.test(context)).map(([name])=>name);
}

/** Keep every observed address and its local evidence. A foreign address is not an attribution. */
export function contactCandidates(html: string, sourceUrl: string, domain: string): ContactCandidate[] {
  // Read the publisher's no-script fallback too. Removing it made whole CMS
  // families look contactless even though they supplied a plain-text address.
  const $ = load(html, { scriptingEnabled: false });
  // Publishers sometimes insert invisible anti-spam text inside an address.
  // Remove only explicitly hidden elements, never the word "nospam" itself.
  $("[hidden], [style]").each((_, el) => {
    // Collapsed directory panels are ordinary discoverable content. Only strip
    // inline hidden fragments, not entire accordion/contact containers.
    if ($(el).is("span,b,i,em,strong,small") && ($(el).attr("hidden") !== undefined || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test($(el).attr("style") ?? ""))) $(el).remove();
  });
  $("joomla-hidden-mail[first][last]").each((_, el) => {
    try { $(el).text(`${atob($(el).attr("first")!)}@${atob($(el).attr("last")!)}`); }
    catch { /* Keep malformed encodings unresolved. */ }
  });
  $("script,style").remove();
  // DOM textContent joins adjacent elements with no separator. Preserve their
  // boundaries before extraction, so address + heading cannot become an email.
  $("br").replaceWith("\n");
  $("p,div,li,td,th,tr,section,article,address,h1,h2,h3,h4,h5,h6,nav,header,footer,ul,ol,dl,dt,dd,noscript").each((_, el) => {
    $(el).before("\n"); $(el).after("\n");
  });
  const candidates = new Map<string, ContactCandidate>();
  const add = (email: string, context: string) => {
    email = email.trim().toLowerCase();
    if (!/^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(email)) return;
    if (candidates.has(email)) return;
    candidates.set(email, { email, sourceUrl, context: context.replace(/\s+/g, " ").trim().slice(0, 600), departments: contactDepartments(context),
      relation: sameDomain(email.split("@")[1], domain) ? "same-domain" : "unconfirmed", purpose: contactPurpose(email) });
  };
  $("a[href^='mailto:']").each((_, el) => {
    const raw = ($(el).attr("href") ?? "").slice(7).split("?")[0];
    try {
      const local = $(el).closest("p,li,td,address,article,section,div").text().replace(/\s+/g," ").trim();
      add(entschluesseltOderRoh(raw), local.length <= 600 ? local : $(el).text());
    } catch { /* Malformed source. */ }
  });
  $("p,li,td,div,article,section,body").each((_, el) => {
    // Prefer the smallest local block; ancestors only add addresses not seen yet.
    const text = entwirreAdressen($(el).clone().children("div,p,li,td,article,section").remove().end().text().replace(/\(ad\)/gi, "@"));
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
