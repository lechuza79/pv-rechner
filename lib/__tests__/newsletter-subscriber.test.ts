import {describe,it,expect,beforeEach} from 'vitest';
import {assertSubscriber,subscriberMailProblems,subscriberHeaders} from '../newsletter-subscriber';
import {abmeldeLink,einstellungenLink} from '../abo-token';
import type {GemeindeAbo} from '../gemeinde-abo';
const abo={id:'example-id',regionId:'03151017',email:'reader@example.org',status:'bestaetigt',quelle:'gemeinde',ausVerwaltung:true} as GemeindeAbo;
const base={an:abo.email,betreff:'Meinersen: September 2026',text:'text',html:'',newsletter:{campaign:'september-2026' as const,variant:'kommunal' as const},abo:{id:abo.id,regionId:abo.regionId},bezug:[abo.regionId]};
beforeEach(()=>{process.env.ABO_HMAC_SECRET='test-secret-long-enough';});
describe('subscriber newsletter safety',()=>{
 it('requires the exact confirmed regional subscription',()=>{
  expect(()=>assertSubscriber(base,[abo])).not.toThrow();
  for(const change of [{status:'abgemeldet'},{quelle:'foerderung'},{email:'another@example.org'},{regionId:'03151018'},{ausVerwaltung:false}])expect(()=>assertSubscriber(base,[{...abo,...change} as GemeindeAbo])).toThrow();
  expect(()=>assertSubscriber(base,[])).toThrow();
 });
 it('requires signed links in HTML and plain text and rejects preview content',()=>{
  const links=[abmeldeLink('https://solar-check.io',abo.id),einstellungenLink('https://solar-check.io',abo.id)];
  const expected={abmeldeUrl:links[0],einstellungenUrl:links[1]};
  const mail={...base,text:links.join(' '),html:'Diese E-Mail bekommen Sie, weil Sie abonniert haben. <a href="https://solar-check.io/impressum">Impressum</a><a href="https://solar-check.io/datenschutz">Datenschutz</a>'+links.map(href=>`<a href="${href}">Link</a>`).join('')};
  expect(subscriberMailProblems(mail,expected)).toEqual([]);
  expect(subscriberMailProblems({...mail,text:''},expected).length).toBeGreaterThan(0);
  expect(subscriberMailProblems({...mail,betreff:'[TEST] September'},expected).length).toBeGreaterThan(0);
  expect(subscriberMailProblems({...mail,text:mail.text.replace(links[0],'wrong')},expected).length).toBeGreaterThan(0);
  expect(subscriberHeaders(expected)['List-Unsubscribe']).toBe('<'+links[0]+'>');
 });
});
