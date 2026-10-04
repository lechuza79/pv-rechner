import DataSourcesSection from '../../../components/DataSourcesSection';
import {siteFussHtml} from '../../../lib/site-fuss';
/** Preview adapter: render the real breadcrumb and consume the shared editorial classes. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomepageToolCards from '../../../components/HomepageToolCards';
import PersonBox from '../../../components/PersonBox';
import GemeindeAbschnittNav from '../../../components/gemeinde/GemeindeAbschnittNav';
import Breadcrumb from '../../../components/Breadcrumb';
import foundation from '../../../components/social/atlas-foundations.module.css';
import editorial from '../../../components/EditorialContent.module.css';

export function renderSharedParts(html: string): string {
  return html
    .replace('<!-- SHARED_FOOTER -->',siteFussHtml(html.includes('data-calculator-layout="scroll"') ? renderToStaticMarkup(<DataSourcesSection id="landscape-sources"><div id="landscape-sources-content" /></DataSourcesSection>) : ''))
    .replace('<!-- MUNICIPAL_SECTION_NAV -->',renderToStaticMarkup(<GemeindeAbschnittNav actions={false} subscribable={false} theme="light" links={[{href:'#moeglichkeiten',label:'Überblick'},{href:'#dashboard-section',label:'Energiemonitor'},{href:'#calculators-section',label:'Checks & Rechner'},{href:'#stories-section',label:'Datenstories'},{href:'#mitgestalten',label:'Kontakt'}]}/>))
    .replace('<!-- SHARED_TOOLS -->', renderToStaticMarkup(<HomepageToolCards audience="municipal" compact={html.includes('data-calculator-layout="scroll"')}/>))
    .replaceAll('{{monitorFoundation}}', foundation.foundation)
    .replace('<!-- SHARED_PERSON -->', renderToStaticMarkup(<PersonBox text={<>Was passt zu Ihrer Kommune? <strong>Lassen Sie uns gemeinsam schauen.</strong> Schreiben Sie mir, welche Inhalte Sie für Ihre Website oder Öffentlichkeitsarbeit brauchen.</>} knopf="Kontakt aufnehmen" reassurance="Umfang und mögliche Kosten stimmen wir vorab gemeinsam ab." kontaktHref="https://solar-check.io/kontakt?topic=Kooperation%20%2F%20Partnerschaft&message=Ich%20interessiere%20mich%20f%C3%BCr%20einen%20Kommunen-Pilot.%0A%0AKommune%3A%20%0AGeplanter%20Einsatz%3A%20" />))
    .replace(/\{\{(card|h2|h3|p|label)\}\}/g, (_,key) => editorial[key as keyof typeof editorial])
    .replace('<!-- SHARED_BREADCRUMB -->', renderToStaticMarkup(<Breadcrumb items={[{label:'Startseite',href:'/'},{label:'Für Kommunen'}]} />))
    .replace(/<a data-shared-action="(primary|secondary|link)" href="([^"]*)">([^<]*)<\/a>/g, (_,kind,href,label) => renderToStaticMarkup(
      <a className={kind === 'primary' ? editorial.ctaButton : kind === 'secondary' ? editorial.ctaSecondary : editorial.link} href={href.replaceAll('&amp;', '&')}>{label}</a>
    ));
}

export { NEON_KOPF_INNEN, NEON_NAV_SKRIPT } from "../../../lib/neon-unterseite";

export {ladeGemeindePaket} from '../../../lib/gemeinde-paket-server';

export {districtGeometry} from '../../../lib/district-geometry';

export { ANALYTICS_HTML, NAV_TOKENS_HTML } from '../../../lib/neon-seite';
