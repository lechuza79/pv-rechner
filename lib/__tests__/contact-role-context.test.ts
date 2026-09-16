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
