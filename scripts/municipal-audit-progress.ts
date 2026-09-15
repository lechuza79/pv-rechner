/** Report source coverage separately from individually reviewed municipalities. */
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { atomicJson, targetFilename, type BatchTarget } from "./lib/contact-batch";
import { reviewContactSupported, type ReviewContact } from "./lib/municipal-review-evidence";
const arg=(key:string)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
export function municipalAuditProgress(directory:string){
 directory=resolve(directory);
 const inventory=JSON.parse(readFileSync(resolve(directory,"inventory.json"),"utf8"));
 const queue=[];const counts={total:inventory.targets.length,sourcesAttempted:0,sourcesRead:0,municipalitiesWithSourceResult:0,municipalitiesReviewed:0,reviewedWithSupportedContact:0,reviewedUnresolved:0,invalidReviews:0};
 for(const target of inventory.targets as BatchTarget[]){
  const filename=targetFilename(target);const path=resolve(directory,"results",filename);if(!existsSync(path))continue;
  const raw=readFileSync(path,"utf8");const result=JSON.parse(raw);
  if(result.organization_id!==target.organization_id||result.engine!==inventory.engine)throw Error("Invalid source result identity");
  counts.municipalitiesWithSourceResult++;counts.sourcesAttempted+=result.coverage?.checkedSources??0;counts.sourcesRead+=result.coverage?.readSources??0;
  const sourceDigest=createHash("sha256").update(raw).digest("hex");const reviewPath=resolve(directory,"reviews",filename);
  let reviewed=false;
  if(existsSync(reviewPath)){
   const review=JSON.parse(readFileSync(reviewPath,"utf8"));
   const valid=review.organization_id===target.organization_id&&review.sourceDigest===sourceDigest&&typeof review.reviewedBy==="string"&&review.reviewedBy.trim()&&Number.isFinite(Date.parse(review.reviewedAt))&&["supported-contact","unresolved","no-suitable-contact-in-checked-sources"].includes(review.verdict)&&typeof review.reason==="string"&&review.reason.length>20&&Array.isArray(review.contacts)&&review.contacts.every((contact: ReviewContact)=>reviewContactSupported(directory,target.organization_id,result.pages ?? [],contact))&&(review.verdict!=="supported-contact"||review.contacts.length>0);
   if(valid){reviewed=true;counts.municipalitiesReviewed++;if(review.verdict==="supported-contact")counts.reviewedWithSupportedContact++;else counts.reviewedUnresolved++;}else counts.invalidReviews++;
  }
  if(!reviewed)queue.push({organization_id:target.organization_id,resultPath:path,sourceDigest,reviewPath,sourceStatus:result.status});
 }
 const report={...counts,remainingSourceResults:counts.total-counts.municipalitiesWithSourceResult,remainingIndividualReviews:counts.total-counts.municipalitiesReviewed,sourceRunComplete:counts.total===counts.municipalitiesWithSourceResult,individualReviewComplete:counts.total===counts.municipalitiesReviewed&&counts.invalidReviews===0,sendApproved:false,generatedAt:new Date().toISOString()};
 mkdirSync(resolve(directory,"reviews"),{recursive:true,mode:0o700});atomicJson(resolve(directory,"review-queue.json"),queue);atomicJson(resolve(directory,"review-progress.json"),report);return report;
}
if (/municipal-audit-progress\.ts$/.test(process.argv[1] ?? "")) {
 if(!arg("directory"))throw Error("Use --directory=AUDIT_RUN");
 console.log(JSON.stringify(municipalAuditProgress(arg("directory")!)));
}
