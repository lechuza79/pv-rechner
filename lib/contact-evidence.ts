import { entschluesseltOderRoh } from "./uri-sicher";
import { load } from "cheerio";
import { entwirreAdressen } from "./personen-fund";
import { publishedJoomlaMail } from "./published-joomla-mail";

export type ContactCandidate = {
  email: string;
  sourceUrl: string;
  context: string;
  publishedAt?: string;
  departments?: string[];
  roleEvidence?: { text: string; scope: "local-block"; exclusiveAddress: boolean };
  additionalRoleEvidence?: { text: string; scope: "local-block"; exclusiveAddress: boolean }[];
  sourceConflicts?: { kind: "mail-link-label-mismatch"; linked: string; displayed: string }[];
  relation: "same-domain" | "unconfirmed";
  purpose: "press" | "website" | "sales" | "general" | "excluded" | "unknown";
};

export function sameDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Decode published Joomla/TYPO3 link data without executing page JavaScript.
 * Character ranges match TYPO3's publisher-supplied mail link handler.
 */
function decodePublishedMailLinks($: ReturnType<typeof load>): void {
  $("script").each((_, el) => {
    const script = $(el).text();
    if (!script.includes("addy") || !script.includes("document.write")) return;
    const email = publishedJoomlaMail(script);
    if (email) $(el).replaceWith($("<a>").attr("href", `mailto:${email}`).text(email));
  });
  $("a[data-mailto-token][data-mailto-vector]").each((_, el) => {
    const raw = $(el).attr("data-mailto-vector") ?? "";
    if (!/^-?\d{1,2}$/.test(raw)) return;
    const shift = -Number(raw);
    if (Math.abs(shift) > 15) return;
    const token = $(el).attr("data-mailto-token") ?? "";
    if (token.length > 2048) return;
    const decoded = [...token].map(char => {
      const code = char.charCodeAt(0);
      const range = [[43,58],[64,90],[97,122]].find(([lo,hi]) => code >= lo && code <= hi);
      if (!range) return char;
      const [lo,hi] = range;
      const length = hi - lo + 1;
      return String.fromCharCode(lo + ((code - lo + shift) % length + length) % length);
    }).join("");
    if (/^mailto:[\w.+%-]+@[\w-]+(?:\.[\w-]+)+(?:\?[^\r\n]*)?$/i.test(decoded)) $(el).attr("href", decoded);
  });
}

