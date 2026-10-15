/**
 * Is this mailbox a sensible recipient for a letter at all? One list for every
 * population — municipalities, utilities, craft businesses, press.
 *
 * A proven address can still be the wrong one: the contact search found
 * vorname.nachname@ placeholders, email@example.com, data-protection and
 * webmaster mailboxes on the very pages it reads (measured 22.09.2026 on the
 * craft businesses). Proof says where an address stands, not what it is for.
 */

/**
 * Mailbox names that never take a letter from us. Checked on the first part of
 * the name. Deliberately NOT here: webmaster@ — at a small municipality it is
 * often the only mailbox and the person who could embed a widget.
 */
export const POSTFACH_UNGEEIGNET = [
  "datenschutz", "dsb", "privacy", "dpo", "abuse", "noreply", "no-reply", "donotreply", "do-not-reply",
  "postmaster", "mailer-daemon", "hostmaster", "security", "bewerbung", "bewerbungen",
  "jobs", "job", "karriere", "career", "careers", "ausbildung", "rechnung", "rechnungen", "buchhaltung",
  "invoice", "invoices", "newsletter", "unsubscribe", "abmelden", "widerruf", "beschwerde", "reklamation",
];

/** Placeholder addresses from templates, never a real mailbox. email.de is a real provider and stays out. */
const PLATZHALTER_LOKAL = /^(?:vorname|name|max|maxmustermann|mustermann|ihr[-_.]?name|user|test|beispiel|example)(?:[._-](?:nachname|name|mustermann|muster))?$/;
const PLATZHALTER_DOMAIN = /(?:^|\.)(?:example|beispiel|domain|ihredomain|ihre-domain|musterfirma|mustermann|website|yourdomain)\.(?:com|de|org|net)$/;

const ohneUmlaute = (s: string) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

export type Tauglichkeit = { ok: true } | { ok: false; grund: string };

/** Services whose addresses appear in page code (error tracking, site builders, tag managers). */
const TECHNIK_DOMAIN = /(?:^|\.)(?:sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|sentry\.wixpress\.com|ingest\.sentry\.io)$/;

export function postfachTauglich(email: string): Tauglichkeit {
  const adresse = email.trim().toLowerCase();
  const [lokal, domain] = adresse.split("@");
  if (!lokal || !domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { ok: false, grund: `keine gültige Adresse: ${email}` };
  const erstes = ohneUmlaute(lokal).split(/[.\-_]+/).filter(Boolean)[0] ?? "";
  if (POSTFACH_UNGEEIGNET.includes(erstes)) return { ok: false, grund: `${erstes}@ ist kein Postfach für Anschreiben` };
  if (PLATZHALTER_LOKAL.test(ohneUmlaute(lokal)) || PLATZHALTER_DOMAIN.test(domain)) return { ok: false, grund: `Platzhalter aus einer Vorlage: ${adresse}` };
  // Addresses from page code, not from the page: an error tracker's key in a
  // Wix site (605a7bae…@sentry-next.wixpress.com was taken as the general
  // mailbox of a garage, contact pass 07.10.2026). A long hex key is nobody's mailbox.
  if (TECHNIK_DOMAIN.test(domain) || /^[0-9a-f]{20,}$/.test(lokal)) return { ok: false, grund: `technische Kennung aus dem Seitencode: ${adresse}` };
  return { ok: true };
}
