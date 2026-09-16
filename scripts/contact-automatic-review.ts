import {contactStateDigest} from './lib/contact-state-digest';
/** Offline full-population evidence check. No model, database, HTTP or mail calls. */
import {readFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {contactCandidates} from '../lib/contact-evidence';
import {contactLinks,externalContactLinks,contactContentGap} from '../lib/contact-discovery';
import {contactRoleContext} from '../lib/contact-role-context';
import {checkAutomaticContact} from '../lib/contact-automatic-review';
import {hash,writePrivate,hydrateCase,assertCurrentCase,applyRefreshHold} from './lib/contact-workflow-store';
import {decisionProblems,type ContactDecision} from '../lib/contact-workflow';

const arg=(name:string)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3);
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtimeFiles=['scripts/contact-automatic-review.ts','scripts/lib/contact-workflow-store.ts','scripts/lib/contact-state-digest.ts','scripts/lib/contact-pdf-region.ts','scripts/lib/contact-source-record.ts','lib/contact-automatic-review.ts','lib/contact-role-context.ts','lib/contact-evidence.ts','lib/contact-discovery.ts','lib/contact-quality-evidence.ts','lib/contact-workflow.ts','lib/uri-sicher.ts','lib/personen-fund.ts','lib/kommunen-profil.ts','lib/published-joomla-mail.ts'];
const engine=hash(JSON.stringify(runtimeFiles.map(p=>[p,hash(readFileSync(resolve(root,p)))])));
function decode(bytes:Buffer){const charset=/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(bytes.subarray(0,8192).toString('latin1'))?.[1];try{return new TextDecoder(charset??'utf-8').decode(bytes);}catch{return bytes.toString('utf8');}}
const findingsIndex=new Map<string,string[]>();
function currentState(directory:string,workflow:string,t:any){return contactStateDigest(directory,workflow,t,findingsIndex.get(t.organization_id)??[]);}

