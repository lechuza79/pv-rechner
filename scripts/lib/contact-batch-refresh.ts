import {abortableContactRead} from './contact-deadline';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {CONTACT_CHECKS,workflowState,type DispatchRefresh} from '../../lib/contact-workflow';
import {hash,writePrivate,type StoredCase} from './contact-workflow-store';
export type RefreshCapture={proofId:string;observationDigest:string};
export type ProvenRefresh=DispatchRefresh & {reviewer:string;captures:RefreshCapture[]};
const proofIds=(c:StoredCase)=>[...new Set([...CONTACT_CHECKS.flatMap(k=>c.decision!.checks[k].proofIds),...c.decision!.contacts.flatMap(v=>v.proofIds)])];
function immutable(path:string,bytes:Buffer){
  try{writeFileSync(path,bytes,{flag:'wx',mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||!readFileSync(path).equals(bytes))throw e;}
}
/** Raw responses stay local. Exact byte changes require review, never automatic acceptance. */
export async function captureBatchRefresh(output:string,c:StoredCase,fetcher:typeof fetch=fetch):Promise<ProvenRefresh>{
  const now=new Date().toISOString();
  if(!workflowState(c,now).completed||c.decision?.outcome==='unresolved')throw Error('Review case before refreshing a batch');
  const root=resolve(output,'refresh-evidence');mkdirSync(root,{recursive:true,mode:0o700});
  const captures:RefreshCapture[]=[];let unchanged=true;
  for(const id of proofIds(c)){
    const p=c.proofs.find(p=>p.id===id)!;
    let bytes=Buffer.alloc(0),finalUrl='',status=0,error:string|null=null;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      if(p.kind==='browser'||p.kind==='failure')throw Error('Requires a new explicit browser or failed-source review');
      const response=await abortableContactRead(fetcher(p.url,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'solar-check.io contact-refresh/1.0'}}),controller.signal);
      status=response.status;finalUrl=response.url||p.url;
      if(!response.ok)throw Error('HTTP '+status);
      const reader=response.body?.getReader();if(!reader)throw Error('Empty response');
      const chunks:Uint8Array[]=[];let length=0;
      try{for(;;){const part=await abortableContactRead(reader.read(),controller.signal);if(part.done)break;length+=part.value.byteLength;if(length>10*1024*1024)throw Error('Response exceeds local evidence limit');chunks.push(part.value);}}finally{void reader.cancel().catch(()=>{});}
      bytes=Buffer.concat(chunks);
    }catch(e){error=String(e).slice(0,200);}finally{clearTimeout(timer);}
    const sourceDigest=hash(bytes),observedAt=new Date().toISOString();
    const record={organizationId:c.organizationId,revision:c.revision,proofId:id,url:p.url,finalUrl,status,error,observedAt,sourceDigest};
    const serialized=Buffer.from(JSON.stringify(record)),observationDigest=hash(serialized);
    immutable(resolve(root,sourceDigest+'.source'),bytes);immutable(resolve(root,observationDigest+'.json'),serialized);
    captures.push({proofId:id,observationDigest});
    if(error||status<200||status>=300||sourceDigest!==p.digest||finalUrl!==p.url)unchanged=false;
  }
  if(!unchanged){
    const holds=resolve(output,'refresh-holds');mkdirSync(holds,{recursive:true,mode:0o700});
    writePrivate(resolve(holds,hash(c.dataset+':'+c.organizationId)+'.json'),{revision:c.revision,detectedAt:new Date().toISOString(),captures,reason:'Fresh source changed or unavailable; add original evidence and review a new case revision'});
  }
  return {organizationId:c.organizationId,revision:c.revision,checkedAt:new Date().toISOString(),reviewer:'',captures,discoveryRenewed:false,sourcesUnchanged:unchanged,exclusionsChecked:false,previouslySent:false,excluded:false};
}
/** Revalidate receipt hashes and captured bytes, not just caller-provided booleans. */
export function refreshEvidenceProblems(output:string,c:StoredCase,r:ProvenRefresh,asOf:string):string[]{
  const errors:string[]=[];if(!r||!r.reviewer?.trim()||!Array.isArray(r.captures))return ['missing-refresh-evidence'];
  for(const id of proofIds(c)){
    const matches=r.captures.filter(v=>v.proofId===id),ref=matches[0],p=c.proofs.find(p=>p.id===id)!;
    if(matches.length!==1||!ref||!/^[a-f0-9]{64}$/.test(ref.observationDigest)){errors.push('missing-refresh-receipt');continue;}
    try{
      const root=resolve(output,'refresh-evidence'),raw=readFileSync(resolve(root,ref.observationDigest+'.json')),o=JSON.parse(raw.toString());
      if(hash(raw)!==ref.observationDigest||o.organizationId!==c.organizationId||o.revision!==c.revision||o.proofId!==id||o.url!==p.url||o.finalUrl!==p.url||o.error!==null||o.status<200||o.status>=300||o.sourceDigest!==p.digest||!/^[a-f0-9]{64}$/.test(o.sourceDigest))throw Error('Receipt mismatch');
      const observed=Date.parse(o.observedAt),checked=Date.parse(r.checkedAt),now=Date.parse(asOf);
      if(!Number.isFinite(observed)||observed<Date.parse(c.decision!.reviewedAt)||observed>checked||now-observed>86400000||observed>now)throw Error('Receipt date mismatch');
      const original=resolve(root,o.sourceDigest+'.source');if(!existsSync(original)||hash(readFileSync(original))!==p.digest)throw Error('Captured source changed');
    }catch{errors.push('invalid-refresh-receipt');}
  }
  return [...new Set(errors)];
}
