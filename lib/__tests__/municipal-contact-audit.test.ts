import { it,expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync,readFileSync,writeFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditMunicipality } from "../../scripts/lib/municipal-contact-audit";
it("checks every known source, resumes completed reads, retries failures and never grants dispatch",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"municipal-audit-"));
 try {
  const inputPath=join(dir,"input.json");writeFileSync(inputPath,JSON.stringify({name:"Musterstadt",website:"https://stadt.de",emails:["old@stadt.de"],heldEmails:[],urls:["https://stadt.de/a","https://stadt.de/b"]}));
  const inputDigest=createHash("sha256").update(readFileSync(inputPath)).digest("hex");const calls:string[]=[];
  const fetcher=(async(url: string | URL | Request)=>{calls.push(String(url));return String(url).endsWith('/b')&&calls.length===2 ? new Response("error",{status:503}) : new Response('<title>Stadt Musterstadt</title><p>Pressestelle <a href="mailto:presse@stadt.de">presse@stadt.de</a></p>',{headers:{"content-type":"text/html"}});}) as typeof fetch;
  const one=await auditMunicipality({inputPath,inputDigest,directory:join(dir,"sources"),attempt:1,fetcher});
  expect(one.coverage.checkedSources).toBe(2);expect(one.retryRequired).toBe(true);expect(one.reviewComplete).toBe(false);expect(one.sendApproved).toBe(false);
  const two=await auditMunicipality({inputPath,inputDigest,directory:join(dir,"sources"),attempt:2,fetcher});
  expect(calls).toEqual(["https://stadt.de/a","https://stadt.de/b","https://stadt.de/b"]);expect(two.status).toBe("sources-checked");
  expect(two.verdicts.find(v=>v.email==="old@stadt.de")?.status).toBe("not-reconfirmed");
  const checkpoint=join(dir,"sources",createHash("sha256").update("https://stadt.de/a").digest("hex")+".json");
  const old=JSON.parse(readFileSync(checkpoint,"utf8"));old.candidates=[];writeFileSync(checkpoint,JSON.stringify(old));
  const retained=readFileSync(checkpoint,"utf8");
  const repaired=await auditMunicipality({inputPath,inputDigest,directory:join(dir,"sources"),attempt:3,fetcher});
  expect(repaired.pages[0].candidates.map(c=>c.email)).toContain("presse@stadt.de");
  expect(repaired.pages[0].observedAt).toBe(old.observedAt);
  expect(readFileSync(checkpoint,"utf8")).toBe(retained);
  expect(calls).toHaveLength(3);
  writeFileSync(inputPath,"{}");await expect(auditMunicipality({inputPath,inputDigest,directory:dir,attempt:3,fetcher})).rejects.toThrow("inputs changed");
 } finally {rmSync(dir,{recursive:true,force:true});}
});
