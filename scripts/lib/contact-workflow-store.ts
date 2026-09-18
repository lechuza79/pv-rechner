import {pdfRegionSupported} from './contact-pdf-region';
import {load} from 'cheerio';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {contactCandidates} from '../../lib/contact-evidence';
import {CONTACT_CHECKS,decisionProblems,summarizeWorkflow,workflowState,type ContactDecision,type WorkflowCase,type ContactProof} from '../../lib/contact-workflow';

export const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const files=(p:string)=>existsSync(p)?readdirSync(p).filter(f=>f.endsWith('.json')).sort():[];
export function writePrivate(path:string,data:unknown){const tmp=path+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});renameSync(tmp,path);}
type StoredProof=ContactProof & {originalPath?:string;observationPath?:string;observationDigest?:string};
export function applyRefreshHold(output:string,c:StoredCase):StoredCase{
  const p=resolve(output,'refresh-holds',hash(c.dataset+':'+c.organizationId)+'.json');
  return {...c,knownSourceChange:existsSync(p)&&read(p).revision===c.revision};
}
export type StoredCase=Omit<WorkflowCase,'proofs'> & {proofs:StoredProof[];findings:string[]};
type Target={dataset:string;organization_id:string;audit:{inputPath:string}};
const key=(t:Target)=>hash(t.dataset+':'+t.organization_id)+'.json';
function decode(bytes:Buffer){
  const declaration=/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(bytes.subarray(0,8192).toString('latin1'))?.[1];
  try{return new TextDecoder(declaration??'utf-8').decode(bytes);}catch{return bytes.toString('utf8');}
}
/** Recheck selected originals at use time. Never trust cached valid flags. */
export function validateProofs(c:StoredCase,directory?:string):StoredCase{
  return {...c,proofs:c.proofs.map(p=>{
    if(p.kind==='failure')return {...p,valid:!!p.observationPath && existsSync(p.observationPath) && hash(readFileSync(p.observationPath))===p.digest};
    if(!p.originalPath || !existsSync(p.originalPath))return {...p,valid:false,publishedEmails:[]};
    const bytes=readFileSync(p.originalPath);
    let valid=hash(bytes)===p.digest;
    if(p.observationPath&&p.observationDigest){
      const raw=existsSync(p.observationPath)?readFileSync(p.observationPath):Buffer.alloc(0);
      valid=valid&&hash(raw)===p.observationDigest;
    }
    // PDF addresses require the existing explicit region check below; never guess from full-page text.
    const html=p.kind==='pdf'?'':decode(bytes);
    const $=load(html);
    const readable=p.kind==='pdf'||!/(?:nicht gefunden|seite existiert nicht|page not found|\b404\b)/i.test($('h1,title').text());
    const publishedEmails=valid&&readable&&p.kind!=='pdf'?contactCandidates(html,p.url,new URL(p.url).hostname).filter(c=>!c.sourceConflicts?.length).map(c=>c.email):[];
    if(valid&&p.kind==='pdf'&&directory){
      for(const contact of c.decision?.contacts??[]){
        const evidence=contact.pdfEvidence;
        if(evidence&&contact.proofIds.includes(p.id)&&evidence.sourcePdfDigest===p.digest&&evidence.observationDigest===p.observationDigest&&pdfRegionSupported(directory,c.organizationId,{...evidence,email:contact.email,url:p.url}))publishedEmails.push(contact.email);
      }
    }
    return {...p,valid,readable,publishedEmails};
  })};
}
/** One immutable source revision per case, including supplemental findings and observations. */
export function buildWorkflow(directory:string,output:string,asOf:string){
  const inventory=read(resolve(directory,'inventory.json'));const records=resolve(output,'cases');mkdirSync(records,{recursive:true,mode:0o700});
  const findingRoot=resolve(directory,'contextual/municipality-findings');const findingIndex=new Map<string,string[]>();
  for(const f of files(findingRoot)){const p=resolve(findingRoot,f),d=read(p);const id=d.organization_id;if(typeof id==='string')findingIndex.set(id,[...(findingIndex.get(id)??[]),p]);}
  const cases:StoredCase[]=[];
  for(const t of inventory.targets as Target[]){
    const filename=key(t),inputRaw=readFileSync(t.audit.inputPath),input=JSON.parse(inputRaw.toString());
    const resultPath=resolve(directory,'results',filename),raw=existsSync(resultPath)?readFileSync(resultPath):null;
    const result=raw?JSON.parse(raw.toString()):null;
    if(result&&(result.organization_id!==t.organization_id||result.engine!==inventory.engine))throw Error('Result identity mismatch');
    const proofs:StoredProof[]=[];const originals=resolve(directory,'sources',t.organization_id);
    for(const p of result?.pages??[]){
      const url=p.finalUrl??p.url;const originalPath=resolve(originals,hash(p.url)+'.html');
      const readable=p.status==='read'&&p.htmlDigest;
      proofs.push({id:hash(JSON.stringify([url,p.observedAt,p.htmlDigest,p.status])),url,observedAt:p.observedAt,digest:readable?p.htmlDigest:hash(raw!),kind:readable?'html':'failure',valid:false,...(readable?{originalPath}:{observationPath:resultPath})});
    }
    if(result&&!(result.pages??[]).length)proofs.push({id:hash('empty-result:'+hash(raw!)),url:input.website??'urn:contact-audit:no-known-source',observedAt:result.observed_at,digest:hash(raw!),kind:'failure',valid:false,observationPath:resultPath});
    const supplemental=resolve(directory,'supplemental',t.organization_id),observations=resolve(supplemental,'observations');
    for(const f of files(observations)){
      const observationPath=resolve(observations,f),bytes=readFileSync(observationPath),p=JSON.parse(bytes.toString());
      if(hash(bytes)+'.json'!==f)throw Error('Supplemental observation changed');
      const kind=p.sourceKind==='original-http-pdf'?'pdf':p.sourceKind==='isolated-browser-dom'?'browser':'html';
      proofs.push({id:f.slice(0,-5),url:p.finalUrl,observedAt:p.observedAt,digest:p.sourceDigest,kind,valid:false,originalPath:resolve(supplemental,p.sourceDigest+(kind==='pdf'?'.pdf':'.html')),observationPath,observationDigest:f.slice(0,-5)});
    }
    const historical=resolve(directory,'reviews',filename);const findings=[...(existsSync(historical)?[historical]:[]),...(findingIndex.get(t.organization_id)??[])];
    const revision=hash(JSON.stringify([hash(inputRaw),raw?hash(raw):null,proofs.map(p=>[p.id,p.digest]),findings.map(p=>hash(readFileSync(p)))]));
    let c:StoredCase={organizationId:t.organization_id,dataset:t.dataset,name:input.name,unit:t.dataset==='kommunen'?(t.organization_id.length===8?'municipality':'county'):'organization',revision,baselineEmails:input.emails??[],heldEmails:input.heldEmails??[],proofs,sourceResultPresent:!!result,unreadSources:(result?.pages??[]).filter((p:{status:string})=>p.status!=='read').length,candidateCount:result?.candidates?.length??0,legacyFindings:findings.length,findings};
    c=applyRefreshHold(output,c);
    const decisionPath=resolve(output,'decisions',filename);if(existsSync(decisionPath)){c.decision=read(decisionPath);c=hydrateCase(directory,c);}
    writePrivate(resolve(records,filename),c);cases.push(c);
  }
  const inventorySummary=summarizeWorkflow(cases,asOf);
  const referencePath=resolve(output,'population-reference.json');
  let referenceCoverage:{verified:boolean;observedAt:string|null;expectedMunicipalities:number|null;missingIds:string[];unexpectedIds:string[]}={verified:false,observedAt:null,expectedMunicipalities:null,missingIds:[],unexpectedIds:[]};
  if(existsSync(referencePath)){
    const reference=read(referencePath),bytes=readFileSync(reference.sourcePath);
    if(hash(bytes)!==reference.sourceDigest)throw Error('Population reference changed');
    const snapshot=JSON.parse(bytes.toString()),rows=snapshot.regions.filter((r:{level:string})=>r.level==='gemeinde');
    const expected=new Set<string>(rows.map((r:{region_id:string})=>r.region_id));
    if(expected.size!==rows.length||!Number.isFinite(Date.parse(reference.observedAt))||Date.parse(reference.observedAt)>Date.parse(asOf))throw Error('Invalid population reference');
    const actual=new Set(cases.filter(c=>c.unit==='municipality').map(c=>c.organizationId));
    referenceCoverage={verified:true,observedAt:reference.observedAt,expectedMunicipalities:expected.size,missingIds:[...expected].filter(id=>!actual.has(id)),unexpectedIds:[...actual].filter(id=>!expected.has(id))};
  }
  const summary={...inventorySummary,inventoryReviewComplete:inventorySummary.reviewComplete,referenceCoverage,reviewComplete:inventorySummary.reviewComplete&&referenceCoverage.verified&&referenceCoverage.missingIds.length===0&&referenceCoverage.unexpectedIds.length===0};
  writePrivate(resolve(output,'population-gaps.json'),referenceCoverage);
  writePrivate(resolve(output,'summary.json'),summary);
  const queue=cases.filter(c=>!workflowState(c,asOf).completed).map(c=>({organizationId:c.organizationId,dataset:c.dataset,name:c.name,revision:c.revision,state:workflowState(c,asOf).state,existingFindings:c.legacyFindings,unreadSources:c.unreadSources,next:c.sourceResultPresent?'Review the five checks; reuse prior source-bound findings':'Await source result or document official-source research',checks:CONTACT_CHECKS}));
  writePrivate(resolve(output,'queue.json'),queue);writePrivate(resolve(output,'inventory.json'),{sourceDirectory:resolve(directory),sourceInventoryDigest:hash(readFileSync(resolve(directory,'inventory.json'))),cases:cases.map(c=>({organizationId:c.organizationId,dataset:c.dataset,revision:c.revision}))});
  return summary;
}
/** Source bytes can be keyed by URL or digest. Resolve from hashes when legacy naming differs. */
export function hydrateCase(directory:string,c:StoredCase){
  const root=resolve(directory,'sources',c.organizationId),index=new Map<string,string>();
  for(const p of c.proofs.filter(p=>p.kind!=='failure'&&(!p.originalPath||!existsSync(p.originalPath)))){
    if(!index.size&&existsSync(root))for(const f of readdirSync(root).filter(f=>f.endsWith('.html'))){const path=resolve(root,f);index.set(hash(readFileSync(path)),path);}
    const path=index.get(p.digest);if(path)p.originalPath=path;
  }
  return validateProofs(c,directory);
}
export function submitDecision(output:string,c:StoredCase,d:ContactDecision,asOf:string){
  const errors=decisionProblems(c,d,asOf);if(errors.length)throw Error(errors.join(', '));
  const root=resolve(output,'decisions'),history=resolve(output,'decision-history');mkdirSync(root,{recursive:true,mode:0o700});mkdirSync(history,{recursive:true,mode:0o700});
  const filename=hash(c.dataset+':'+c.organizationId)+'.json',dest=resolve(root,filename);
  if(existsSync(dest)){const old=readFileSync(dest);const archive=resolve(history,hash(old)+'.json');if(!existsSync(archive))writeFileSync(archive,old,{flag:'wx',mode:0o600});}
  writePrivate(dest,d);
}
/** Short exclusive lock protects competing claims; expiring leases recover interrupted workers. */
export function claimCase(output:string,worker:string,asOf:string,organizationId?:string){
  if(!worker.trim()||!Number.isFinite(Date.parse(asOf)))throw Error('Invalid worker or date');
  const lock=resolve(output,'claim.lock');mkdirSync(lock);
  try{
    const root=resolve(output,'leases');mkdirSync(root,{recursive:true,mode:0o700});
    for(const row of read(resolve(output,'queue.json'))){
      if(organizationId&&row.organizationId!==organizationId)continue;
      const filename=hash(row.dataset+':'+row.organizationId)+'.json',p=resolve(root,filename),lease=existsSync(p)?read(p):null;
      if(lease&&lease.revision===row.revision&&Date.parse(lease.expiresAt)>Date.parse(asOf))continue;
      const decisionPath=resolve(output,'decisions',filename);
      if(existsSync(decisionPath)){
        const inventory=read(resolve(output,'inventory.json'));
        let c:StoredCase=applyRefreshHold(output,read(resolve(output,'cases',filename)));c.decision=read(decisionPath);
        try{assertCurrentCase(inventory.sourceDirectory,c);c=hydrateCase(inventory.sourceDirectory,c);if(workflowState(c,asOf).completed)continue;}catch{/* Changed evidence remains eligible for a new review. */}
      }
      const next={...row,worker,token:randomUUID(),claimedAt:asOf,expiresAt:new Date(Date.parse(asOf)+30*60*1000).toISOString()};writePrivate(p,next);return next;
    }
    return null;
  }finally{rmSync(lock,{recursive:true});}
}

