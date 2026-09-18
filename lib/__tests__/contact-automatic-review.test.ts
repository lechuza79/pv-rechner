import {describe,it,expect} from 'vitest';
import {checkAutomaticContact} from '../contact-automatic-review';
import type {ContactCandidate} from '../contact-evidence';
const source={url:'https://town.example/kontakt',digest:'original',observedAt:'2026-09-16T10:00:00Z',valid:true,readable:true};
const context={name:'Town',domain:'town.example',asOf:'2026-09-16T12:00:00Z',heldEmails:[]};
const candidate:ContactCandidate={email:'presse@town.example',sourceUrl:source.url,context:'',relation:'same-domain',purpose:'press',roleEvidence:{text:'Stadt Town Pressestelle presse@town.example',scope:'local-block',exclusiveAddress:true}};
describe('Automatic source-bound contact checks',()=>{
 it('supports an explicit municipal function but never approves sending',()=>{expect(checkAutomaticContact(candidate,source,context)).toMatchObject({originalSupported:true,functionSupported:true,sendApproved:false});});
 it('does not confuse mailbox domain with source authority',()=>{expect(checkAutomaticContact(candidate,{...source,url:'https://foreign.example/contact'},context).functionSupported).toBe(false);});
 it('does not assign the other persons role to the only mailbox',()=>{expect(checkAutomaticContact({...candidate,email:'max@town.example',roleEvidence:{...candidate.roleEvidence!,text:'Stadt Town Klimaschutz Anna Müller; Hausmeister Max Schulz max@town.example'}},source,context).functionSupported).toBe(false);});
 it('requires the municipality itself, not a shared authority or a neighbouring town',()=>{for(const text of ['Gemeinde Elsewhere Pressestelle presse@town.example','Amt Example für Gemeinde Town Pressestelle presse@town.example'])expect(checkAutomaticContact({...candidate,roleEvidence:{...candidate.roleEvidence!,text}},source,context).functionSupported).toBe(false);});
 it('uses an explicit municipal page heading only without a conflicting card scope',()=>{const noName={...candidate,roleEvidence:{...candidate.roleEvidence!,text:'Pressestelle presse@town.example'}};expect(checkAutomaticContact(noName,{...source,identityText:'Stadt Town - Presse'},context).functionSupported).toBe(true);expect(checkAutomaticContact({...candidate,roleEvidence:{...candidate.roleEvidence!,text:'Gemeinde Elsewhere Pressestelle presse@town.example'}},{...source,identityText:'Stadt Town - Presse'},context).functionSupported).toBe(false);expect(checkAutomaticContact(noName,{...source,identityText:'Amt Example - Gemeinde Town'},context).functionSupported).toBe(false);});
 it('rejects multiple municipalities in a page heading but permits repeated own headings',()=>{const c={...candidate,roleEvidence:{...candidate.roleEvidence!,text:'Pressestelle presse@town.example'}};expect(checkAutomaticContact(c,{...source,identityText:'Stadt Town - Partnerschaft mit Stadt Elsewhere'},context).functionSupported).toBe(false);expect(checkAutomaticContact(c,{...source,identityText:'stadt town - presse stadt town'},context).functionSupported).toBe(true);});
 it('checks later cards on the same page for withdrawal and scope conflicts',()=>{for(const text of ['Nicht mehr zuständig: presse@town.example','Gemeinde Elsewhere Pressestelle presse@town.example','Datenschutzbeauftragter presse@town.example'])expect(checkAutomaticContact({...candidate,additionalRoleEvidence:[{text,scope:'local-block',exclusiveAddress:true}]},source,context).functionSupported).toBe(false);});
 it('rejects invalid audit timestamps',()=>{expect(checkAutomaticContact(candidate,source,{...context,asOf:'invalid'}).functionSupported).toBe(false);});
 it('rejects explicit negation or former responsibilities',()=>{expect(checkAutomaticContact({...candidate,roleEvidence:{...candidate.roleEvidence!,text:'Stadt Town ehemalige Pressestelle presse@town.example'}},source,context).functionSupported).toBe(false);});
 it('rejects old article context even with a current capture timestamp',()=>{expect(checkAutomaticContact(candidate,{...source,url:'https://town.example/news/2019/presse'},context).functionSupported).toBe(false);});
 it('rejects address conflicts, held contacts, error pages and changed originals',()=>{
  expect(checkAutomaticContact({...candidate,sourceConflicts:[{kind:'mail-link-label-mismatch',linked:candidate.email,displayed:'wrong@town.example'}]},source,context).originalSupported).toBe(false);
  expect(checkAutomaticContact(candidate,source,{...context,heldEmails:[candidate.email]}).functionSupported).toBe(false);
  for(const change of [{valid:false},{readable:false}])expect(checkAutomaticContact(candidate,{...source,...change},context).originalSupported).toBe(false);
 });
 it('accepts named personal climate and press contacts without mailbox-name requirements',()=>{
  for(const [email,text,channel] of [['anna.mueller@town.example','Stadt Town Klimaschutzmanagerin Anna Müller','energy'],['max.schulz@town.example','Stadt Town Pressestelle Max Schulz','publishing']]){
   expect(checkAutomaticContact({...candidate,email,roleEvidence:{...candidate.roleEvidence!,text}},source,context)).toMatchObject({functionSupported:true,channel});
  }
 });
 it('keeps both responsibilities when the same person explicitly holds them',()=>{
  expect(checkAutomaticContact({...candidate,email:'anna.mueller@town.example',roleEvidence:{...candidate.roleEvidence!,text:'Stadt Town Klimaschutzmanagement und Öffentlichkeitsarbeit Anna Müller'}},source,context).channels).toEqual(['energy','publishing']);
 });
 it('retains a proven shared-authority contact without pretending every member municipality is covered',()=>{
  const result=checkAutomaticContact({...candidate,email:'anna.mueller@town.example',roleEvidence:{...candidate.roleEvidence!,text:'Samtgemeinde Example Klimaschutzmanagement Anna Müller'}},{...source,authorityName:'Samtgemeinde Example',identityText:'Energie- und Klimaschutzmanagement / Samtgemeinde Example'},context);
  expect(result).toMatchObject({functionSupported:true,responsibilityScope:'shared-authority',organizationName:'Samtgemeinde Example',municipalityCoverageConfirmed:false});
 });
 it('does not use the function word inside an address as independent responsibility evidence',()=>{
  expect(checkAutomaticContact({...candidate,roleEvidence:{...candidate.roleEvidence!,text:'Stadt Town presse@town.example'}},source,context).functionSupported).toBe(false);
 });

});
