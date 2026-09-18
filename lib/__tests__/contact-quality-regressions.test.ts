import { expect, it } from 'vitest';
import { contactCandidates } from '../contact-evidence';
import { assessContacts } from '../contact-quality';
const source = (html:string, path='/kontakt') => contactCandidates(html, `https://beispiel.de${path}`, 'beispiel.de');
it('keeps DOM address boundaries without trimming valid domains',()=>{
 const c=source('<div><a href="mailto:anna@beispiel.de">anna@beispiel.de</a><span>Homepage</span><span>bert@beispiel.de</span><b>Aufgaben</b><p>info@beispiel.de-mail.de</p><p>x@design.studio</p><p><span>split</span>@beispiel.de</p></div>');
 expect(c.map(x=>x.email).sort()).toEqual(['anna@beispiel.de','bert@beispiel.de','info@beispiel.de-mail.de','split@beispiel.de','x@design.studio'].sort());
});
it('recognizes publication work independently of job title',()=>{
 const c=source('<section>Friedhofsverwaltung, Amtsblatt, Hauptamt nadine@beispiel.de</section><section>Telefonzentrale, Betreuung Homepage katrin@beispiel.de</section>');
 expect(assessContacts(c,'kommunen').every(x=>x.suitability==='role-indicated')).toBe(true);
});
it('does not equate a nature-conservation assignment with solar responsibility',()=>{
 const c=source('<section>Dr. C. Biodiversität, Natur- und Artenschutz, Nachhaltigkeit Amt / Bereich Umwelt- und Klimaschutz c@beispiel.de</section>');
 expect(assessContacts(c,'kommunen')[0].suitability).toBe('needs-review');
});
it('does not promote an old event by its mailbox name',()=>{
 const c=source('<section>Klimaschutzmanager Solar-Beratung klimaschutz@beispiel.de</section>','/meldungen/2020/solar');
 expect(assessContacts(c,'kommunen',{asOf:'2026-09-15'})[0].suitability).toBe('needs-review');
 const current=source('<section>Klimaschutzmanager klimaschutz@beispiel.de</section>');
 expect(assessContacts([...c,...current],'kommunen',{asOf:'2026-09-15'})[0].suitability).toBe('role-indicated');
});
it('keeps event registration separate from municipal responsibility',()=>{
 const c=source('<section>Markt der Nachhaltigkeit. Formular für die Anmeldung per E-Mail an aktionstage@beispiel.de</section>');
 expect(assessContacts(c,'kommunen')[0].suitability).toBe('needs-review');
});
it('attributes a municipal contact only from an owned source and matching named authority',()=>{
 const c=source('<section>Gemeinde Beispiel Friedrich Muster Bürgermeister E-Mail: bgm@amt-region.de</section>');
 const opts={organizationName:'Beispiel',organizationDomain:'beispiel.de'};
 expect(assessContacts(c,'kommunen',opts)[0]).toMatchObject({attribution:'official-source',suitability:'general-fallback'});
 expect(assessContacts(c,'kommunen',{...opts,organizationName:'Nachbarort'})[0].attribution).toBe('unconfirmed');
 expect(assessContacts(c.map(x=>({...x,sourceUrl:'https://agentur.de/kontakt'})),'kommunen',opts)[0].attribution).toBe('unconfirmed');
});

it('reads article age from structured metadata, not a current footer year',()=>{
 const c=source('<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2020-03-08T00:00:00+0100"}</script><section>Klimaschutzmanager klimaschutz@beispiel.de</section><footer>2026</footer>','/news/1/solaranlagen.html');
 expect(c[0].publishedAt).toContain('2020');
 expect(assessContacts(c,'kommunen',{asOf:'2026-09-15'})[0].suitability).toBe('needs-review');
});
it('requires more than the broad sustainability label',()=>{
 expect(assessContacts(source('<section>Stabsstelle Wirtschaftsförderung und Nachhaltigkeit marc@beispiel.de</section>'),'kommunen')[0].suitability).toBe('needs-review');
});
