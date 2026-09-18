import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { atomicJson } from "./contact-batch";
import { fetchContactPage } from "./contact-fetch";
import { renderContactPage } from "./contact-render";
import { contactCandidates } from "../../lib/contact-evidence";
import { municipalPageText, verifyMunicipalContacts, type MunicipalSource } from "../../lib/municipal-contact-verification";
export type MunicipalAuditInput = {name:string; website:string|null; emails:string[]; urls:string[]; heldEmails:string[]};
export async function auditMunicipality(options: {inputPath:string; inputDigest:string; directory:string; attempt:number; fetcher?:typeof fetch}) {
  const bytes = readFileSync(options.inputPath,"utf8");
  if (createHash("sha256").update(bytes).digest("hex") !== options.inputDigest) throw Error("Municipal audit inputs changed");
  const input: MunicipalAuditInput = JSON.parse(bytes);
  mkdirSync(options.directory,{recursive:true,mode:0o700});
  const sources: MunicipalSource[] = [];
  let domain="";try{domain=new URL(/^https?:/i.test(input.website??"")?input.website!:`https://${input.website}`).hostname.replace(/^www\./,"");}catch{/* Invalid website. */}
  for (const url of input.urls) {
    const key=createHash("sha256").update(url).digest("hex");
    const path=resolve(options.directory,`${key}.json`);
    let cached: (MunicipalSource & {attempt:number;readAttempts?:number}) | null = existsSync(path) ? JSON.parse(readFileSync(path,"utf8")) : null;
    if (cached && cached.url !== url) throw Error("Invalid source checkpoint identity");
    if (!cached || (cached.status !== "read" && (cached.readAttempts ?? 1) < 3)) {
      const page=await fetchContactPage(url,{fetcher:options.fetcher,organizationDomain:domain,render:options.fetcher?undefined:renderContactPage});
      const digest=page.html ? createHash("sha256").update(page.html).digest("hex") : null;
      if(page.html) writeFileSync(resolve(options.directory,`${key}.html`),page.html,{mode:0o600});
      cached={url,finalUrl:page.observation.finalUrl,observedAt:page.observation.observedAt,status:page.observation.status,error:page.observation.error,htmlDigest:digest,candidates:page.observation.candidates,...(page.html?municipalPageText(page.html):{pageIdentity:"",bodyText:""}),attempt:options.attempt,readAttempts:(cached?.readAttempts ?? (cached?1:0))+1};
      atomicJson(path,cached);
    }
    // Reconstruct derived text from the retained HTML rather than trusting an
    // earlier parser's metadata. Raw source observations remain unchanged.
    if (cached.htmlDigest) {
      const html = readFileSync(resolve(options.directory,`${key}.html`),"utf8");
      if (createHash("sha256").update(html).digest("hex") !== cached.htmlDigest) throw Error("Source HTML digest mismatch");
      cached = {...cached,...municipalPageText(html),candidates:contactCandidates(html,cached.finalUrl ?? cached.url,domain)};
    }
    sources.push(cached);
  }
  const emails=[...new Set([...input.emails,...sources.flatMap(s=>s.candidates.map(c=>c.email))])];
  const observedAt=new Date().toISOString();
  const verdicts=verifyMunicipalContacts({...input,emails,sources,asOf:observedAt});
  const unread=sources.filter(s=>s.status!=="read");
  return {status:unread.length?"partial":sources.length?"sources-checked":"no-known-source",verificationMode:"municipal-source-audit",observed_at:observedAt,
    pages:sources.map(({bodyText,...s})=>s),candidates:sources.flatMap(s=>s.candidates),verdicts,
    retryRequired:unread.some(s=>(s.status==="failed"||s.status==="needs-rendering")&&!/HTTP 40[014]/.test(s.error??"")&&((s as MunicipalSource & {readAttempts?:number}).readAttempts??1)<3),
    coverage:{knownSources:input.urls.length,checkedSources:sources.length,readSources:sources.length-unread.length,knownEmails:input.emails.length,evaluatedEmails:emails.length},
    reviewComplete:false,sendApproved:false,
    limits:["Every known source is attempted, not every possible public source.","Source-supported is a strict automatic evidence check, not an independent contextual review or dispatch permission.","Missing dates do not establish recency. Source failures do not establish absence. No deliverability claim."]};
}
