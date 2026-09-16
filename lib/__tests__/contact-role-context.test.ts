import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {contactCandidates} from '../contact-evidence';
import {contactRoleContext} from '../contact-role-context';
import {checkAutomaticContact} from '../contact-automatic-review';
const html=readFileSync(new URL('./fixtures/meinersen-department-contact.html',import.meta.url),'utf8');
const url='https://www.sg-meinersen.de/Samtgemeinde/Umwelt-Klima-und-Artenschutz/Energie-Klimaschutzmanagement/';
function review(input:string){const candidates=contactCandidates(input,url,'sg-meinersen.de');const enriched=contactRoleContext(input,candidates);return enriched.candidates.map(c=>checkAutomaticContact(c,{url,digest:'test',observedAt:'2026-09-16T10:00:00Z',valid:true,readable:true,identityText:'Energie- & Klimaschutzmanagment / Samtgemeinde Meinersen',authorityName:enriched.authorityName},{name:'Meinersen',domain:'sg-meinersen.de',asOf:'2026-09-16T12:00:00Z',heldEmails:[]}));}
describe('Published department contact context',()=>{
 it('retains the actual named Meinersen contact from the original department widget',()=>{expect(review(html).find(c=>c.email==='eduard.bayer@sg-meinersen.de')).toMatchObject({functionSupported:true,channel:'energy',organizationName:'Samtgemeinde Meinersen',municipalityCoverageConfirmed:false});});
 it('does not give the same person a role on a general page',()=>{expect(review(html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/,'<h1>Aktuelle Nachrichten</h1>')).every(c=>!c.functionSupported)).toBe(true);});
 it('does not inherit the subject into a general footer contact',()=>{expect(review(html.replace('<body>','<body><footer>').replace('</body>','</footer></body>')).every(c=>!c.functionSupported)).toBe(true);});
});
it('retains both named press contacts alongside the functional mailbox from the Northeim sidebar',()=>{
 const doc=readFileSync(new URL('./fixtures/northeim-press-contacts.html',import.meta.url),'utf8');
 const url='https://www.northeim.de/rat-verwaltung/amtsblatt-presse-vergaben.html';
 const ctx=contactRoleContext(doc,contactCandidates(doc,url,'northeim.de'));
 const selected=ctx.candidates.map(c=>checkAutomaticContact(c,{url,digest:'test',observedAt:'2026-09-16T10:00:00Z',valid:true,readable:true,identityText:'Stadt Northeim'},{name:'Northeim',domain:'northeim.de',asOf:'2026-09-16T12:00:00Z',heldEmails:[]})).filter(c=>c.functionSupported);
 expect(selected.map(c=>c.email).sort()).toEqual(['cvogelbein@northeim.de','moenkemeyer@northeim.de','pressestelle@northeim.de']);
 expect(selected.every(c=>c.channel==='publishing')).toBe(true);
});

it('keeps Meinersen press responsibility alongside its energy contact',()=>{
 const press=readFileSync(new URL('./fixtures/meinersen-press-contact.html',import.meta.url),'utf8');
 const selected=[...review(html),...review(press)].filter(c=>c.functionSupported);
 expect(selected.map(c=>c.email).sort()).toEqual(['eduard.bayer@sg-meinersen.de','presse@sg-meinersen.de']);
 expect(new Set(selected.flatMap(c=>c.channels))).toEqual(new Set(['energy','publishing']));
});


describe('Explicit department label immediately before a contact table',()=>{
 const original=readFileSync(new URL('./fixtures/ebersbach-energy-tables.html',import.meta.url),'utf8');
 const sourceUrl='https://www.ebersbach-neugersdorf.de/buergerverwaltung/verwaltung/ansprechpartner/';
 const enrich=(input:string)=>contactRoleContext(input,contactCandidates(input,sourceUrl,'ebersbach-neugersdorf.de')).candidates;
 const extras=(input:string,email:string)=>enrich(input).find(c=>c.email===email)?.additionalRoleEvidence??[];
 it('retains the dedicated energy role from the original separate table',()=>{
  expect(extras(original,'energiesparkonzept@ebersbach-neugersdorf.de')).toEqual(expect.arrayContaining([expect.objectContaining({scope:'local-block',exclusiveAddress:true,text:expect.stringContaining('Kommunales Energiemanagement')})]));
 });
 it('does not pass the energy label to adjacent tourism or personal contacts',()=>{
  for(const email of ['tourismus','wirtschaftsfoerderung','stefan.halang'])expect(extras(original,email+'@ebersbach-neugersdorf.de')).toEqual([]);
 });
 it('rejects footer and header tables',()=>{
  for(const tag of ['footer','header'])expect(extras(`<${tag}>${original}</${tag}>`,'energiesparkonzept@ebersbach-neugersdorf.de')).toEqual([]);
 });
 it('does not bridge an intervening paragraph or accept a multi-mailbox table',()=>{
  const interrupted=original.replace('Kommunales Energiemanagement</u></p>','Kommunales Energiemanagement</u></p><p>Andere Kontakte</p>');
  expect(extras(interrupted,'energiesparkonzept@ebersbach-neugersdorf.de')).toEqual([]);
  const multiple=original.replace('energiesparkonzept@~@ebersbach-neugersdorf.de</a>','energiesparkonzept@~@ebersbach-neugersdorf.de</a><a href="mailto:other@example.org">other@example.org</a>');
  expect(extras(multiple,'energiesparkonzept@ebersbach-neugersdorf.de')).toEqual([]);
 });
});
