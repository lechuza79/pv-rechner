import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {hash,buildWorkflow,hydrateCase,submitDecision} from '../../scripts/lib/contact-workflow-store';
import {CONTACT_CHECKS,type ContactDecision} from '../contact-workflow';
const now='2026-09-16T10:00:00Z';
function fixture(){
 const root=mkdtempSync(resolve(tmpdir(),'contact-automatic-')),workflow=resolve(root,'workflow'),id='01002000',filename=hash('kommunen:'+id)+'.json';
 for(const d of ['results','sources/'+id,'workflow/reference-review'])mkdirSync(resolve(root,d),{recursive:true});
 const write=(p:string,v:unknown)=>writeFileSync(resolve(root,p),JSON.stringify(v));
 const url='https://town.example/kontakt';const html='<title>Stadt Town</title><h1>Kontakt</h1><p>Stadt Town Pressestelle <a href="mailto:presse@town.example">presse@town.example</a></p>';
 const inputPath=resolve(root,'input.json');write('input.json',{name:'Town',website:'https://town.example',emails:[],urls:[url],heldEmails:[]});
 write('inventory.json',{engine:'frozen',targets:[{dataset:'kommunen',organization_id:id,audit:{inputPath,inputDigest:hash(readFileSync(inputPath))}}]});
 const original=resolve(root,'sources',id,hash(url)+'.html');writeFileSync(original,html);
 write('results/'+filename,{engine:'frozen',organization_id:id,pages:[{url,finalUrl:url,status:'read',observedAt:now,htmlDigest:hash(html)}]});
 const official=resolve(root,'official.txt');writeFileSync(official,'retained official fixture');
 write('workflow/reference-review/official-current-municipal-reference.json',{originalFile:official,originalSha256:hash(readFileSync(official)),regions:[{region_id:id}]});
 write('workflow/reference-review/historical-inventory-mapping.json',[]);
 write('workflow/current-municipal-scope.json',{items:[{currentMunicipalityId:id,inventoryOrganizationId:id,name:'Town'}]});
 const run=(action?:string,extra:string[]=[])=>execFileSync(process.execPath,['--import','tsx',resolve('scripts/contact-automatic-review.ts'),'--source='+root,...(action?['--action='+action]:[]),...extra],{cwd:process.cwd(),timeout:60000,encoding:'utf8'});
 const record=()=>JSON.parse(readFileSync(resolve(workflow,'automatic/records/'+id+'.json'),'utf8'));
 return {root,workflow,id,filename,original,write,run,record};
}
describe('Full local contact evaluation',()=>{
 it('preserves real proof, invalidates changed sources, and records a corrupt source result without aborting',()=>{
  const f=fixture();try{
   f.run();expect(f.record()).toMatchObject({evaluationComplete:true,knownSourceChecksComplete:true,sendApproved:false});expect(f.record().contacts[0].functionSupported).toBe(true);
   writeFileSync(f.original,'changed original');expect(JSON.parse(f.run('summarize')).outdated).toBe(1);
   writeFileSync(resolve(f.root,'results',f.filename),'{');f.run();expect(f.record().evaluationComplete).toBe(false);expect(f.record().researchGaps[0].kind).toBe('evaluation-error');
  }finally{rmSync(f.root,{recursive:true,force:true});}
 },120000);
 it('holds unresolved manual decisions and invalidates newly added holds',()=>{
  const f=fixture();try{
   buildWorkflow(f.root,f.workflow,now);const c=hydrateCase(f.root,JSON.parse(readFileSync(resolve(f.workflow,'cases',f.filename),'utf8')));const proofId=c.proofs[0].id;
   const d:ContactDecision={schema:1,organizationId:f.id,revision:c.revision,reviewer:'fixture',reviewedAt:now,outcome:'unresolved',contacts:[],checks:Object.fromEntries(CONTACT_CHECKS.map(k=>[k,{state:k==='discovery'?'blocked':'passed',reason:'An explicitly documented source remains unavailable',proofIds:[proofId]}])) as ContactDecision['checks']};
   submitDecision(f.workflow,c,d,now);f.run();expect(f.record().knownSourceChecksComplete).toBe(false);expect(f.record().researchGaps.some((g:any)=>g.kind==='reviewed-blocker')).toBe(true);
   mkdirSync(resolve(f.workflow,'refresh-holds'),{recursive:true});f.write('workflow/refresh-holds/'+f.filename,{revision:c.revision});expect(JSON.parse(f.run('summarize')).outdated).toBe(1);
   f.run();expect(f.record().contacts.every((v:any)=>!v.functionSupported)).toBe(true);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 },120000);
 it('reuses unchanged extraction while rerunning selection and rejects corrupted retained caches',()=>{
  const f=fixture();try{
   f.run();const output=resolve(f.workflow,'corrected');const flags=['--output='+output,'--reuse-runtime='+process.cwd()];f.run(undefined,flags);
   const record=()=>JSON.parse(readFileSync(resolve(output,'records/'+f.id+'.json'),'utf8'));
   expect(record().contacts[0].functionSupported).toBe(true);expect(readdirSync(resolve(output,'sources'))).toHaveLength(0);
   const cache=resolve(f.workflow,'automatic/sources',readdirSync(resolve(f.workflow,'automatic/sources'))[0]);const bad=JSON.parse(readFileSync(cache,'utf8'));bad.readable=false;writeFileSync(cache,JSON.stringify(bad));f.run(undefined,flags);expect(record().evaluationComplete).toBe(false);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 },120000);

});
