import { landscapePlaces } from './landscape-places';

/** Approved public identity; place selection only changes the visual example. */
export const KOMMUNEN_PATH = '/fuer-organisationen/kommunen';
export const KOMMUNEN_TITLE = 'Energiemonitor, Checks & Rechner und Datenstories für Kommunen | Solar Check';
export const KOMMUNEN_DESCRIPTION = 'Energiedaten verständlich machen: Energiemonitor, Checks & Rechner und Datenstories für Städte, Gemeinden und Landkreise. Entdecken Sie den Kommunen-Pilot von Solar Check.';


/** Head metadata is generated with the approved composition, not at request time. */
export function kommunenMetadata(): string {
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const url = `https://solar-check.io${KOMMUNEN_PATH}`;
  return `<title>${escape(KOMMUNEN_TITLE)}</title><meta name="description" content="${escape(KOMMUNEN_DESCRIPTION)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:title" content="${escape(KOMMUNEN_TITLE)}"><meta property="og:description" content="${escape(KOMMUNEN_DESCRIPTION)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://solar-check.io/api/og?view=kommunen"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Solar Check für Kommunen: Energiemonitor, Checks &amp; Rechner und Datenstories"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(KOMMUNEN_TITLE)}"><meta name="twitter:description" content="${escape(KOMMUNEN_DESCRIPTION)}"><meta name="twitter:image" content="https://solar-check.io/api/og?view=kommunen">`;
}

/**
 * Link to the municipal page for one place. The place is attached only when a
 * scene for it is published (`landscapePlaces` is the single list of prepared
 * locations); otherwise the page would open on its default place, and a letter
 * promising "your town" would show a different one. Letter preview and dispatch
 * both read this, so they cannot carry different links.
 */
export function kommunenSeiteUrl(siteUrl: string, ags: string): string {
  const base = `${siteUrl}${KOMMUNEN_PATH}`;
  return Object.hasOwn(landscapePlaces, ags) ? `${base}?gemeinde=${ags}` : base;
}
