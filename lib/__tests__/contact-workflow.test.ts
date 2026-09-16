import {describe,it,expect} from 'vitest';
import {CONTACT_CHECKS,decisionProblems,summarizeWorkflow,checkContactBatch,type WorkflowCase,type ContactDecision} from '../contact-workflow';
const now='2026-09-16T12:00:00Z';
function fixture():WorkflowCase{
  const proof={id:'proof',url:'https://town.example/contact',digest:'abc',observedAt:'2026-09-16T10:00:00Z',kind:'html' as const,valid:true,publishedEmails:['press@town.example']};
  const decision:ContactDecision={schema:1,organizationId:'01',revision:'revision',reviewer:'original-source-reviewer',reviewedAt:'2026-09-16T11:00:00Z',checks:Object.fromEntries(CONTACT_CHECKS.map(k=>[k,{state:'passed',reason:'Specific original source reviewed',proofIds:['proof']}])) as ContactDecision['checks'],outcome:'qualified',contacts:[{email:'press@town.example',role:'press office',scope:'municipality',channel:'publishing',proofIds:['proof']}]};
  return {organizationId:'01',dataset:'kommunen',name:'Town',unit:'municipality',revision:'revision',baselineEmails:[],proofs:[proof],sourceResultPresent:true,unreadSources:0,candidateCount:1,legacyFindings:1,decision};
}
const refresh={organizationId:'01',revision:'revision',checkedAt:now,discoveryRenewed:true,sourcesUnchanged:true,exclusionsChecked:true,previouslySent:false,excluded:false};
describe('Full contact workflow',()=>{
  it('does not turn collection or legacy excerpts into full reviews',()=>{
    const c=fixture();delete c.decision;const s=summarizeWorkflow([c],now);
    expect(s).toMatchObject({population:1,collected:1,withLegacyFindings:1,reviewed:0,pending:1,reviewComplete:false});
  });
  it('invalidates a prior decision when evidence revision changes',()=>{
    const c=fixture();c.revision='new';expect(summarizeWorkflow([c],now)).toMatchObject({invalidated:1,reviewed:0,newlyProvenAssignments:0});
  });
  it('rejects a fabricated mailbox even with valid source references',()=>{
    const c=fixture();c.decision!.contacts[0].email='guessed@town.example';expect(decisionProblems(c,c.decision!,now)).toContain('mailbox-not-in-original');
  });
  it('requires all checks and permits only evidence-backed unresolved outcomes',()=>{
    const c=fixture();c.decision!.checks.discovery={state:'blocked',reason:'Official source unavailable after attempts',proofIds:['proof']};
    expect(decisionProblems(c,c.decision!,now)).toContain('blocked-check');c.decision!.outcome='unresolved';c.decision!.contacts=[];
    expect(summarizeWorkflow([c],now)).toMatchObject({reviewed:1,unresolved:1,reviewComplete:true,allContactsResolved:false,sendApproved:false});
    c.decision!.checks.discovery.proofIds=[];expect(decisionProblems(c,c.decision!,now)).toContain('missing-or-unproven-discovery');
  });
  it('does not count a general mailbox as a specialist contact',()=>{
    const c=fixture();c.decision!.contacts[0].channel='general';expect(decisionProblems(c,c.decision!,now)).toContain('qualified-without-target-role');
    c.decision!.outcome='fallback';expect(summarizeWorkflow([c],now).fallback).toBe(1);
  });
  it('counts shared mailboxes separately from municipal assignments',()=>{
    const a=fixture(),b=fixture();b.organizationId='02';b.decision!.organizationId='02';
    expect(summarizeWorkflow([a,b],now)).toMatchObject({contactAssignments:2,uniqueMailboxes:1});
    expect(checkContactBatch([a,b],[{organizationId:'01',email:'press@town.example'},{organizationId:'02',email:'PRESS@town.example'}],[refresh,{...refresh,organizationId:'02'}],now).errors).toContain('shared-recipient:02');
  });
  it('blocks outdated, repeated, changed or incompletely refreshed sends',()=>{
    const c=fixture(),batch=[{organizationId:'01',email:'press@town.example'}];
    expect(checkContactBatch([c],batch,[refresh],now).eligible).toBe(true);
    c.heldEmails=['PRESS@town.example'];expect(checkContactBatch([c],batch,[refresh],now).errors).toContain('held-recipient:01');c.heldEmails=[];
    for(const change of [{previouslySent:true},{excluded:true},{sourcesUnchanged:false},{discoveryRenewed:false},{checkedAt:'2026-09-14T12:00:00Z'},{revision:'changed'}])expect(checkContactBatch([c],batch,[{...refresh,...change}],now).eligible).toBe(false);
  });
  it('detects invalid original bytes and missing check evidence',()=>{
    const c=fixture();c.proofs[0].valid=false;expect(decisionProblems(c,c.decision!,now)).toContain('unproven-contact');
  });
});
