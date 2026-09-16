/** Compare both inventories against the SAME current source-backed judgments.
 * rejectedWithProof must contain explicit, current source-backed exclusions;
 * missing positive evidence never establishes rejection. */
export function compareContactSelection(baseline:string[], selected:string[], supported:string[], complete:boolean, rejectedWithProof:string[]=[], current=true, targetRoleProof:string[]=supported, unconfirmedResponsibility:string[]=[]){
 const normalized=(xs:string[])=>[...new Set(xs.map(x=>x.trim().toLowerCase()))].sort();
 const old=normalized(baseline), next=normalized(selected), proof=new Set(normalized(supported).filter(email=>!normalized(unconfirmedResponsibility).includes(email))), rejected=new Set(normalized(rejectedWithProof));
 // Stale judgments must not contribute current proof counts in any aggregate.
 if(!current)return {verdict:'unresolved',retained:[],gained:[],lost:[],unresolvedBaseline:old,unsupportedSelected:next,rejectedBaseline:[],rejectedSelected:[],conflictingJudgments:[],current:false};
 const relevant=new Set([...old,...next]);
 const conflictingJudgments=[...proof].filter(x=>rejected.has(x)&&relevant.has(x)).sort();
 const retained=old.filter(x=>next.includes(x)&&proof.has(x)&&!rejected.has(x));
 const gained=next.filter(x=>!old.includes(x)&&proof.has(x)&&!rejected.has(x));
 const lost=old.filter(x=>proof.has(x)&&!rejected.has(x)&&!next.includes(x));
 const rejectedBaseline=old.filter(x=>rejected.has(x)&&!proof.has(x));
 const rejectedSelected=next.filter(x=>rejected.has(x)&&!proof.has(x));
 const unresolvedBaseline=old.filter(x=>(!proof.has(x)&&!rejected.has(x))||(proof.has(x)&&rejected.has(x)));
 const unsupportedSelected=next.filter(x=>!proof.has(x)||rejected.has(x));
 // A missing proof is open; a documented unsuitable contact can be retired.
 const targetRoles=new Set(normalized(targetRoleProof));
 const verdict=conflictingJudgments.length?'unresolved':lost.length?'worse':!complete||unresolvedBaseline.length||unsupportedSelected.length?'unresolved':gained.some(email=>targetRoles.has(email))?'better':'equivalent';
 return {verdict,retained,gained,lost,unresolvedBaseline,unsupportedSelected,rejectedBaseline,rejectedSelected,conflictingJudgments,current:true};
}

/** Saved contact fields are a selection snapshot, not proof of delivery. */
export function storedMunicipalSelection(snapshot:{kommunen:{region_id:string;email?:string|null;rollen_email?:string|null;presse_email?:string|null;personen_email?:string|null}[]},id:string){
 const matches=snapshot.kommunen.filter(row=>row.region_id===id);
 if(matches.length!==1)return null;
 const row=matches[0];return [...new Set([row.email,row.rollen_email,row.presse_email,row.personen_email].filter((mail):mail is string=>typeof mail==='string'&&mail.includes('@')).map(mail=>mail.trim().toLowerCase()))];
}
/** Only explicit exclusive official cards establish a negative role judgment.
 * Generic mailboxes, missing proof, holds and ambiguous roles remain open. */
export function explicitContactExclusions(contacts:{email:string;evidence:{originalSupported:boolean;functionSupported:boolean;reasons:string[];evidence:string;sourceUrl:string;sourceDigest:string}[]}[]){
 const role=/pressestelle|pressereferat|pressearbeit|pressekontakt|öffentlichkeitsarbeit|klimaschutz|energieberatung|energiemanagement/iu;
 const negative=/datenschutzbeauftrag|technische umsetzung|webdesign|anzeigenverkauf|hausmeister|gebäudereinigung/iu;
 const allowed=new Set(['excluded-or-conflicting-purpose','conflicting-person-responsibility','explicit-role-evidence-required','municipal-scope-not-explicit-in-contact-card','mailbox-authority-unconfirmed','shared-authority-scope-needs-review']);
 const withoutMail=(text:string)=>text.replace(/[\w.+%-]+\s*(?:@|\(at\)|\[at\])\s*[\w.-]+/giu,'');
 return contacts.flatMap(contact=>{
  if(contact.evidence.some(e=>e.functionSupported||role.test(withoutMail(e.evidence))))return [];
  const proofs=contact.evidence.filter(e=>e.originalSupported&&e.sourceDigest&&e.reasons.every(reason=>allowed.has(reason))&&negative.test(withoutMail(e.evidence)));
  return proofs.length?[{email:contact.email,proofs:proofs.map(e=>({sourceUrl:e.sourceUrl,sourceDigest:e.sourceDigest,quote:e.evidence}))}]:[];
 });
}

/** Historical delivery evidence stays separate from currently saved mailboxes. */
export function historicalMunicipalRecipients(snapshot:any,id:string){
 const targets=(snapshot?.targets??[]).filter((row:any)=>row.organizationId===id);
 const recorded=targets.filter((row:any)=>row.sentMessageId&&row.contactedAt&&typeof row.sentTo==='string').map((row:any)=>row.sentTo.toLowerCase());
 const normalize=(text:string)=>text.normalize('NFKC').replace(/\s+/gu,' ').trim();
 const quoted=(snapshot?.recipients??[]).filter((review:any)=>review.organizationId===id).map((review:any)=>{
  const source=(snapshot.sources??[]).find((source:any)=>source.id===review.sourceId);
  const mailboxes=String(review.quote??'').match(/[\w.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)??[];
  if(!source||source.kind!=='mail'||!review.reviewedBy?.trim()||!Number.isFinite(Date.parse(review.reviewedAt))||!normalize(review.quote)||!normalize(source.text).includes(normalize(review.quote))||!mailboxes.some((mail:string)=>mail.toLowerCase()===review.mailbox.toLowerCase()))throw Error('Historical recipient lacks original quotation');
  return review.mailbox.toLowerCase();
 });
 const emails=[...new Set<string>([...recorded,...quoted])];
 return {emails,status:recorded.length?'recorded-delivery':quoted.length?'quoted-recipient-history':targets.length?'original-recipient-unknown':'not-in-sent-cohort'};
}
