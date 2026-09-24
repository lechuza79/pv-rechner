/** Offline reassessment preserves the original crawl and every source observation. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { contactQuality } from '../lib/contact-quality';
import { atomicJson, targetFilename, type BatchTarget } from './lib/contact-batch';
const arg=(name:string)=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3);
const directory=resolve(arg('directory')??''); const output=resolve(arg('output')??''); const asOf=arg('as-of');
if (!arg('directory') || !arg('output') || !asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || output===directory || output.startsWith(directory+'/')) throw Error('Use separate --directory --output and --as-of=YYYY-MM-DD');
const inventory=JSON.parse(readFileSync(resolve(directory,'inventory.json'),'utf8'));
const cohort: {organizationId:string;name:string;currentMailbox:string}[]=arg('cohort') ? JSON.parse(readFileSync(resolve(arg('cohort')!),'utf8')).targets : [];
type ReviewHold={dataset:string;organization_id:string;email:string;sourceUrls:string[];reason:string;quote:string};
const reviews:ReviewHold[]=arg('reviews') ? JSON.parse(readFileSync(resolve(arg('reviews')!),'utf8')).holds : [];
for(const r of reviews)if(!r.reason || !r.quote || !r.sourceUrls.length)throw Error('Review holds require source evidence');
const supplementalDirectory=arg('supplemental') ? resolve(arg('supplemental')!) : undefined;
const named=new Map(cohort.map(r=>[r.organizationId,r]));
const evaluatorFiles=['lib/contact-quality.ts','lib/contact-quality-evidence.ts','lib/contact-evidence.ts','scripts/contact-reassess.ts'];
const evaluator=createHash('sha256').update(evaluatorFiles.map(f=>readFileSync(resolve(f),'utf8')).join('\n')).digest('hex');
mkdirSync(resolve(output,'results'),{recursive:true,mode:0o700});
const manifest={sourceDirectory:directory,sourceEngine:inventory.engine,evaluator,asOf,expected:inventory.targets.length,reviewDigest:createHash('sha256').update(JSON.stringify(reviews)).digest('hex'),supplementalDigest:supplementalDirectory ? createHash('sha256').update(readdirSync(supplementalDirectory).filter(f=>f.endsWith('.json')).sort().map(f=>readFileSync(resolve(supplementalDirectory,f),'utf8')).join('\n')).digest('hex') : null,cohortDigest:createHash('sha256').update(JSON.stringify(cohort)).digest('hex')};
const manifestPath=resolve(output,'manifest.json');
if(existsSync(manifestPath) && JSON.stringify(JSON.parse(readFileSync(manifestPath,'utf8')))!==JSON.stringify(manifest)) throw Error('Reassessment settings changed; use a new output directory');
atomicJson(manifestPath,manifest);
const stats: Record<string,{total:number;beforeRole:number;afterRole:number;promoted:number;demoted:number;reviewReasons:Record<string,number>}>={};
const cohortRows: unknown[]=[];
let completed=0;
for(const target of inventory.targets as BatchTarget[]) {
 const filename=targetFilename(target); const path=resolve(directory,'results',filename); const raw=JSON.parse(readFileSync(path,'utf8'));
 if(raw.dataset!==target.dataset || raw.organization_id!==target.organization_id || raw.engine!==inventory.engine) throw Error('Source identity/engine mismatch');
 const known=target.dataset==='kommunen'?named.get(target.organization_id):undefined;
 let domain:string|undefined; try {domain=new URL(/^https?:/i.test(target.website??'')?target.website!:`https://${target.website}`).hostname.replace(/^www\./,'');}catch{/* No inferred identity. */}
 const before=raw.quality?.contacts ?? [];
 let candidates=raw.candidates;
 const supplementPath=supplementalDirectory ? resolve(supplementalDirectory,target.organization_id+'.json') : undefined;
 let supplement: {id:string;dataset:string;source:{status:string;finalUrl:string;candidates:typeof candidates}} | undefined;
 if(target.dataset==='kommunen' && supplementPath && existsSync(supplementPath)) {
   supplement=JSON.parse(readFileSync(supplementPath,'utf8'));
   if(supplement?.id!==target.organization_id || supplement?.dataset!==target.dataset)throw Error('Supplement identity mismatch');
   if(supplement.source.status==='read') candidates=[...candidates.filter((c:{sourceUrl:string})=>c.sourceUrl!==supplement!.source.finalUrl),...supplement.source.candidates];
 }

 const after=contactQuality(candidates,target.dataset,(raw.quality?.gaps ?? [raw.status]).filter((g:string)=>!['target-role-not-established','external-organization-attribution'].includes(g)),{asOf,organizationName:known?.name,organizationDomain:domain});
 const appliedHolds=reviews.filter(r=>r.dataset===target.dataset && r.organization_id===target.organization_id && candidates.some((c:{email:string;sourceUrl:string})=>c.email===r.email && r.sourceUrls.includes(c.sourceUrl)));
 for(const hold of appliedHolds) {
   const contact=after.contacts.find(c=>c.email===hold.email);
   if(contact) {contact.suitability='needs-review';contact.reviewReasons.push('reviewed-source-hold: '+hold.reason);}
 }
 after.status=after.contacts.some(c=>c.suitability==='role-indicated') ? 'role-indicated' : after.contacts.some(c=>c.suitability==='general-fallback') ? 'general-only' : after.contacts.length ? 'review-required' : 'no-contact-observed';
 if(!after.contacts.some(c=>c.suitability==='role-indicated') && !after.gaps.includes('target-role-not-established'))after.gaps.push('target-role-not-established');
 const prior=new Map<string,string>(before.map((c:{email:string;suitability:string})=>[c.email,c.suitability]));
 const changes=after.contacts.filter(c=>prior.get(c.email)!==c.suitability).map(c=>({email:c.email,before:prior.get(c.email)??null,after:c.suitability,reasons:c.reviewReasons}));
 const report={appliedHolds,dataset:target.dataset,organization_id:target.organization_id,sourceFile:path,sourceEngine:raw.engine,evaluator,asOf,...(supplement ? {supplementalSource:supplementPath} : {}),quality:after,changes};
 atomicJson(resolve(output,'results',filename),report);
 const s=stats[target.dataset]??={total:0,beforeRole:0,afterRole:0,promoted:0,demoted:0,reviewReasons:{}};
 s.total++; s.beforeRole+=Number(before.some((c:{suitability:string})=>c.suitability==='role-indicated'));s.afterRole+=Number(after.contacts.some(c=>c.suitability==='role-indicated'));
 for(const c of changes) {s.promoted+=Number(c.after==='role-indicated');s.demoted+=Number(c.before==='role-indicated'&&c.after!=='role-indicated');}
 for(const reason of new Set(after.contacts.flatMap(c=>c.reviewReasons))) s.reviewReasons[reason]=(s.reviewReasons[reason]??0)+1;
 if(known)cohortRows.push({id:target.organization_id,name:known.name,old:known.currentMailbox,beforeAdditionalRole:before.filter((c:{email:string;suitability:string})=>c.suitability==='role-indicated'&&c.email!==known.currentMailbox),afterAdditionalRole:after.contacts.filter(c=>c.suitability==='role-indicated'&&c.email!==known.currentMailbox),changes,quality:after});
 completed++;if(completed%1000===0) console.log(JSON.stringify({completed,total:inventory.targets.length}));
}
if(completed!==inventory.targets.length || readdirSync(resolve(output,'results')).filter(x=>x.endsWith('.json')).length!==completed)throw Error('Coverage mismatch');
atomicJson(resolve(output,'cohort.json'),cohortRows);
atomicJson(resolve(output,'summary.json'),{...manifest,completed,finishedAt:new Date().toISOString(),datasets:stats,limits:'Reclassification of original evidence plus explicitly supplied source rechecks; no reachability claims. Missing source dates remain unknown. Official name matching available only for supplied named cohort.'});
console.log(JSON.stringify({completed,stats}));
