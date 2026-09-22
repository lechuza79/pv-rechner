import {it,expect} from 'vitest';
import {addFundingStories,type FundingRow,type FundingChange} from '../story-funding-discovery';
import {discoverStories} from '../story-discovery';
const programme:FundingRow={id:'local',archived:false,last_verified:'2026-09-10',source_url:'https://example.org',data:{name:'Programm',level:'kommune',agsCode:'12345678',status:'aktiv'}};
const change:FundingChange={id:1,program_id:'local',observed_at:'2026-09-10',feld:'rates',bedeutung:'inhalt',alt:'100 €',neu:'200 €',quelle:'https://example.org',belegt_am:'2026-09-10'};
it('excludes catalogue additions, internal edits and confirmations predating changes',()=>{
 for(const override of [{feld:'aufnahme'},{bedeutung:'intern'},{belegt_am:'2026-09-09'},{belegt_am:null}]){const r=discoverStories({name:'Test',regionId:'12345678',source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});addFundingStories(r,[programme],[{...change,...override}]);expect(r.candidates).toHaveLength(0);}
});
it('maps a confirmed change to its municipality, not every municipality',()=>{
 for(const id of ['12345678','87654321']){const r=discoverStories({name:'Test',regionId:id,source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});addFundingStories(r,[programme],[change]);expect(r.candidates.length).toBe(id==='12345678'?1:0);}
});

const report=(regionId='12345678')=>discoverStories({name:'Test',regionId,source:'export',sourceDate:'2026-09-10',completeExport:true,rows:[]});
const confirmed:FundingRow={...programme,data:{...programme.data,verified:true,rates:[{label:'Balkonkraftwerk',value:'50 % der Kosten, max. 200 €',nur:['balkon']}],conditions:[{text:'Hauptwohnsitz genügt',nur:['balkon']},'Antrag binnen vier Wochen nach Inbetriebnahme']}};
it('supports the real landkreis level without granting its programme to a neighbouring independent city',()=>{
 const county:FundingRow={...confirmed,id:'trier-saarburg',data:{...confirmed.data,level:'landkreis',agsCode:'07235'}};
 for(const regionId of ['07235001','07211000','07335001']) {
  const r=report(regionId);addFundingStories(r,[county],[]);
  expect(r.candidates.filter(c=>c.family==='Förderbestand').length).toBe(regionId==='07235001'?1:0);
 }
});
it('preserves original strings and technology scopes rather than parsing money into invented chart values',()=>{
 const r=report();addFundingStories(r,[confirmed],[]);
 const c=r.candidates[0];expect(c.family).toBe('Förderbestand');expect(c.evidence).toEqual([]);
 expect(c.details).toContainEqual({label:'Balkonkraftwerk',text:'50 % der Kosten, max. 200 €'});
 expect(c.details).toContainEqual({label:'Bedingung · Balkonkraftwerk',text:'Hauptwohnsitz genügt'});
 expect(c.provenance).toEqual([{label:'Programmquelle, zuletzt bestätigt',date:'2026-09-10',url:'https://example.org'}]);
});
it('does not label a changed or unverified source as a current programme snapshot',()=>{
 for(const override of [{last_verified:null},{last_verified:'2026-02-30'},{source_url:null},{page_changed_at:'2026-09-11T08:19:34Z'},{page_changed_at:'not-a-date'},{data:{...confirmed.data,verified:false}},{data:{...confirmed.data,status:'unsicher'}}]) {
  const r=report();addFundingStories(r,[{...confirmed,...override}],[]);expect(r.candidates).toHaveLength(0);expect(r.checks.find(c=>c.family==='Förderbestand')?.status).toBe('missing');
 }
});
it('retains dated historic changes when a newer page change suspends the current snapshot',()=>{
 const r=report();addFundingStories(r,[{...confirmed,page_changed_at:'2026-09-11T08:19:34Z'}],[change]);
 expect(r.candidates.map(c=>c.family)).toEqual(['Förderänderung']);
});
it('uses the funding verification date independently of the older register export',()=>{
 const r=report();addFundingStories(r,[{...confirmed,last_verified:'2026-09-11',page_changed_at:'2026-09-09T09:00:00Z'}],[]);
 expect(r.candidates[0].period).toBe('2026-09-11');expect(r.candidates[0].provenance?.[0].date).toBe('2026-09-11');
});
it('does not turn an exhausted programme into an active offer',()=>{
 const r=report();addFundingStories(r,[{...confirmed,data:{...confirmed.data,status:'ausgeschoepft'}}],[]);
 expect(r.candidates[0].title).toContain('Mittel ausgeschöpft');
});