/** Recompute case identity before submitting or preflighting, even without a prior sync. */
export function assertCurrentCase(directory:string,c:StoredCase){
  const inventory=read(resolve(directory,'inventory.json'));
  const t:Target|undefined=inventory.targets.find((t:Target)=>t.dataset===c.dataset&&t.organization_id===c.organizationId);
  if(!t)throw Error('Case removed from source inventory');
  const inputRaw=readFileSync(t.audit.inputPath),filename=key(t),resultPath=resolve(directory,'results',filename);
  const raw=existsSync(resultPath)?readFileSync(resultPath):null,result=raw?JSON.parse(raw.toString()):null;
  const identities:(string[])[]=[];
  for(const p of result?.pages??[]){const url=p.finalUrl??p.url;identities.push([hash(JSON.stringify([url,p.observedAt,p.htmlDigest,p.status])),p.status==='read'&&p.htmlDigest?p.htmlDigest:hash(raw!)]);}
  if(result&&!(result.pages??[]).length)identities.push([hash('empty-result:'+hash(raw!)),hash(raw!)]);
  const root=resolve(directory,'supplemental',c.organizationId,'observations');
  for(const f of files(root)){const bytes=readFileSync(resolve(root,f)),p=JSON.parse(bytes.toString());if(hash(bytes)+'.json'!==f)throw Error('Changed source observation');identities.push([f.slice(0,-5),p.sourceDigest]);}
  const historical=resolve(directory,'reviews',filename),findings=resolve(directory,'contextual/municipality-findings');
  const paths=[...(existsSync(historical)?[historical]:[]),...files(findings).map(f=>resolve(findings,f)).filter(p=>read(p).organization_id===c.organizationId)];
  const revision=hash(JSON.stringify([hash(inputRaw),raw?hash(raw):null,identities,paths.map(p=>hash(readFileSync(p)))]));
  if(revision!==c.revision)throw Error('Source revision changed; sync and review again');
}

/** Submission and lease replacement share a lock, so an expired worker cannot overwrite its successor. */
export function submitClaimedDecision(directory:string,output:string,c:StoredCase,d:ContactDecision,token:string,asOf:string){
  const lock=resolve(output,'claim.lock');mkdirSync(lock);
  try{
    const leasePath=resolve(output,'leases',hash(c.dataset+':'+c.organizationId)+'.json');
    const lease=existsSync(leasePath)?read(leasePath):null;
    if(!lease||lease.token!==token||lease.revision!==c.revision||Date.parse(lease.expiresAt)<=Date.parse(asOf))throw Error('Current exclusive case lease required');
    if(d.reviewer!==lease.worker)throw Error('Reviewer differs from lease holder');
    assertCurrentCase(directory,c);
    const current=hydrateCase(directory,applyRefreshHold(output,{...c,decision:d}));
    submitDecision(output,current,d,asOf);rmSync(leasePath);
  }finally{rmSync(lock,{recursive:true});}
}
