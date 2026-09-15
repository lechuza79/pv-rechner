import { sameDomain, type ContactCandidate } from './contact-evidence';
export type ContactAssessmentOptions = { asOf?: string; organizationName?: string; organizationDomain?: string };
/** Separate evidence limitations from an address's identity and function. */
export function evidenceLimitations(text: string, url: string, options: ContactAssessmentOptions, publishedAt?: string): string[] {
  const year = Number((options.asOf ?? new Date().toISOString()).slice(0,4));
  const years = [...(publishedAt ?? '').matchAll(/\b(20\d{2})\b/g), ...url.matchAll(/(?:\/|[-_])(20\d{2})(?:\/|[-_.])/g), ...text.matchAll(/\b\d{1,2}\.\d{1,2}\.(20\d{2})\b/g)].map(m=>Number(m[1]));
  const issues: string[] = [];
  if (years.some(y=>y < year - 1)) issues.push('dated-source-needs-current-confirmation');
  if (/biodiversität|natur[- ]*(?:und|&)?[- ]*artenschutz|naturschutz/iu.test(text) && !/klimaschutzmanager|energieberatung|solar|photovoltaik/iu.test(text)) issues.push('nature-conservation-not-solar-responsibility');
  if (/anmeld|einreich|vorschläge/iu.test(text) && /aktionstag|markt der nachhaltigkeit|klimaschutzpreis|wettbewerb/iu.test(text)) issues.push('event-specific-contact');
  return issues;
}
/** A different mailbox domain is supported only by a named official authority card. */
export function officialMunicipalContact(c: ContactCandidate, options: ContactAssessmentOptions): boolean {
  if (!options.organizationName || !options.organizationDomain || !c.roleEvidence?.exclusiveAddress) return false;
  let host: string;
  try { host = new URL(c.sourceUrl).hostname.replace(/^www\./,''); } catch { return false; }
  if (!sameDomain(host, options.organizationDomain.replace(/^www\./,''))) return false;
  if (!/kontakt|contact|impressum|imprint/i.test(new URL(c.sourceUrl).pathname)) return false;
  const name = options.organizationName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const text = c.roleEvidence.text;
  return new RegExp(`(?:Gemeinde|Stadt|Samtgemeinde|Verbandsgemeinde)\\s+${name}(?=\\s|[,.;:]|$)`,'iu').test(text)
    && /bürgermeister|buergermeister|gemeindeverwaltung|stadtverwaltung/iu.test(text)
    && !/gast|partnergemeinde|partnerstadt|extern|dienstleister/iu.test(text);
}
