import {contactFindingsIndex,contactStateDigest} from './lib/contact-state-digest';
/** Offline, source-bound full-population comparison. Never approves mailing. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {hash,writePrivate} from './lib/contact-workflow-store';
import {compareContactSelection,storedMunicipalSelection,explicitContactExclusions,historicalMunicipalRecipients} from '../lib/contact-selection-comparison';
const arg=(name:string)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const source=arg('source'),evaluation=arg('evaluation');if(!source||!evaluation)throw Error('Use --source=AUDIT --evaluation=EVALUATION_OUTPUT');
const selectionArg=arg('selection-baseline');if(!selectionArg)throw Error('Provide --selection-baseline=ORIGINAL_SAVED_CONTACT_SNAPSHOT; candidates are not previous recipients');
const selectionPath=resolve(selectionArg),selectionBytes=readFileSync(selectionPath),selectionSnapshot=JSON.parse(selectionBytes.toString());
const sentArg=arg('sent-baseline'),sentPath=sentArg?resolve(sentArg):null,sentBytes=sentPath?readFileSync(sentPath):null,sentSnapshot=sentBytes?JSON.parse(sentBytes.toString()):null;
const base=resolve(source), output=resolve(evaluation), scopePath=resolve(base,'workflow/current-municipal-scope.json'), inventoryPath=resolve(base,'inventory.json');
const scope=read(scopePath),inventory=read(inventoryPath),targets=new Map<string,any>(inventory.targets.map((t:any)=>[t.organization_id,t]));
const summary=read(resolve(output,'summary.json'));const queue=new Map<string,string>(read(resolve(output,'queue.json')).map((r:any)=>[r.id,r.state]));
const findings=contactFindingsIndex(base);const rows:any[]=[];for(const row of scope.items){
 const target=targets.get(row.inventoryOrganizationId);if(!target)throw Error('Missing baseline municipality');
 const bytes=readFileSync(target.audit.inputPath);if(hash(bytes)!==target.audit.inputDigest)throw Error('Baseline changed');
 const baseline=JSON.parse(bytes.toString());const savedSelection=storedMunicipalSelection(selectionSnapshot,row.inventoryOrganizationId);
 const sentEvidence=historicalMunicipalRecipients(sentSnapshot,row.inventoryOrganizationId),sentEmails=sentEvidence.emails;
 const path=resolve(output,'records',row.currentMunicipalityId+'.json');
 if(!existsSync(path)){rows.push({municipalityId:row.currentMunicipalityId,name:row.name,verdict:'not-evaluated',baselineContacts:savedSelection?.length??null,baselineSelectionFound:savedSelection!==null,oldCandidateContacts:(baseline.emails??[]).length});continue;}
 const data=readFileSync(path),r=JSON.parse(data.toString());
 const originalsCurrent=r.sourceManifest.every((p:any)=>!p.valid||(p.path&&existsSync(p.path)&&hash(readFileSync(p.path))===p.digest));
 const current=r.stateDigest===contactStateDigest(base,resolve(base,'workflow'),target,findings.get(target.organization_id)??[])&&!['evaluation-outdated','evaluation-error','not-evaluated'].includes(queue.get(row.currentMunicipalityId)??'')&&summary.engine===r.engine&&summary.scopeDigest===r.scopeDigest&&r.inputDigest===hash(bytes)&&originalsCurrent;
 const selected=r.comparison?.selectedEmails??[];
 const supported=[...r.contacts.filter((c:any)=>c.functionSupported).map((c:any)=>c.email),...(r.existingDecision?.contacts??[]).map((c:any)=>c.email)];
 let historical:any=null,originalAssessmentDigest:string|null=null;
 if(baseline.originalResult&&existsSync(baseline.originalResult)){const originalBytes=readFileSync(baseline.originalResult);const candidate=JSON.parse(originalBytes.toString());if(candidate.engine===baseline.originalEngine&&candidate.organization_id===row.inventoryOrganizationId){historical=candidate;originalAssessmentDigest=hash(originalBytes);}}
 const historicalContacts=new Map<string,any>((historical?.quality?.contacts??[]).map((c:any)=>[c.email.toLowerCase(),c]));
 const newlyQualifiedExisting=(current?selected:[]).filter((email:string)=>(baseline.emails??[]).includes(email)&&supported.includes(email)&&historicalContacts.has(email)&&historicalContacts.get(email).suitability!=='role-indicated');
 const targetRoleProof=[...r.contacts.filter((c:any)=>c.functionSupported).map((c:any)=>c.email),...(r.existingDecision?.contacts??[]).filter((c:any)=>c.channel!=='general').map((c:any)=>c.email)];
 const unconfirmedResponsibility=r.contacts.filter((c:any)=>c.functionSupported&&c.municipalityCoverageConfirmed!==true&&!(r.existingDecision?.contacts??[]).some((reviewed:any)=>reviewed.email===c.email)).map((c:any)=>c.email);
 const exclusions=current?explicitContactExclusions(r.contacts):[];const rejected=exclusions.map(c=>c.email);
 const comparison=compareContactSelection(savedSelection??[],selected,supported,savedSelection!==null&&r.knownSourceChecksComplete,rejected,current,targetRoleProof,unconfirmedResponsibility);
 const candidateComparison=compareContactSelection(baseline.emails??[],selected,supported,r.knownSourceChecksComplete,rejected,current,targetRoleProof,unconfirmedResponsibility);
 const sentComparison=sentEmails.length?compareContactSelection(sentEmails,selected,supported,r.knownSourceChecksComplete,rejected,current,targetRoleProof,unconfirmedResponsibility):null;
 if(candidateComparison.lost.length||sentComparison?.lost.length)comparison.verdict='worse';
 rows.push({municipalityId:row.currentMunicipalityId,name:row.name,...comparison,unconfirmedResponsibility,candidateComparison,sentComparison,sentEmails,sentEvidenceStatus:sentEvidence.status,negativeRoleEvidence:exclusions,baselineSelectionFound:savedSelection!==null,baselineEmails:savedSelection,newlyQualifiedExisting,originalAssessmentPath:originalAssessmentDigest?baseline.originalResult:null,originalAssessmentDigest,current,baselineContacts:savedSelection?.length??null,oldCandidateContacts:(baseline.emails??[]).length,selectedContacts:selected.length,recordPath:path,recordDigest:hash(data),baselineDigest:hash(bytes),channels:r.contacts.filter((c:any)=>c.functionSupported).map((c:any)=>({email:c.email,channels:c.channels,organizations:c.responsibilityScopes,municipalityCoverageConfirmed:c.municipalityCoverageConfirmed})),sourceChecksComplete:r.knownSourceChecksComplete});
}
const count=(verdict:string)=>rows.filter(r=>r.verdict===verdict).length;
const report={selectionBaseline:{kind:'saved-contact-selection',path:selectionPath,digest:hash(selectionBytes)},sentBaseline:sentPath&&sentBytes?{kind:'delivery-records',path:sentPath,digest:hash(sentBytes)}:null,evaluationSummaryDigest:hash(readFileSync(resolve(output,'summary.json'))),observedAt:new Date().toISOString(),scopeDigest:hash(readFileSync(scopePath)),inventoryDigest:hash(readFileSync(inventoryPath)),population:scope.items.length,evaluated:rows.length-count('not-evaluated'),verdicts:Object.fromEntries(['better','equivalent','worse','unresolved','not-evaluated'].map(v=>[v,count(v)])),newlyQualifiedExistingContacts:rows.reduce((n,r)=>n+(r.newlyQualifiedExisting?.length??0),0),newlySelectedContacts:rows.reduce((n,r)=>n+(r.gained?.length??0),0),provenContactGains:rows.reduce((n,r)=>n+(r.candidateComparison?.gained?.length??0),0),unknownHistoricalRecipients:rows.filter(r=>r.sentEvidenceStatus==='original-recipient-unknown').length,provenExcludedOldContacts:rows.reduce((n,r)=>n+(r.rejectedBaseline?.length??0),0),provenRetainedContacts:rows.reduce((n,r)=>n+(r.retained?.length??0),0),lostProvenContacts:rows.reduce((n,r)=>n+new Set([...(r.lost??[]),...(r.candidateComparison?.lost??[]),...(r.sentComparison?.lost??[])]).size,0),unresolvedBaselineContacts:rows.reduce((n,r)=>n+(r.unresolvedBaseline?.length??0),0),approvedForUse:false,sendApproved:false,rows};
writePrivate(resolve(output,'comparison.json'),report);console.log(JSON.stringify({...report,rows:undefined}));
