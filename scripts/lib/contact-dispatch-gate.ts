import {refreshEvidenceProblems,type ProvenRefresh} from './contact-batch-refresh';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {checkContactBatch} from '../../lib/contact-workflow';
import {assertCurrentCase,applyRefreshHold,hash,hydrateCase,type StoredCase} from './contact-workflow-store';
/** Called by the actual sender. A cached preflight report alone never authorizes recipients. */
export function requireContactBatch(workflow:string,batchPath:string,recipients:{organizationId:string;email:string}[],asOf:string){
  const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
  const inventory=read(resolve(workflow,'inventory.json'));
  if(hash(readFileSync(resolve(inventory.sourceDirectory,'inventory.json')))!==inventory.sourceInventoryDigest)throw Error('Source inventory changed');
  const batch:{recipients:{organizationId:string;email:string}[];refresh:ProvenRefresh[];allowGeneral?:boolean}=read(batchPath);
  const normalize=(rows:{organizationId:string;email:string}[])=>rows.map(r=>r.organizationId+':'+r.email.trim().toLowerCase()).sort();
  if(JSON.stringify(normalize(batch.recipients))!==JSON.stringify(normalize(recipients)))throw Error('Contact review must match the complete planned batch');
  const cases:StoredCase[]=[];
  for(const id of new Set(recipients.map(r=>r.organizationId))){
    const matches=inventory.cases.filter((c:{organizationId:string})=>c.organizationId===id);
    if(matches.length!==1)throw Error('Missing or ambiguous contact case');
    const key=hash(matches[0].dataset+':'+id)+'.json';
    let c:StoredCase=applyRefreshHold(workflow,read(resolve(workflow,'cases',key)));
    if(c.revision!==matches[0].revision)throw Error('Workflow sync incomplete');
    // Decisions may be newer than the last summary. Always read authoritative decision files.
    c.decision=read(resolve(workflow,'decisions',key));
    assertCurrentCase(inventory.sourceDirectory,c);c=hydrateCase(inventory.sourceDirectory,c);cases.push(c);
  }
  const result=checkContactBatch(cases,recipients,batch.refresh,asOf,batch.allowGeneral===true);
  for(const c of cases){
    if(!c.decision||c.decision.outcome==='unresolved')continue;
    const refresh=batch.refresh.find(r=>r.organizationId===c.organizationId);
    const errors=refreshEvidenceProblems(workflow,c,refresh as ProvenRefresh,asOf);result.errors.push(...errors.map(e=>e+':'+c.organizationId));
  }
  result.eligible=result.errors.length===0;
  if(!result.eligible)throw Error('Contact batch blocked: '+result.errors.join(', '));
  return result;
}
