import {load} from 'cheerio';
import {entwirreAdressen} from './personen-fund';
import {type ContactCandidate} from './contact-evidence';

/** Associate a dedicated department page with its explicit contact widget.
 * General footer contacts and multi-person cards cannot inherit the page role.
 */
export function contactRoleContext(html:string,candidates:ContactCandidate[]){
 const $=load(html);const title=$('title').first().text().replace(/\s+/g,' ').trim();
 const heading=$('h1').first().text().replace(/\s+/g,' ').trim();
 const authority=/(?:^|[\/|–—])\s*((?:Samtgemeinde|Verbandsgemeinde|Amtsverwaltung|Amt|Landkreis|Kreis)\s+[^\/|–—]+)$/iu.exec(title)?.[1]?.trim();
 const department=/^(?:[^:]{0,50}:\s*)?(?:(?:Stabs?stelle|Fachbereich|Fachdienst)\s+)?(?:Energie[- &und]+Klimaschutz(?:management|managment)?|Klimaschutz(?:management|managment|manager(?:in)?)?|Energieberatung|Energiemanagement|Presse(?:stelle|arbeit)?(?:[- &und]+Öffentlichkeitsarbeit)?|Öffentlichkeitsarbeit(?:[- /&]+Pressearbeit)?)$/iu.test(heading);
 return {authorityName:authority,candidates:candidates.map(c=>{
   const extra:NonNullable<ContactCandidate['additionalRoleEvidence']>=[];
   $('a').each((_,el)=>{
    const href=$(el).attr('href')??'';
    if(!(href.startsWith('mailto:')&&href.slice(7).split('?')[0].toLowerCase()===c.email.toLowerCase())&&entwirreAdressen($(el).text()).trim().toLowerCase()!==c.email.toLowerCase())return;
    if($(el).closest('footer,nav').length)return;
    const frame=$(el).closest('.frame');
    if(frame.length){
      const wrapper=frame.parents('.frame').last();
      const heading=(wrapper.length?wrapper:frame).prevAll('.frame').find('h2').first().text().trim();
      const readableFrame=frame.clone();readableFrame.find('br').replaceWith(' ');
      const body=readableFrame.text().replace(/\s+/g,' ').trim();
      const addresses=new Set((entwirreAdressen(body).match(/[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g)??[]).map(e=>e.toLowerCase()));
      if(addresses.size===1&&addresses.has(c.email.toLowerCase())&&/^Kontakt (?:zur|zum|mit der) (?:Pressestelle|Klimaschutzmanagement|Energieberatung)$/iu.test(heading))extra.push({text:`${heading} | ${body}`,scope:'local-block',exclusiveAddress:true});
    }
    const card=$(el).closest('.result-list_object, .contact-card, [itemtype*="Person"]');
    if(!card.length||card.closest('footer,header,nav').length)return;
    const addresses=new Set(card.find('a[href^="mailto:"]').map((_,e)=>($(e).attr('href')??'').slice(7).split('?')[0].toLowerCase()).get());
    if(addresses.size!==1)return;
    const names=card.find('.result-list_object-title,[itemprop="name"],h3,h4').map((_,e)=>$(e).text().replace(/: Detailseite/g,'').trim()).get();
    if(new Set(names).size!==1)return;
    const cardText=card.text().replace(/\s+/g,' ').trim();
    const widget=card.closest('.widget,section');const label=widget.find('h2,h3').first().text().trim();
    if(department&&/^(?:Kontakt|Ansprechpartner(?:in)?|Ihre? Ansprechpartner(?:in)?)$/iu.test(label))extra.push({text:`${heading} | ${title} | ${cardText}`,scope:'local-block',exclusiveAddress:true});
   });
   return extra.length?{...c,additionalRoleEvidence:[...(c.additionalRoleEvidence??[]),...extra]}:c;
 })};
}
