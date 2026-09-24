/** Private evidence workflow. Only refresh uses HTTP; no model calls, database writes or mail delivery. */
import {readFileSync,existsSync,mkdirSync,rmSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {captureBatchRefresh} from './lib/contact-batch-refresh';
import {requireContactBatch} from './lib/contact-dispatch-gate';
import {CONTACT_CHECKS,type ContactDecision} from '../lib/contact-workflow';
import {buildWorkflow,applyRefreshHold,claimCase,hash,hydrateCase,submitClaimedDecision,writePrivate,assertCurrentCase,type StoredCase} from './lib/contact-workflow-store';
const arg=(name:string)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
export async function main(){
  const source=arg('source'),out=arg('output');if(!source||!out)throw Error('Use --source=AUDIT --output=PRIVATE_WORKFLOW --action=sync|claim|packet|submit|preflight');
  const directory=resolve(source),output=resolve(out),action=arg('action')??'sync',now=new Date().toISOString();
  if(directory===output||output.startsWith(directory+'/sources/')||output.startsWith(directory+'/results/'))throw Error('Workflow must not overwrite source evidence');
  mkdirSync(output,{recursive:true,mode:0o700});
  if(action==='sync'){
    // A failed process can leave this short-operation lock. Explicit recovery requires age evidence.
    const lock=resolve(output,'sync.lock');if(existsSync(lock))throw Error('Another sync may be active; inspect before recovery');mkdirSync(lock);
    try{console.log(JSON.stringify(buildWorkflow(directory,output,now)));}finally{rmSync(lock,{recursive:true});}return;
  }
  if(action==='recover-lock'){
    const name=arg('lock');if(!['sync','claim'].includes(name??''))throw Error('Specify --lock=sync|claim');
    const lock=resolve(output,name+'.lock');if(!existsSync(lock))return;
    if(Date.now()-statSync(lock).mtimeMs<3600*1000)throw Error('Lock is not stale');
    rmSync(lock,{recursive:true});return;
  }
  if(!existsSync(resolve(output,'inventory.json')))throw Error('Sync inventory first');
  const inventory=json(resolve(output,'inventory.json'));
  if(inventory.sourceDirectory!==directory || inventory.sourceInventoryDigest!==hash(readFileSync(resolve(directory,'inventory.json'))))throw Error('Workflow source inventory changed');
  if(action==='claim'){const claim=claimCase(output,arg('worker')??'',now,arg('id'));console.log(JSON.stringify(claim));return;}
  const load=(id:string)=>{
    const matches=inventory.cases.filter((c:{organizationId:string})=>c.organizationId===id);
    if(matches.length!==1)throw Error('Unknown or ambiguous organization');
    const meta=matches[0],file=hash(meta.dataset+':'+id)+'.json';
    const c:StoredCase=applyRefreshHold(output,json(resolve(output,'cases',file)));
    if(c.revision!==meta.revision)throw Error('Case and inventory differ; sync first');
    const decisionPath=resolve(output,'decisions',file);
    if(existsSync(decisionPath))c.decision=json(decisionPath);
    assertCurrentCase(directory,c);
    return hydrateCase(directory,c);
  };
  if(action==='refresh'){
    if(!arg('batch')||!arg('refreshed-batch'))throw Error('Use --batch=PLAN --refreshed-batch=NEW_PRIVATE_FILE');
    const destination=resolve(arg('refreshed-batch')!);if(existsSync(destination))throw Error('Choose a new refreshed batch file');
    const batch=json(resolve(arg('batch')!));
    const cases:StoredCase[]=Array.from(new Set<string>(batch.recipients.map((r:{organizationId:string})=>r.organizationId))).map(load);
    const refresh=[];for(const c of cases)refresh.push(await captureBatchRefresh(output,c));
    writePrivate(destination,{...batch,refresh});
    console.log(JSON.stringify({captured:cases.length,unchanged:refresh.filter(r=>r.sourcesUnchanged).length,requiresDiscoveryAndExclusionReview:true,sendApproved:false}));return;
  }
  if(action==='preflight'){
    if(!arg('batch'))throw Error('Use --batch=PRIVATE_BATCH.json');
    const batch=json(resolve(arg('batch')!));
    let result;try{result=requireContactBatch(output,resolve(arg('batch')!),batch.recipients,now);}catch(e){result={eligible:false,errors:[String(e)],checked:batch.recipients.length,sendApproved:false};}
    writePrivate(resolve(output,'preflight.json'),{...result,checkedAt:now,batchDigest:hash(readFileSync(resolve(arg('batch')!)))});
    console.log(JSON.stringify(result));if(!result.eligible)process.exitCode=2;return;
  }
  const id=arg('id');if(!id)throw Error('Specify --id=ORGANIZATION');const c=load(id);
  if(action==='packet'){
    const template={schema:1,organizationId:id,revision:c.revision,reviewer:'',reviewedAt:now,checks:Object.fromEntries(CONTACT_CHECKS.map(k=>[k,{state:'blocked',reason:'',proofIds:[]}])) ,outcome:'unresolved',contacts:[]};
    const root=resolve(output,'packets');mkdirSync(root,{recursive:true,mode:0o700});
    writePrivate(resolve(root,hash(c.dataset+':'+id)+'.json'),{case:c,decisionTemplate:template});
    console.log(JSON.stringify({organizationId:id,proofs:c.proofs.length,validProofs:c.proofs.filter(p=>p.valid).length,existingFindings:c.findings.length,packetStoredLocally:true}));return;
  }
  if(action==='submit'){
    if(!arg('decision'))throw Error('Use --decision=PRIVATE_REVIEW.json');
    const d:ContactDecision=json(resolve(arg('decision')!));
    submitClaimedDecision(directory,output,c,d,arg('lease-token')??'',now);
    console.log(JSON.stringify({saved:true,organizationId:id,outcome:d.outcome,sendApproved:false}));return;
  }
  throw Error('Unknown action');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(String(e));process.exitCode=1;});
