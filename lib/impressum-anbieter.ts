/**
 * WHO IS THE PROVIDER OF THIS SITE? — read at the imprint, shared by every
 * stock that identifies an organisation from its website (installers, wind
 * operators, press, utilities).
 *
 * Taken out of the installer classification on 06.10.2026, where six measured
 * runs showed why a whole-page match is the wrong unit: an installer's page
 * says "Mitglied im … e.V.", its imprint names the Handwerkskammer as a
 * "Körperschaft des öffentlichen Rechts", the liability insurer with its
 * ombudsman, the web designer and an eRecht24 disclaimer. A name or class found
 * anywhere in that text proves nothing about who runs the site. The provider
 * block — the opening statement up to its postcode — does.
 *
 * What the block is not: complete. Imprints without a postcode, or with the
 * provider only in a footer, give an empty block; a caller treats that as "not
 * read", never as a finding.
 */

import { entities } from "./fachbetrieb-extrakt";

/**
 * Words that open the provider statement. "Impressum" alone is not one: it
 * stands in the navigation and the page title long before the statement.
 */
const ANBIETER_START =
  /Angaben\s+gem(?:ä|ae)(?:ß|ss)|Diensteanbieter|Anbieterkennzeichnung|Anbieter\s*(?:und|:)|Herausgeber|Betreiber\s+(?:der|dieser)\s+(?:Web|Internet)?(?:seite|site|präsenz)|Verantwortlich(?:er)?\s+f(?:ü|ue)r\s+(?:den\s+Inhalt|diese)|Inhaber|Anschrift|Impressum\s*(?:\n|$)/gi;

// Sections of an imprint that name SOMEONE ELSE with an address: the
// liability insurer ("Anbieter: Ergo Versicherung … Versicherungsombudsmann
// e.V." — meissner-handwerk.de, measured), the arbitration board, the
// chamber, the web designer. A provider block never starts inside one.
const FREMDER_ABSCHNITT =
  /Versicherung|Haftpflicht|Schlichtung|Ombudsmann|Kammer|Aufsichtsbeh|Webdesign|Gestaltung|Realisierung|Hosting|Bildnachweis|Bildrechte|Fotos?\b|eRecht24|Disclaimer|Haftungsausschluss|Urheberrecht/i;

/**
 * The provider's name and address: from an opening word up to the first
 * postcode after it. Falls back to the stretch before the first postcode,
 * which on short imprints is the provider block itself.
 */
export function anbieterBlock(impText: string): string {
  if (!impText) return "";
  for (const m of impText.matchAll(ANBIETER_START)) {
    if (FREMDER_ABSCHNITT.test(impText.slice(Math.max(0, m.index! - 80), m.index!))) continue;
    const rest = impText.slice(m.index!, m.index! + 400);
    const plz = rest.search(/\b\d{5}\s+[A-ZÄÖÜ]/);
    // "Betreiber der Seiten behalten sich … vor. Quelle: Disclaimer von
    // eRecht24, dem Portal zum Internetrecht" is boilerplate, not a provider
    // (sonnentaler.de, measured).
    if (plz > 0 && !/eRecht24|Disclaimer|Haftungsausschluss/i.test(rest.slice(0, plz))) return rest.slice(0, plz + 40);
  }
  const plz = impText.search(/\b\d{5}\s+[A-ZÄÖÜ]/);
  if (plz <= 0) return "";
  const block = impText.slice(Math.max(0, plz - 200), plz + 40);
  return FREMDER_ABSCHNITT.test(block) ? "" : block;
}

/** Title and meta description: how the site describes itself. */
export function selbstbeschreibung(html: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const d =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ??
    "";
  return entities(`${t}\n${d}`).replace(/\s+/g, " ").trim();
}
