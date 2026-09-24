import {it,expect} from 'vitest';
import {compareContactSelection as compare} from '../contact-selection-comparison';
it('calls losing a proven personal contact worse even when there are more new addresses',()=>{expect(compare(['person@a.de'],['presse@a.de','klima@a.de'],['person@a.de','presse@a.de','klima@a.de'],true).verdict).toBe('worse');});
it('does not call unselected old addresses incorrect or gains proof of whole-case superiority',()=>{expect(compare(['old@a.de'],['new@a.de'],['new@a.de'],true)).toMatchObject({verdict:'unresolved',lost:[],unresolvedBaseline:['old@a.de']});});
it('compares retained contacts and real gains with the same evidence standard',()=>{expect(compare(['old@a.de'],['old@a.de','new@a.de'],['old@a.de','new@a.de'],true)).toMatchObject({verdict:'better',gained:['new@a.de'],retained:['old@a.de'],lost:[]});});
it('cannot approve an incomplete case or an unsupported selection',()=>{expect(compare([],['new@a.de'],['new@a.de'],false).verdict).toBe('unresolved');expect(compare([],['new@a.de'],[],true).verdict).toBe('unresolved');});

it('resolves a specifically disproven baseline contact without inventing a positive contact',()=>{expect(compare(['privacy@a.de'],[],[],true,['privacy@a.de'])).toMatchObject({verdict:'equivalent',rejectedBaseline:['privacy@a.de'],unresolvedBaseline:[],gained:[],lost:[]});});
it('keeps missing positive evidence open unless an explicit rejection exists',()=>{expect(compare(['unknown@a.de','privacy@a.de'],[],[],true,['privacy@a.de'])).toMatchObject({verdict:'unresolved',unresolvedBaseline:['unknown@a.de'],rejectedBaseline:['privacy@a.de']});});
it('keeps contradictory positive and negative judgments unresolved',()=>{expect(compare(['old@a.de'],['old@a.de','new@a.de'],['old@a.de','new@a.de'],true,['old@a.de'])).toMatchObject({verdict:'unresolved',conflictingJudgments:['old@a.de'],retained:[],unresolvedBaseline:['old@a.de']});});
it('does not permit a proven rejected contact in the new selection',()=>{expect(compare([],['privacy@a.de'],[],true,['privacy@a.de'])).toMatchObject({verdict:'unresolved',rejectedSelected:['privacy@a.de'],unsupportedSelected:['privacy@a.de']});});
it('removes stale gains and losses from current proof counts independently of completeness',()=>{expect(compare(['old@a.de'],['new@a.de'],['old@a.de','new@a.de'],true,[],false)).toMatchObject({verdict:'unresolved',current:false,retained:[],gained:[],lost:[],unresolvedBaseline:['old@a.de']});});
it('retains current proof counts even when broader research remains incomplete',()=>{expect(compare([],['new@a.de'],['new@a.de'],false,[],true)).toMatchObject({verdict:'unresolved',current:true,gained:['new@a.de']});});

import {storedMunicipalSelection,explicitContactExclusions} from '../contact-selection-comparison';
it('distinguishes saved recipients from the complete old candidate pool',()=>{expect(storedMunicipalSelection({kommunen:[{region_id:'1',rollen_email:'Press@a.de',personen_email:'person@a.de',email:null}]},'1')).toEqual(['press@a.de','person@a.de']);expect(storedMunicipalSelection({kommunen:[]},'1')).toBeNull();});
const excludedEvidence={originalSupported:true,functionSupported:false,reasons:['excluded-or-conflicting-purpose','explicit-role-evidence-required'],evidence:'Datenschutzbeauftragte Anna Muster kontakt@a.de',sourceUrl:'https://a.de/kontakt',sourceDigest:'original'};
it('requires explicit current exclusive source evidence for a negative judgment',()=>{
 expect(explicitContactExclusions([{email:'kontakt@a.de',evidence:[excludedEvidence]}])).toHaveLength(1);
 for(const reason of ['contact-card-not-exclusive','original-integrity-failed','source-authority-unconfirmed','held-contact','historical-or-negated-function'])expect(explicitContactExclusions([{email:'kontakt@a.de',evidence:[{...excludedEvidence,reasons:[...excludedEvidence.reasons,reason]}]}])).toEqual([]);
 expect(explicitContactExclusions([{email:'kontakt@a.de',evidence:[{...excludedEvidence,evidence:'E-Mail kontakt@a.de'}]}])).toEqual([]);
});
it('does not reject a person with both privacy and climate responsibilities',()=>{expect(explicitContactExclusions([{email:'kontakt@a.de',evidence:[excludedEvidence,{...excludedEvidence,evidence:'Klimaschutzmanagement Anna Muster kontakt@a.de'}]}])).toEqual([]);});

import {historicalMunicipalRecipients} from '../contact-selection-comparison';
it('does not invent original delivery from the currently saved mailbox',()=>{expect(historicalMunicipalRecipients({targets:[{organizationId:'1',currentMailbox:'now@a.de'}]},'1')).toEqual({emails:[],status:'original-recipient-unknown'});});
it('accepts only a reviewed historical recipient backed by its literal original',()=>{
 const snapshot={targets:[{organizationId:'1'}],sources:[{id:'mail',kind:'mail',text:'An: original@a.de'}],recipients:[{organizationId:'1',sourceId:'mail',mailbox:'original@a.de',quote:'An: original@a.de',reviewedBy:'Reviewer',reviewedAt:'2026-09-14T10:00:00Z'}]};
 expect(historicalMunicipalRecipients(snapshot,'1')).toEqual({emails:['original@a.de'],status:'quoted-recipient-history'});snapshot.sources[0].text='An: other@a.de';expect(()=>historicalMunicipalRecipients(snapshot,'1')).toThrow('quotation');
});

it('does not call an added general backup mailbox a better specialist selection',()=>{expect(compare(['webmaster@a.de'],['webmaster@a.de','info@a.de'],['webmaster@a.de','info@a.de'],true,[],true,[])).toMatchObject({verdict:'equivalent',gained:['info@a.de']});expect(compare(['presse@a.de'],['presse@a.de','klima@a.de'],['presse@a.de','klima@a.de'],true,[],true,['presse@a.de','klima@a.de']).verdict).toBe('better');});

it('retains shared-authority candidates but does not count unproven municipal coverage as a gain',()=>{
 const result=compare(['old@town.de'],['old@town.de','press@authority.de'],['old@town.de','press@authority.de'],true,[],true,['press@authority.de'],['press@authority.de']);
 expect(result).toMatchObject({verdict:'unresolved',retained:['old@town.de'],gained:[],unsupportedSelected:['press@authority.de']});
 expect(compare(['old@town.de'],['old@town.de','press@authority.de'],['old@town.de','press@authority.de'],true,[],true,['press@authority.de'],[]).verdict).toBe('better');
});
