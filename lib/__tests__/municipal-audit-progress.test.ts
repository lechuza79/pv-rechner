import { it,expect } from "vitest";
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { municipalAuditProgress } from "../../scripts/municipal-audit-progress";
import { createHash } from "node:crypto";
import { targetFilename } from "../../scripts/lib/contact-batch";
it("never promotes complete source coverage to completed individual review",()=>{
 const dir=mkdtempSync(join(tmpdir(),"audit-progress-"));const target={dataset:"kommunen" as const,organization_id:"1",website:null};const filename=targetFilename(target);
 try {
  mkdirSync(join(dir,"results"));writeFileSync(join(dir,"inventory.json"),JSON.stringify({engine:"e",targets:[target]}));
  const raw=JSON.stringify({organization_id:"1",engine:"e",status:"sources-checked",pages:[],candidates:[]});writeFileSync(join(dir,"results",filename),raw);
  const run=()=>municipalAuditProgress(dir);
  expect(run()).toMatchObject({sourceRunComplete:true,individualReviewComplete:false,sendApproved:false});
  const review={organization_id:"1",sourceDigest:createHash("sha256").update(raw).digest("hex"),reviewedBy:"Source reviewer",reviewedAt:"2026-09-15",verdict:"unresolved",reason:"No official website or contact evidence available.",contacts:[]};
  writeFileSync(join(dir,"reviews",filename),JSON.stringify(review));expect(run()).toMatchObject({individualReviewComplete:true,reviewedWithSupportedContact:0,reviewedUnresolved:1,sendApproved:false});
  writeFileSync(join(dir,"results",filename),raw+" ");expect(run()).toMatchObject({individualReviewComplete:false,invalidReviews:1});
 } finally {rmSync(dir,{recursive:true,force:true});}
},65000);
