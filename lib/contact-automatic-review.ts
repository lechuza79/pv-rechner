import {sameDomain, type ContactCandidate} from './contact-evidence';
import {evidenceLimitations} from './contact-quality-evidence';

export type AutomaticSource = {url:string; digest:string; observedAt:string; valid:boolean; readable:boolean; identityText?:string; authorityName?:string};
export type AutomaticContext = {name:string; domain:string; asOf:string; heldEmails:string[]};
const normalized=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
/** A source-confirmed mailbox is not automatically a role or an exhaustive search. */
export function checkAutomaticContact(c:ContactCandidate,s:AutomaticSource,ctx:AutomaticContext){
  const reasons:string[]=[];
  const email=c.email.toLowerCase();
  const blocks=[c.roleEvidence,...(c.additionalRoleEvidence??[])].filter(e=>e?.exclusiveAddress).map(e=>e!.text);
  const withoutAddresses=(text:string)=>text.replace(/[\w.+%-]+\s*(?:@|\(at\)|\[at\])\s*[\w.-]+/giu,'');
  const hasRole=(text:string)=>/pressestelle|pressereferat|pressearbeit|pressekontakt|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|klimaschutzmanagement|klimaschutzmanagment|klimaschutzmanager|klimaschutzstelle|energieberatung|energiemanagement|energie[- &und]+klimaschutz/iu.test(withoutAddresses(text));
  const block=blocks.find(hasRole)??c.roleEvidence?.text??'';
  const otherBlocks=(c.additionalRoleEvidence??[]).filter(e=>e.exclusiveAddress).map(e=>e.text);
  const negativeContext=[block,...otherBlocks].join(' ');
  let sourceOwned=false;
  try{sourceOwned=sameDomain(new URL(s.url).hostname.replace(/^www\./,''),ctx.domain.replace(/^www\./,''));}catch{/* Invalid URL remains unproven. */}
  const mailboxOwned=sameDomain(email.split('@')[1]??'',ctx.domain.replace(/^www\./,''));
  if(!s.valid)reasons.push('original-integrity-failed');
  if(!s.readable)reasons.push('source-not-readable');
  if(!Number.isFinite(Date.parse(ctx.asOf))||!Number.isFinite(Date.parse(s.observedAt))||Date.parse(s.observedAt)>Date.parse(ctx.asOf))reasons.push('invalid-observation-time');
  if(!sourceOwned)reasons.push('source-authority-unconfirmed');
  if(c.sourceUrl!==s.url)reasons.push('candidate-source-mismatch');
  if(!mailboxOwned)reasons.push('mailbox-authority-unconfirmed');
  if(c.sourceConflicts?.length)reasons.push('published-address-conflict');
  if(ctx.heldEmails.map(normalized).includes(email))reasons.push('held-contact');
  reasons.push(...evidenceLimitations(block,s.url,{asOf:ctx.asOf},c.publishedAt));
  if(/nicht (?:mehr )?zuständig|nicht mehr erreichbar|kontakt.*(?:entfällt|aufgehoben)/iu.test(negativeContext))reasons.push('explicit-role-withdrawal');
  if(/ehemalig|nicht zuständig|nicht mehr|außer dienst|a\.\s?d\.|archiv/iu.test(block))reasons.push('historical-or-negated-function');
  if(c.purpose==='excluded'||/datenschutzbeauftrag|technische umsetzung|webdesign|dienstleister|agentur|anzeigenverkauf|gastredner|partnerstadt/iu.test(negativeContext))reasons.push('excluded-or-conflicting-purpose');
  // A narrow, explicit municipal function card can be checked without guessing
  // the owner of a personal mailbox from nearby colleagues' responsibilities.
  const escaped=normalized(ctx.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const identityPattern=new RegExp(`\\b(?:stadt|gemeinde) ${escaped}(?=$|[\\s,.;:()])`,'u');
  const cardNames=(block.match(/\b(?:stadt|gemeinde)\s+/giu)??[]).length;
  const pageScope=normalized(s.identityText??'').replace(new RegExp(identityPattern.source,'gu'),'');
  const unambiguousPage=!/\b(?:stadt|gemeinde)\s+/iu.test(pageScope);
  const municipalScopeExplicit=cardNames===1?identityPattern.test(normalized(block)):cardNames===0&&unambiguousPage&&identityPattern.test(normalized(s.identityText??''));
  if(otherBlocks.some(text=>/\b(?:stadt|gemeinde)\s+/iu.test(normalized(text).replace(new RegExp(identityPattern.source,'gu'),''))))reasons.push('conflicting-municipal-scope');
  const sharedAuthority=s.authorityName;
  const scopeExplicit=municipalScopeExplicit||!!sharedAuthority;
  if(!scopeExplicit)reasons.push('municipal-scope-not-explicit-in-contact-card');
  if(!blocks.includes(block))reasons.push('contact-card-not-exclusive');
  // Responsibilities come from published text, never from mailbox spelling.
  const roleText=withoutAddresses(block);
  const press=/(?<!\p{L})(?:pressestelle|pressereferat|pressearbeit|pressekontakt|presse[- &und]+öffentlichkeitsarbeit|öffentlichkeitsarbeit|oeffentlichkeitsarbeit)(?!\p{L})/iu.test(roleText);
  const energy=/\b(?:klimaschutzmanagement|klimaschutzmanagment|klimaschutzmanager(?:in)?|klimaschutzstelle|energieberatung|energiemanagement|energie[- &und]+klimaschutz(?:management|managment)?)\b/iu.test(roleText);
  const channels=[...(energy?['energy']:[]),...(press?['publishing']:[])];
  const channel=channels[0]??null;
  if(!channel)reasons.push('explicit-role-evidence-required');
  if(/hausmeister|hausverwaltung|gebäudereinigung/iu.test(roleText))reasons.push('conflicting-person-responsibility');
  if(/\b(?:kreis|amt|verbandsgemeinde|samtgemeinde)\b/iu.test(negativeContext+' '+(s.identityText??''))&&!sharedAuthority)reasons.push('shared-authority-scope-needs-review');
  const originalSupported=s.valid&&s.readable&&!c.sourceConflicts?.length;
  return {email,sourceUrl:s.url,sourceDigest:s.digest,observedAt:s.observedAt,originalSupported,
    functionSupported:reasons.length===0,channel:reasons.length===0?channel:null,channels:reasons.length===0?channels:[],
    responsibilityScope:sharedAuthority?'shared-authority':'municipality',organizationName:sharedAuthority??ctx.name,municipalityCoverageConfirmed:municipalScopeExplicit&&!sharedAuthority,
    reasons:[...new Set(reasons)],evidence:block,reviewerType:'local-evidence-rules' as const,sendApproved:false};
}
