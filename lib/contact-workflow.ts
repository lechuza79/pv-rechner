/** Evidence-bound workflow. Collection, review completion and dispatch are separate. */
export const CONTACT_CHECKS = ['identity', 'discovery', 'responsibility', 'conflicts', 'exclusions'] as const;
export type ContactCheck = typeof CONTACT_CHECKS[number];
export type ContactProof = { id: string; url: string; digest: string; observedAt: string; kind: 'html' | 'browser' | 'pdf' | 'failure'; valid: boolean; readable?: boolean; publishedEmails?: string[] };
export type ContactPdfEvidence = {sourcePdfDigest:string;observationDigest?:string;page:number;region:[number,number,number,number];quote:string;associationReason:string};
export type WorkflowContact = { email: string; role: string; scope: string; channel: 'publishing' | 'energy' | 'general'; proofIds: string[]; pdfEvidence?: ContactPdfEvidence };
export type ContactDecision = {
  schema: 1; organizationId: string; revision: string; reviewer: string; reviewedAt: string;
  checks: Record<ContactCheck, { state: 'passed' | 'blocked'; reason: string; proofIds: string[] }>;
  outcome: 'qualified' | 'fallback' | 'unresolved'; contacts: WorkflowContact[];
};
export type WorkflowCase = {
  organizationId: string; dataset: string; name: string; unit: 'municipality' | 'county' | 'organization';
  revision: string; baselineEmails: string[]; heldEmails?: string[]; proofs: ContactProof[];
  sourceResultPresent: boolean; unreadSources: number; candidateCount: number;
  legacyFindings: number; knownSourceChange?: boolean; decision?: ContactDecision;
};
const date = (s: string) => Date.parse(s);
const normalizedEmail = (s: string) => s.trim().toLowerCase();
export function decisionProblems(c: WorkflowCase, d: ContactDecision, asOf: string): string[] {
  const errors: string[] = [];
  if(c.knownSourceChange && d.outcome!=='unresolved')errors.push('known-source-change');
  if (d.schema !== 1 || d.organizationId !== c.organizationId || d.revision !== c.revision) errors.push('changed-case');
  if (!Number.isFinite(date(asOf)) || !d.reviewer?.trim() || !Number.isFinite(date(d.reviewedAt)) || date(d.reviewedAt) > date(asOf)) errors.push('invalid-reviewer-or-date');
  const proofs = new Map(c.proofs.map(p => [p.id, p]));
  const valid = (ids: string[], readable: boolean) => Array.isArray(ids) && ids.length > 0 && ids.every(id => {
    const p = proofs.get(id);
    return p?.valid && (!readable || (p.kind !== 'failure' && p.readable !== false)) && Number.isFinite(date(p.observedAt)) && date(p.observedAt) <= date(d.reviewedAt);
  });
  for (const key of CONTACT_CHECKS) {
    const check = d.checks?.[key];
    if (!check || !['passed', 'blocked'].includes(check.state) || !check.reason?.trim() || !valid(check.proofIds, check.state === 'passed')) errors.push(`missing-or-unproven-${key}`);
  }
  if (!['qualified', 'fallback', 'unresolved'].includes(d.outcome)) errors.push('invalid-outcome');
  const blocked = CONTACT_CHECKS.some(k => d.checks?.[k]?.state === 'blocked');
  if (d.outcome !== 'unresolved' && blocked) errors.push('blocked-check');
  if (d.outcome === 'unresolved' && !blocked) errors.push('unresolved-without-concrete-blocker');
  if (!Array.isArray(d.contacts)) return [...errors, 'invalid-contacts'];
  if (d.outcome !== 'unresolved' && !d.contacts.length) errors.push('missing-contact');
  if (d.outcome === 'unresolved' && d.contacts.length) errors.push('unresolved-contacts-must-remain-candidates');
  const emails = new Set<string>();
  for (const contact of d.contacts) {
    if (!contact || typeof contact.email !== 'string' || !Array.isArray(contact.proofIds)) { errors.push('invalid-contact-shape'); continue; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || emails.has(normalizedEmail(contact.email))) errors.push('invalid-or-duplicate-contact');
    emails.add(normalizedEmail(contact.email));
    if (!contact.role?.trim() || !contact.scope?.trim() || !['publishing','energy','general'].includes(contact.channel) || !valid(contact.proofIds, true)) errors.push('unproven-contact');
    if (!contact.proofIds?.some(id => proofs.get(id)?.publishedEmails?.map(normalizedEmail).includes(normalizedEmail(contact.email)))) errors.push('mailbox-not-in-original');
  }
  if (d.outcome === 'qualified' && !d.contacts.some(c => c?.channel !== 'general')) errors.push('qualified-without-target-role');
  if (d.outcome === 'fallback' && d.contacts.some(c => c?.channel !== 'general')) errors.push('fallback-with-target-role');
  return [...new Set(errors)];
}
export function workflowState(c: WorkflowCase, asOf: string) {
  if (c.decision) {
    const problems = decisionProblems(c, c.decision, asOf);
    if (!problems.length) return { state: c.decision.outcome, completed: true, problems };
    return { state: 'review-invalidated', completed: false, problems };
  }
  return { state: c.sourceResultPresent ? 'review-pending' : 'collection-pending', completed: false, problems: [] as string[] };
}
/** Full population denominator, and counts of addresses distinct from organizations. */
export function summarizeWorkflow(cases: WorkflowCase[], asOf: string) {
  if (new Set(cases.map(c => `${c.dataset}:${c.organizationId}`)).size !== cases.length) throw Error('Duplicate inventory record');
  const states = cases.map(c => ({ c, ...workflowState(c, asOf) }));
  const contacts = states.filter(s => s.completed).flatMap(s => s.c.decision!.contacts.map(contact => ({ ...contact, organizationId:s.c.organizationId, baseline:s.c.baselineEmails })));
  return {
    observedAt:asOf, population:cases.length, municipalities:cases.filter(c=>c.unit==='municipality').length, counties:cases.filter(c=>c.unit==='county').length,
    collected:cases.filter(c=>c.sourceResultPresent).length, withLegacyFindings:cases.filter(c=>c.legacyFindings>0).length,
    reviewed:states.filter(s=>s.completed).length, qualified:states.filter(s=>s.state==='qualified').length,
    fallback:states.filter(s=>s.state==='fallback').length, unresolved:states.filter(s=>s.state==='unresolved').length,
    invalidated:states.filter(s=>s.state==='review-invalidated').length, pending:states.filter(s=>!s.completed).length,
    contactAssignments:contacts.length, uniqueMailboxes:new Set(contacts.map(c=>normalizedEmail(c.email))).size,
    newlyProvenAssignments:contacts.filter(c=>!c.baseline.map(normalizedEmail).includes(normalizedEmail(c.email))).length,
    retainedProvenAssignments:contacts.filter(c=>c.baseline.map(normalizedEmail).includes(normalizedEmail(c.email))).length,
    reviewComplete:cases.length>0 && states.every(s=>s.completed), allContactsResolved:cases.length>0 && states.every(s=>s.completed&&s.state!=='unresolved'),
    sendApproved:false,
  };
}
export type DispatchRefresh = {
  organizationId:string; revision:string; checkedAt:string;
  discoveryRenewed:boolean; sourcesUnchanged:boolean; exclusionsChecked:boolean; previouslySent:boolean; excluded:boolean;
};
/** Fresh full-batch gate; never permits a send itself. General fallbacks require an explicit batch choice. */
export function checkContactBatch(cases:WorkflowCase[], batch:{organizationId:string;email:string}[], refresh:DispatchRefresh[], asOf:string, allowGeneral=false) {
  const errors:string[]=[];const seen=new Set<string>();const organizations=new Set<string>();
  if (!Number.isFinite(date(asOf)) || !batch.length) errors.push('invalid-batch');
  if(new Set(cases.map(c=>c.organizationId)).size!==cases.length)errors.push('ambiguous-case-identity');
  for(const row of batch){
    const email=normalizedEmail(row.email);const c=cases.find(c=>c.organizationId===row.organizationId);
    if(seen.has(email))errors.push(`shared-recipient:${row.organizationId}`);seen.add(email);
    if(organizations.has(row.organizationId))errors.push(`duplicate-organization:${row.organizationId}`);organizations.add(row.organizationId);
    if(!c || !workflowState(c,asOf).completed || c.decision?.outcome==='unresolved'){errors.push(`unreviewed:${row.organizationId}`);continue;}
    if(c.heldEmails?.map(normalizedEmail).includes(email))errors.push(`held-recipient:${row.organizationId}`);
    const contact=c.decision!.contacts.find(c=>normalizedEmail(c.email)===email);
    if(!contact || (!allowGeneral && contact.channel==='general'))errors.push(`unapproved-recipient:${row.organizationId}`);
    const matches=refresh.filter(r=>r.organizationId===row.organizationId);const r=matches[0];
    if(matches.length!==1 || !r || r.revision!==c.revision || !Number.isFinite(date(r.checkedAt)) || date(r.checkedAt)>date(asOf) || date(asOf)-date(r.checkedAt)>24*3600*1000 || date(r.checkedAt)<date(c.decision!.reviewedAt) || !r.discoveryRenewed || !r.sourcesUnchanged || !r.exclusionsChecked || r.previouslySent || r.excluded)errors.push(`missing-or-failed-refresh:${row.organizationId}`);
  }
  return {eligible:errors.length===0,errors,checked:batch.length,sendApproved:false};
}
