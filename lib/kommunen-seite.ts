/** Approved public identity; place selection only changes the visual example. */
export const KOMMUNEN_PATH = '/fuer-organisationen/kommunen';
export const KOMMUNEN_TITLE = 'Energiemonitor, Energie-Checks & Datenstories für Kommunen | Solar Check';
export const KOMMUNEN_DESCRIPTION = 'Energiedaten verständlich machen: Energiemonitor, Energie-Checks und Datenstories für Städte, Gemeinden und Landkreise. Entdecken Sie den Kommunen-Pilot von Solar Check.';


/** Head metadata is generated with the approved composition, not at request time. */
export function kommunenMetadata(): string {
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const url = `https://solar-check.io${KOMMUNEN_PATH}`;
  return `<title>${escape(KOMMUNEN_TITLE)}</title><meta name="description" content="${escape(KOMMUNEN_DESCRIPTION)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:title" content="${escape(KOMMUNEN_TITLE)}"><meta property="og:description" content="${escape(KOMMUNEN_DESCRIPTION)}"><meta property="og:url" content="${url}">`;
}