/** A navigation label alone cannot validate a contact destination. */
export function confirmedContactPage(html: string): boolean {
  const $ = load(html);
  decodePublishedMailLinks($);
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
    ["climate-environment", /klimaschutz|umweltschutz|klima[- und]+umwelt/iu],
    ["energy", /energieberatung|energiemanagement|erneuerbare energien/iu],
    ["communications", /pressestelle|presse (?:und |& )?(?:kommunikation|marketing)|unternehmenskommunikation|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|webredaktion|amtsblatt|(?:betreuung|administration|redaktion)\s+(?:der\s+)?(?:homepage|website)|social media/iu],
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
  decodePublishedMailLinks($);
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
  let structuredPublication: string | undefined;
  const publication = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(publication); return; }
    const row = value as Record<string, unknown>;
    const types = Array.isArray(row["@type"]) ? row["@type"] : [row["@type"]];
    if (types.some(t=>["Article","NewsArticle","BlogPosting"].includes(String(t))) && typeof row.datePublished === "string") structuredPublication ??= row.datePublished;
    if (row["@graph"]) publication(row["@graph"]);
  };
  $("script[type='application/ld+json']").each((_,el)=>{
    try { publication(JSON.parse($(el).text())); } catch { /* Malformed metadata stays unknown. */ }
  });
  $("script,style").remove();
  // DOM textContent joins adjacent elements with no separator. Preserve their
  // boundaries before extraction, so address + heading cannot become an email.
  $("br").replaceWith("\n");
  $("p,div,li,td,th,tr,section,article,address,h1,h2,h3,h4,h5,h6,nav,header,footer,ul,ol,dl,dt,dd,noscript").each((_, el) => {
    $(el).before("\n"); $(el).after("\n");
  });
  $("a[href^='mailto:'],span,strong,b").each((_, el) => {
    const text = entwirreAdressen($(el).text()).trim();
    if ($(el).is("a") || /^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(text)) {
      $(el).before("\n"); $(el).after("\n");
    }
  });
  const publishedAt = structuredPublication ?? $("meta[property='article:published_time']").attr("content") ?? $("article time[datetime]").first().attr("datetime");
  const candidates = new Map<string, ContactCandidate>();
  const linkConflicts: NonNullable<ContactCandidate['sourceConflicts']> = [];
  const localEvidence = (el: Parameters<typeof $>[0], email: string) => {
    let block = $(el).closest("p,li,td,address,article,section,div");
    let best = "";
    // Expand only through a single-contact card. Never borrow another person's
    // heading, a navigation label or the page-wide department name.
    for (let depth = 0; block.length && depth < 4; depth++, block = block.parent()) {
      if (block.is("body,html,nav,header,footer,aside")) break;
      const copy = block.clone();
      copy.find("nav,header,footer,aside").remove();
      const text = copy.text().replace(/\s+/g, " ").trim();
      const addresses = new Set<string>();
      copy.find("a[href^='mailto:']").each((_, link) => {
        addresses.add(entschluesseltOderRoh(($(link).attr("href") ?? "").slice(7).split("?")[0]).toLowerCase());
      });
      for (const match of entwirreAdressen(text).replace(/\(ad\)/gi, "@").matchAll(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g)) addresses.add(match[0].toLowerCase());
      if (text.length > 4000 || [...addresses].some(a => a !== email)) break;
      // Long personnel cards are bounded by their repeated sibling structure,
      // not by the length of an employee's list of duties. A page containing
      // just one address does not provide this independent boundary.
      const fieldHeadings = new Set(copy.find("h3,h4,h5,h6").toArray()
        .map(heading => $(heading).text().replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean));
      // Repeated news/event headlines are not a personnel-record boundary.
      // Require repeated field labels (for example office and duties), too.
      const repeatedCard = text.length > 600 && fieldHeadings.size >= 2
        && block.siblings().toArray().some(sibling => {
          const other = $(sibling);
          if (other.prop("tagName") !== block.prop("tagName") || !other.find("h1,h2,h3,h4,h5,h6").length) return false;
          const otherFields = new Set(other.find("h3,h4,h5,h6").toArray()
            .map(heading => $(heading).text().replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean));
          if ([...fieldHeadings].filter(heading => otherFields.has(heading)).length < 2) return false;
          const links = other.find("a[href^='mailto:']");
          if (links.length !== 1) return false;
          const address = entschluesseltOderRoh((links.attr("href") ?? "").slice(7).split("?")[0]).toLowerCase();
          return address !== email && /^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(address);
        });
      if (text && addresses.has(email) && (text.length <= 600 || repeatedCard)) best = text;
      // A contact table commonly places the role and mail link in adjacent
      // cells. Expand to this row only, never to the next person's row.
      if (block.is("article,section,li,tr,address")) break;
    }
    return best;
  };
  const add = (email: string, context: string, evidence = "") => {
    email = email.trim().toLowerCase();
    if (!/^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(email)) return;
    if (candidates.has(email)) {
      const prior = candidates.get(email)!;
      if (evidence && !prior.roleEvidence) prior.roleEvidence = { text: evidence, scope: "local-block", exclusiveAddress: true };
      else if (evidence && evidence !== prior.roleEvidence?.text && !prior.additionalRoleEvidence?.some(e => e.text === evidence)) {
        (prior.additionalRoleEvidence ??= []).push({ text: evidence, scope: "local-block", exclusiveAddress: true });
      }
      return;
    }
    candidates.set(email, { email, sourceUrl, ...(publishedAt ? {publishedAt} : {}), context: context.replace(/\s+/g, " ").trim().slice(0, 600), departments: contactDepartments(context),
      ...(evidence ? { roleEvidence: { text: evidence, scope: "local-block" as const, exclusiveAddress: true } } : {}),
      relation: sameDomain(email.split("@")[1], domain) ? "same-domain" : "unconfirmed", purpose: contactPurpose(email) });
  };
  $("a[href^='mailto:']").each((_, el) => {
    const raw = ($(el).attr("href") ?? "").slice(7).split("?")[0];
    try {
      const local = $(el).closest("p,li,td,address,article,section,div").text().replace(/\s+/g," ").trim();
      const email = entschluesseltOderRoh(raw).trim().toLowerCase();
      // Compare only an explicitly printed address in this link's label.
      // Generic labels, neighboring contacts and subject parameters are not evidence.
      if (/^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/.test(email)) {
        const labels = entwirreAdressen($(el).text()).replace(/\(ad\)/gi, '@').match(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
        for (const label of labels) {
          const displayed = label.toLowerCase();
          if (displayed !== email && !linkConflicts.some(c => c.linked === email && c.displayed === displayed)) {
            linkConflicts.push({ kind: 'mail-link-label-mismatch', linked: email, displayed });
            add(displayed, $(el).text());
          }
        }
      }
      add(email, local.length <= 600 ? local : $(el).text(), localEvidence(el, email));
    } catch { /* Malformed source. */ }
  });
  $("p,li,td,div,article,section,body").each((_, el) => {
    // Prefer the smallest local block; ancestors only add addresses not seen yet.
    const text = entwirreAdressen($(el).clone().children("div,p,li,td,article,section").remove().end().text().replace(/\(ad\)/gi, "@"));
    for (const m of text.matchAll(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g)) add(m[0], text.slice(Math.max(0, m.index! - 220), m.index! + 380), localEvidence(el, m[0].toLowerCase()));
  });
  for (const candidate of candidates.values()) {
    const conflicts = linkConflicts.filter(c => c.linked === candidate.email || c.displayed === candidate.email);
    if (conflicts.length) candidate.sourceConflicts = conflicts;
  }
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