function main(){
 const directory=resolve(arg('source')??''),workflow=resolve(directory,'workflow');
 if(!arg('source'))throw Error('Use --source=PRIVATE_AUDIT [--partition=0 --partitions=1]');
 const scopePath=resolve(workflow,'current-municipal-scope.json'),scopeBytes=readFileSync(scopePath),scope=JSON.parse(scopeBytes.toString());
 const inventoryBytes=readFileSync(resolve(directory,'inventory.json')),inventory=JSON.parse(inventoryBytes.toString());
 const findingsRoot=resolve(directory,'contextual/municipality-findings');if(existsSync(findingsRoot))for(const file of readdirSync(findingsRoot).filter(f=>f.endsWith('.json')).sort()){const path=resolve(findingsRoot,file),d=read(path);findingsIndex.set(d.organization_id,[...(findingsIndex.get(d.organization_id)??[]),path]);}
 const reference=read(resolve(workflow,'reference-review/official-current-municipal-reference.json'));
 if(hash(readFileSync(reference.originalFile))!==reference.originalSha256)throw Error('Official population original changed');
 const ids=new Set<string>(reference.regions.map((r:{region_id:string})=>r.region_id));
 if(new Set(scope.items.map((r:{currentMunicipalityId:string})=>r.currentMunicipalityId)).size!==scope.items.length||ids.size!==scope.items.length||scope.items.some((r:{currentMunicipalityId:string})=>!ids.has(r.currentMunicipalityId)))throw Error('Scope differs from official current population');
 const targets=new Map<string,any>(inventory.targets.map((t:any)=>[t.organization_id,t]));
 const mapped=read(resolve(workflow,'reference-review/historical-inventory-mapping.json'));
 for(const row of scope.items){if(row.currentMunicipalityId!==row.inventoryOrganizationId){const mapping=mapped.find((m:any)=>m.id===row.inventoryOrganizationId);if(!mapping||mapping.currentSuccessors.length!==1||mapping.currentSuccessors[0].id!==row.currentMunicipalityId)throw Error('Unproven current municipality mapping');for(const path of mapping.officialPaths)for(const change of path.changes)if(hash(readFileSync(resolve(workflow,'reference-review',change.file)))!==change.sourceHash)throw Error('Changed official mapping evidence');}}
 const part=Number(arg('partition')??0),parts=Number(arg('partitions')??1);
 if(!Number.isInteger(part)||!Number.isInteger(parts)||parts<1||part<0||part>=parts)throw Error('Invalid partition');
 const output=arg('output')?resolve(arg('output')!):resolve(workflow,'automatic'),records=resolve(output,'records'),cache=resolve(output,'sources');
 for(const p of [records,cache,resolve(output,'role-context')])mkdirSync(p,{recursive:true,mode:0o700});
 const scopeDigest=hash(scopeBytes),inventoryDigest=hash(inventoryBytes);
 // Reuse only extraction from identical parser code; selection rules are rerun.
 const reuseRuntime=arg('reuse-runtime')?resolve(arg('reuse-runtime')!):null;
 const parserFiles=['lib/contact-evidence.ts','lib/contact-discovery.ts','lib/uri-sicher.ts','lib/personen-fund.ts','lib/kommunen-profil.ts','lib/published-joomla-mail.ts'];
 let reuseEngine:string|null=null;
 if(reuseRuntime){for(const p of parserFiles)if(hash(readFileSync(resolve(root,p)))!==hash(readFileSync(resolve(reuseRuntime,p))))throw Error('Cannot reuse changed parser');const originalScript=readFileSync(resolve(reuseRuntime,'scripts/contact-automatic-review.ts'),'utf8');const declared=/const runtimeFiles=\[([^\]]+)\]/.exec(originalScript)?.[1];if(!declared)throw Error('Missing retained runtime manifest');const names=[...declared.matchAll(/'([^']+)'/g)].map(m=>m[1]);reuseEngine=hash(JSON.stringify(names.map(p=>[p,hash(readFileSync(resolve(reuseRuntime,p)))])));}
 const onlyIds=arg('ids')?new Set(arg('ids')!.split(',')):null;

 if(arg('action')==='summarize'){
  const manualCurrent=(r:any,row:any)=>{if(!r.existingDecision)return true;try{const p=resolve(workflow,'cases',hash('kommunen:'+row.inventoryOrganizationId)+'.json');assertCurrentCase(directory,read(p));return true;}catch{return false;}};
  const states:any[]=[];const mailboxes=new Set<string>();
  for(const row of scope.items){const p=resolve(records,row.currentMunicipalityId+'.json');if(!existsSync(p)){states.push({id:row.currentMunicipalityId,state:'not-evaluated'});continue;}
   const r=read(p);if(!manualCurrent(r,row)||r.engine!==engine||r.scopeDigest!==scopeDigest||r.inventoryDigest!==inventoryDigest||r.stateDigest!==currentState(directory,workflow,targets.get(row.inventoryOrganizationId))||r.sourceManifest.some((p:any)=>p.valid&&(!p.path||!existsSync(p.path)||hash(readFileSync(p.path))!==p.digest))){states.push({id:row.currentMunicipalityId,state:'evaluation-outdated'});continue;}
   const selected=r.existingDecision?.contacts??r.contacts.filter((c:any)=>c.functionSupported);for(const c of selected)mailboxes.add(c.email);
   states.push({id:row.currentMunicipalityId,state:!r.evaluationComplete?'evaluation-error':r.knownSourceChecksComplete?'known-source-checks-complete':'research-open',originalSupported:r.contacts.filter((c:any)=>c.originalSupported).length,functionSupported:r.contacts.filter((c:any)=>c.functionSupported).length,selected: selected.length,manual:!!r.existingDecision,newlySupported:r.comparison?.newlySupported.length??0,retainedSupported:r.comparison?.retainedSupported.length??0,gaps:r.researchGaps.length});
  }
  const summary={observedAt:new Date().toISOString(),engine,scopeDigest,population:scope.items.length,evaluated:states.filter(s=>!['not-evaluated','evaluation-outdated','evaluation-error'].includes(s.state)).length,evaluationErrors:states.filter(s=>s.state==='evaluation-error').length,notEvaluated:states.filter(s=>s.state==='not-evaluated').length,outdated:states.filter(s=>s.state==='evaluation-outdated').length,knownSourceChecksComplete:states.filter(s=>s.state==='known-source-checks-complete').length,researchOpen:states.filter(s=>s.state==='research-open').length,originalSupportedAssignments:states.reduce((n,s)=>n+(s.originalSupported??0),0),functionSupportedAssignments:states.reduce((n,s)=>n+(s.functionSupported??0),0),selectedAssignments:states.reduce((n,s)=>n+(s.selected??0),0),uniqueSelectedMailboxes:mailboxes.size,newlySupportedAssignments:states.reduce((n,s)=>n+(s.newlySupported??0),0),retainedSupportedAssignments:states.reduce((n,s)=>n+(s.retainedSupported??0),0),existingFullDecisions:states.filter(s=>s.manual).length,externalModelRequests:0,sendApproved:false};
  writePrivate(resolve(output,'summary.json'),summary);writePrivate(resolve(output,'queue.json'),states.filter(s=>s.state!=='known-source-checks-complete'));console.log(JSON.stringify(summary));return;
 }
 let processed=0;const counters={functionSupported:0,originalSupported:0,needsResearch:0,existingFullDecisions:0,sourceErrors:0};
 const progress=()=>writePrivate(resolve(output,`progress-${part}.json`),{engine,scopeDigest,inventoryDigest,partition:part,partitions:parts,population:scope.items.length,processed,...counters,updatedAt:new Date().toISOString(),externalModelRequests:0,sendApproved:false});
 for(let index=part;index<scope.items.length;index+=parts){
  const row=scope.items[index];if(onlyIds&&!onlyIds.has(row.currentMunicipalityId))continue;const id=row.inventoryOrganizationId,t=targets.get(id);if(!t)throw Error('Missing inventory target');
  try{
  const startState=currentState(directory,workflow,t);const filename=hash(t.dataset+':'+id)+'.json',inputBytes=readFileSync(t.audit.inputPath);if(hash(inputBytes)!==t.audit.inputDigest)throw Error('Frozen input changed');
  const input=JSON.parse(inputBytes.toString()),resultPath=resolve(directory,'results',filename),resultBytes=existsSync(resultPath)?readFileSync(resultPath):null,result=resultBytes?JSON.parse(resultBytes.toString()):null;
  if(result&&(result.engine!==inventory.engine||result.organization_id!==id))throw Error('Result identity changed');
  const observedAt=new Date().toISOString(),gaps:any[]=[],contacts:any[]=[],sourceManifest:any[]=[],seen=new Set<string>(),links=new Map<string,any>();
  const storedCasePath=resolve(workflow,'cases',filename),held=existsSync(storedCasePath)&&applyRefreshHold(workflow,read(storedCasePath)).knownSourceChange;if(held)gaps.push({kind:'known-source-change',next:'Capture current source and resolve the prior refresh hold'});
  let domain='';try{domain=new URL(input.website).hostname.replace(/^www\./,'');}catch{gaps.push({kind:'missing-official-start-url',next:'Find current official municipal website'});}
  const originals=new Map<string,string>(),sourceRoot=resolve(directory,'sources',id);
  if(existsSync(sourceRoot))for(const f of readdirSync(sourceRoot).filter(f=>f.endsWith('.html'))){const path=resolve(sourceRoot,f);originals.set(hash(readFileSync(path)),path);}
  const observations:any[]=(result?.pages??[]).map((p:any)=>({url:p.finalUrl??p.url,requestUrl:p.url,observedAt:p.observedAt,digest:p.htmlDigest,kind:'html',path:originals.get(p.htmlDigest),error:p.status==='read'?null:p.error??'Source not read'}));
  const supplement=resolve(directory,'supplemental',id),obsRoot=resolve(supplement,'observations');
  if(existsSync(obsRoot))for(const file of readdirSync(obsRoot).filter(f=>f.endsWith('.json'))){const bytes=readFileSync(resolve(obsRoot,file));if(hash(bytes)+'.json'!==file)throw Error('Supplemental observation changed');const p=JSON.parse(bytes.toString()),kind=p.sourceKind==='original-http-html'?'html':p.sourceKind==='original-http-pdf'?'pdf':'browser';observations.push({url:p.finalUrl,requestUrl:p.url,observedAt:p.observedAt,digest:p.sourceDigest,kind,path:resolve(supplement,p.sourceDigest+(kind==='pdf'?'.pdf':'.html')),error:p.httpStatus>=400?'HTTP '+p.httpStatus:null,observationDigest:file.slice(0,-5)});}
  if(!observations.length)gaps.push({kind:'no-original-sources',url:input.website??null,next:'Acquire official municipal sources'});
  for(const o of observations){
   seen.add(o.url);seen.add(o.requestUrl);const bytes=o.path&&existsSync(o.path)?readFileSync(o.path):null,valid=!!bytes&&hash(bytes)===o.digest;
   sourceManifest.push({url:o.url,observedAt:o.observedAt,digest:o.digest??null,kind:o.kind,valid,path:o.path??null,observationDigest:o.observationDigest??null});
   if(o.error||!valid){gaps.push({kind:'unread-or-invalid-source',url:o.url,reason:o.error??'Original hash unavailable or different',next:'Recover and inspect published source'});continue;}
   if(o.kind!=='html'){gaps.push({kind:'visual-source-review',url:o.url,sourceDigest:o.digest,next:'Use retained PDF region or browser review'});continue;}
   const cacheKey=hash(JSON.stringify([engine,o.digest,o.url,domain])),cachePath=resolve(cache,cacheKey+'.json');let parsed;
   const retainedCache=reuseEngine?resolve(workflow,'automatic/sources',hash(JSON.stringify([reuseEngine,o.digest,o.url,domain]))+'.json'):null;
   const readCache=existsSync(cachePath)?cachePath:retainedCache&&existsSync(retainedCache)?retainedCache:null;
   if(readCache){parsed=read(readCache);const {payloadDigest,...payload}=parsed;if(hash(JSON.stringify(payload))!==payloadDigest)throw Error('Cached extraction integrity failed');if((parsed.engine!==engine&&parsed.engine!==reuseEngine)||parsed.digest!==o.digest||parsed.url!==o.url)throw Error('Cached original identity mismatch');}
   else{const html=decode(bytes!),$=load(html);const readable=!/(?:nicht gefunden|seite existiert nicht|page not found|\b404\b)/i.test($('h1,title').text());parsed={engine,digest:o.digest,url:o.url,identityText:$('title,h1').text().replace(/\s+/g,' ').trim(),readable,gap:contactContentGap(html),candidates:readable?contactCandidates(html,o.url,domain):[],links:[...contactLinks(html,o.url,domain,'kommunen'),...externalContactLinks(html,o.url,domain,'kommunen')]};writePrivate(cachePath,{...parsed,payloadDigest:hash(JSON.stringify(parsed))});}
   if(!parsed.readable)gaps.push({kind:'not-readable',url:o.url,next:'Find current official contact route'});
   if(parsed.gap)gaps.push({kind:parsed.gap,url:o.url,next:'Inspect rendered or continued official directory'});
   const contextPath=resolve(output,'role-context',hash(JSON.stringify([hash(readFileSync(resolve(root,'lib/contact-role-context.ts'))),o.digest,domain]))+'.json');
   let context;if(existsSync(contextPath)){const saved=read(contextPath);const {payloadDigest,...payload}=saved;if(hash(JSON.stringify(payload))!==payloadDigest)throw Error('Role context cache changed');context={authorityName:payload.authorityName,candidates:parsed.candidates.map((c:any)=>({...c,additionalRoleEvidence:payload.evidence[c.email]??c.additionalRoleEvidence}))};}
   else{context=contactRoleContext(decode(bytes!),parsed.candidates);const payload={authorityName:context.authorityName??null,evidence:Object.fromEntries(context.candidates.map((c:any)=>[c.email,c.additionalRoleEvidence??[]]))};writePrivate(contextPath,{...payload,payloadDigest:hash(JSON.stringify(payload))});}
   for(const c of context.candidates)contacts.push(checkAutomaticContact(c,{url:o.url,digest:o.digest,observedAt:o.observedAt,valid,readable:parsed.readable,identityText:parsed.identityText,authorityName:context.authorityName??undefined},{name:input.name,domain,asOf:observedAt,heldEmails:input.heldEmails??[]}));
   for(const l of parsed.links)if(l.priority>=70&&!links.has(l.url))links.set(l.url,{...l,sourceUrl:o.url});
  }
  for(const link of links.values())if(!seen.has(link.url))gaps.push({kind:'unread-published-contact-link',...link,next:'Fetch published contact or directory continuation'});
  const grouped=new Map<string,any[]>();for(const c of contacts)grouped.set(c.email,[...(grouped.get(c.email)??[]),c]);
  const checked=[...grouped].map(([email,evidence])=>({email,channels:[...new Set(evidence.filter(c=>c.functionSupported).flatMap(c=>c.channels??[]))],responsibilityScopes:[...new Set(evidence.filter(c=>c.functionSupported).map(c=>c.organizationName))],municipalityCoverageConfirmed:evidence.some(c=>c.functionSupported&&c.municipalityCoverageConfirmed),originalSupported:evidence.some(c=>c.originalSupported),functionSupported:!held&&evidence.some(c=>c.functionSupported)&&!evidence.some(c=>c.reasons.some((r:string)=>['published-address-conflict','held-contact','excluded-or-conflicting-purpose','explicit-role-withdrawal','conflicting-municipal-scope'].includes(r))),evidence}));
  let manual:any=null;const casePath=resolve(workflow,'cases',filename),decisionPath=resolve(workflow,'decisions',filename);
  if(existsSync(casePath)&&existsSync(decisionPath)){try{const c=applyRefreshHold(workflow,read(casePath));const decision=read(decisionPath) as ContactDecision;c.decision=decision;assertCurrentCase(directory,c);const used=new Set<string>([...Object.values(decision.checks).flatMap((check:any)=>check.proofIds),...decision.contacts.flatMap((contact:any)=>contact.proofIds)]);const hydrated=hydrateCase(directory,{...c,proofs:c.proofs.filter((proof:any)=>used.has(proof.id))});if(!decisionProblems(hydrated,decision,observedAt).length)manual=decision;else gaps.push({kind:'prior-decision-invalid',next:'Recheck changed decision evidence'});}catch(e){gaps.push({kind:'prior-decision-changed',reason:String(e),next:'Recheck changed decision evidence'});}}
  if(manual?.outcome==='unresolved')for(const [check,value] of Object.entries(manual.checks) as [string,any][])if(value.state==='blocked')gaps.push({kind:'reviewed-blocker',check,reason:value.reason,proofIds:value.proofIds,next:value.reason});
  const stateDigest=currentState(directory,workflow,t);if(stateDigest!==startState){manual=null;for(const c of checked)c.functionSupported=false;gaps.push({kind:'sources-changed-during-evaluation',next:'Repeat this case against current sources'});}
  const resolvedManual=manual&&manual.outcome!=='unresolved';
  if(!resolvedManual&&(existsSync(resolve(directory,'reviews',filename))||(findingsIndex.get(id)?.length??0)>0)){for(const c of checked)c.functionSupported=false;gaps.push({kind:'prior-findings-require-reconciliation',next:'Reuse and reconcile retained individual findings; do not overwrite prior judgments',files:[...(existsSync(resolve(directory,'reviews',filename))?[resolve(directory,'reviews',filename)]:[]),...(findingsIndex.get(id)??[])]});}
  if(!manual&&!checked.some(c=>c.functionSupported))gaps.push({kind:'no-automatic-function-proof',next:'Inspect specific responsibility or general municipal contact',candidates:checked.filter(c=>c.originalSupported).map(c=>c.email)});
  const selectedEmails=[...new Set<string>((manual?.contacts??checked.filter(c=>c.functionSupported)).map((c:any)=>c.email.toLowerCase()))];const baseline=new Set<string>((input.emails??[]).map((email:string)=>email.toLowerCase()));
  const supportedBefore=checked.filter(c=>c.functionSupported&&baseline.has(c.email)).map(c=>c.email);
  const lostSupported=supportedBefore.filter(email=>!selectedEmails.includes(email));
  const comparison={supportedBefore,lostSupported,unresolvedBaseline:[...baseline].filter(email=>!supportedBefore.includes(email)),selectedEmails,newlySupported:selectedEmails.filter(email=>!baseline.has(email)),retainedSupported:selectedEmails.filter(email=>baseline.has(email)),baselineNotSelected:[...baseline].filter(email=>!selectedEmails.includes(email))};
  const record={schema:1,comparison,stateDigest,engine,scopeDigest,inventoryDigest,currentMunicipalityId:row.currentMunicipalityId,inventoryOrganizationId:id,name:row.name,observedAt,resultDigest:resultBytes?hash(resultBytes):null,inputDigest:hash(inputBytes),sourceManifest,contacts:checked,existingDecision:manual,researchGaps:gaps,evaluationComplete:true,knownSourceChecksComplete:!!resolvedManual||gaps.length===0,researchComplete:!!resolvedManual,researchGapDisposition:resolvedManual?'Covered or delimited by existing revision-bound decision':gaps.length?'open':'All known published contact-source checks passed; not exhaustive Internet discovery',sendApproved:false,externalModelRequests:0};
  writePrivate(resolve(records,row.currentMunicipalityId+'.json'),record);processed++;counters.functionSupported+=checked.filter(c=>c.functionSupported).length;counters.originalSupported+=checked.filter(c=>c.originalSupported).length;counters.needsResearch+=resolvedManual||!gaps.length?0:1;counters.existingFullDecisions+=manual?1:0;counters.sourceErrors+=gaps.filter(g=>g.kind==='unread-or-invalid-source').length;
  if(processed%10===0)progress();
  }catch(error){writePrivate(resolve(records,row.currentMunicipalityId+'.json'),{schema:1,engine,scopeDigest,inventoryDigest,stateDigest:currentState(directory,workflow,t),currentMunicipalityId:row.currentMunicipalityId,inventoryOrganizationId:id,name:row.name,observedAt:new Date().toISOString(),evaluationComplete:false,knownSourceChecksComplete:false,researchComplete:false,sourceManifest:[],contacts:[],existingDecision:null,researchGaps:[{kind:'evaluation-error',reason:String(error),next:'Recover the specific invalid source or input and repeat this case'}],sendApproved:false,externalModelRequests:0});processed++;counters.needsResearch++;counters.sourceErrors++;progress();}
 }
 progress();console.log(JSON.stringify({processed,partition:part,partitions:parts,...counters}));
}
main();
