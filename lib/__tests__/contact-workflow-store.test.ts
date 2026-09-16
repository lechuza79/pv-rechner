import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CONTACT_CHECKS,type ContactDecision} from '../../lib/contact-workflow';
import {assertCurrentCase,buildWorkflow,claimCase,hash,hydrateCase,submitDecision,submitClaimedDecision,type StoredCase} from '../../scripts/lib/contact-workflow-store';
import {captureBatchRefresh,refreshEvidenceProblems} from '../../scripts/lib/contact-batch-refresh';
import {requireContactBatch} from '../../scripts/lib/contact-dispatch-gate';
const roots:string[]=[];
const now='2026-09-16T12:00:00Z';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'contact-workflow-test-'));roots.push(root);
 const source=join(root,'source'),output=join(root,'workflow'),id='01000001',filename=hash('kommunen:'+id)+'.json';
 for(const p of [source,output,join(source,'results'),join(source,'sources',id)])mkdirSync(p,{recursive:true});
 const html='<html><body><h1>Stadt Beispiel: Presse</h1><a href="mailto:presse@beispiel.de">presse@beispiel.de</a></body></html>';
 const original=join(source,'sources',id,'legacy-name.html');writeFileSync(original,html);
 const input=join(source,'input.json');writeFileSync(input,JSON.stringify({name:'Beispiel',emails:[]}));
 writeFileSync(join(source,'inventory.json'),JSON.stringify({engine:'frozen',targets:[{dataset:'kommunen',organization_id:id,audit:{inputPath:input}}]}));
 const result=join(source,'results',filename);
 writeFileSync(result,JSON.stringify({organization_id:id,engine:'frozen',pages:[{url:'https://beispiel.de/presse',status:'read',observedAt:'2026-09-16T10:00:00Z',htmlDigest:hash(html)}],candidates:[]}));
 buildWorkflow(source,output,now);
 const load=()=>hydrateCase(source,JSON.parse(readFileSync(join(output,'cases',filename),'utf8')) as StoredCase);
 const c=load();const proofIds=c.proofs.map(p=>p.id);
 const decision:ContactDecision={schema:1,organizationId:id,revision:c.revision,reviewer:'reviewer',reviewedAt:'2026-09-16T11:00:00Z',checks:Object.fromEntries(CONTACT_CHECKS.map(k=>[k,{state:'passed',reason:'Original checked in fixture',proofIds}])) as ContactDecision['checks'],outcome:'qualified',contacts:[{email:'presse@beispiel.de',role:'Presse',scope:'Stadt',channel:'publishing',proofIds}]};
 const recipients=[{organizationId:id,email:'presse@beispiel.de'}];
 const batch=join(root,'batch.json');writeFileSync(batch,JSON.stringify({recipients,refresh:[{organizationId:id,revision:c.revision,checkedAt:now,discoveryRenewed:true,sourcesUnchanged:true,exclusionsChecked:true,previouslySent:false,excluded:false}]}));
 return {source,output,id,result,c,decision,recipients,batch,original,load};
}
afterEach(()=>{vi.useRealTimers();for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
describe('Local source workflow and real sender gate',()=>{
 it('reads original bytes despite legacy filenames and permits a fully reviewed exact batch',async()=>{
  const f=fixture();expect(f.c.proofs[0].publishedEmails).toContain('presse@beispiel.de');
  submitDecision(f.output,f.c,f.decision,now);
  vi.useFakeTimers();vi.setSystemTime(new Date(now));
  const refreshed=await captureBatchRefresh(f.output,{...f.c,decision:f.decision},vi.fn(async()=>new Response(readFileSync(f.original))) as typeof fetch);
  expect(refreshed).toMatchObject({sourcesUnchanged:true,discoveryRenewed:false,exclusionsChecked:false});
  const batch=JSON.parse(readFileSync(f.batch,'utf8'));batch.refresh=[{...refreshed,reviewer:'batch-reviewer',discoveryRenewed:true,exclusionsChecked:true}];writeFileSync(f.batch,JSON.stringify(batch));
  // No sync after submit: the actual sender must use the authoritative decision.
  expect(requireContactBatch(f.output,f.batch,f.recipients,now).eligible).toBe(true);
  await captureBatchRefresh(f.output,{...f.c,decision:f.decision},vi.fn(async()=>new Response('Changed source')) as typeof fetch);
  expect(()=>requireContactBatch(f.output,f.batch,f.recipients,now)).toThrow('unreviewed');
  expect(()=>requireContactBatch(f.output,f.batch,[{organizationId:f.id,email:'other@beispiel.de'}],now)).toThrow('complete planned batch');
 });
 it('rejects a fresh-check checkbox without actual retained fetch receipts',()=>{
  const f=fixture();submitDecision(f.output,f.c,f.decision,now);
  expect(()=>requireContactBatch(f.output,f.batch,f.recipients,now)).toThrow('missing-refresh-evidence');
 });
 it('keeps changed web content blocked and detects changed receipt bytes',async()=>{
  const f=fixture();vi.useFakeTimers();vi.setSystemTime(new Date(now));const c={...f.c,decision:f.decision};
  const r=await captureBatchRefresh(f.output,c,vi.fn(async()=>new Response('<html>New contact</html>')) as typeof fetch);
  expect(r.sourcesUnchanged).toBe(false);r.reviewer='reviewer';
  expect(refreshEvidenceProblems(f.output,c,r,now)).toContain('invalid-refresh-receipt');
 });
 it('finishes a stalled refresh as a blocking receipt instead of hanging',async()=>{
  const f=fixture();vi.useFakeTimers();vi.setSystemTime(new Date(now));
  const pending=captureBatchRefresh(f.output,{...f.c,decision:f.decision},vi.fn(()=>new Promise<Response>(()=>{})) as typeof fetch);
  await vi.advanceTimersByTimeAsync(12001);expect((await pending).sourcesUnchanged).toBe(false);
 });
 it('blocks changed original bytes and source observations without a sync',()=>{
  const f=fixture();submitDecision(f.output,f.c,f.decision,now);
  writeFileSync(f.original,'<html>Contact removed</html>');
  expect(()=>requireContactBatch(f.output,f.batch,f.recipients,now)).toThrow('unreviewed');
  const result=JSON.parse(readFileSync(f.result,'utf8'));result.pages[0].observedAt=now;writeFileSync(f.result,JSON.stringify(result));
  expect(()=>assertCurrentCase(f.source,f.c)).toThrow('Source revision changed');
 });
 it('does not allocate an active lease twice; expires interrupted work; skips submitted decisions',()=>{
  const f=fixture();const first=claimCase(f.output,'reviewer',now);
  expect(first.organizationId).toBe(f.id);expect(claimCase(f.output,'other',now)).toBeNull();
  const second=claimCase(f.output,'other','2026-09-16T12:31:00Z');expect(second.token).not.toBe(first.token);
  expect(()=>submitClaimedDecision(f.source,f.output,f.c,f.decision,first.token,'2026-09-16T12:31:00Z')).toThrow('exclusive case lease');
  submitDecision(f.output,f.c,f.decision,now);
  expect(claimCase(f.output,'third','2026-09-16T13:02:00Z')).toBeNull();
 });
 it('does not treat an HTTP-success error page as readable contact evidence',()=>{
  const f=fixture();const html='<html><head><title>Seite nicht gefunden</title></head><body>presse@beispiel.de</body></html>';
  writeFileSync(f.original,html);const result=JSON.parse(readFileSync(f.result,'utf8'));result.pages[0].htmlDigest=hash(html);writeFileSync(f.result,JSON.stringify(result));
  buildWorkflow(f.source,f.output,now);const c=f.load();expect(c.proofs[0]).toMatchObject({valid:true,readable:false,publishedEmails:[]});
 });
 it('retains failed or empty source results as negative evidence, never as contact proof',()=>{
  const f=fixture();writeFileSync(f.result,JSON.stringify({organization_id:f.id,engine:'frozen',observed_at:now,status:'no-known-source',pages:[]}));
  buildWorkflow(f.source,f.output,now);const c=f.load();expect(c.proofs[0]).toMatchObject({kind:'failure',valid:true});expect(()=>assertCurrentCase(f.source,c)).not.toThrow();
  const d={...f.decision,revision:c.revision,reviewedAt:now,outcome:'unresolved' as const,contacts:[],checks:Object.fromEntries(CONTACT_CHECKS.map(k=>[k,{state:'blocked',reason:'No official source exists in the frozen input; discovery still required',proofIds:[c.proofs[0].id]}])) as ContactDecision['checks']};
  expect(()=>submitDecision(f.output,c,d,now)).not.toThrow();
 });
 it('replaces an obsolete source-version lease without waiting for its expiry',()=>{
  const f=fixture();const old=claimCase(f.output,'reviewer',now);const r=JSON.parse(readFileSync(f.result,'utf8'));r.pages[0].observedAt=now;writeFileSync(f.result,JSON.stringify(r));buildWorkflow(f.source,f.output,now);
  const replacement=claimCase(f.output,'reviewer',now);expect(replacement.token).not.toBe(old.token);expect(replacement.revision).not.toBe(old.revision);
  expect(()=>submitClaimedDecision(f.source,f.output,f.c,f.decision,old.token,now)).toThrow('exclusive case lease');
 });
 it('does not claim population completeness when the independent roster has a missing municipality',()=>{
  const f=fixture();const path=join(f.source,'reference.json');const bytes=JSON.stringify({regions:[{region_id:f.id,level:'gemeinde'},{region_id:'01000002',level:'gemeinde'}]});writeFileSync(path,bytes);
  writeFileSync(join(f.output,'population-reference.json'),JSON.stringify({sourcePath:path,sourceDigest:hash(bytes),observedAt:now}));
  const s=buildWorkflow(f.source,f.output,now);expect(s.referenceCoverage).toMatchObject({expectedMunicipalities:2,missingIds:['01000002']});expect(s.reviewComplete).toBe(false);
  writeFileSync(path,'{}');expect(()=>buildWorkflow(f.source,f.output,now)).toThrow('Population reference changed');
 });
 it('invalidates reviews for newly added legacy findings instead of silently reusing them',()=>{
  const f=fixture();const root=join(f.source,'contextual','municipality-findings');mkdirSync(root,{recursive:true});
  writeFileSync(join(root,'new.json'),JSON.stringify({organization_id:f.id,issue:'Conflicting person'}));
  expect(()=>assertCurrentCase(f.source,f.c)).toThrow('Source revision changed');
  const summary=buildWorkflow(f.source,f.output,now);expect(summary.withLegacyFindings).toBe(1);expect(summary.reviewed).toBe(0);
 });
});
