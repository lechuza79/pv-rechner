/** Freeze the complete municipal inventory and known sources for a read-only audit. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { atomicJson, targetFilename, type BatchTarget } from "./lib/contact-batch";
import { contactUrl } from "../lib/contact-discovery";
const arg=(key:string)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
const digest=(text:string)=>createHash("sha256").update(text).digest("hex");
async function main(){
  if(!arg("directory")||!arg("source"))throw Error("Use --directory=NEW_DIRECTORY --source=ORIGINAL_FULL_RUN [--holds=REVIEW_HOLDS]");
  const directory=resolve(arg("directory")!);const source=resolve(arg("source")!);
  if(existsSync(resolve(directory,"inventory.json")))throw Error("Inventory already exists; resume it with its frozen supervisor");
  const original=JSON.parse(readFileSync(resolve(source,"inventory.json"),"utf8"));
  const originalById=new Map<string,BatchTarget>(original.targets.filter((t:BatchTarget)=>t.dataset==="kommunen").map((t:BatchTarget)=>[t.organization_id,t]));
  for(const line of readFileSync(".env.local","utf8").split("\n")){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
  const db=createClient(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_KEY!,{auth:{persistSession:false}});
  type Row={region_id:string;website:string|null;rollen_email:string|null;presse_email:string|null;kontakt_url:string|null;impressum_url:string|null};
  const records:Row[]=[];let after="";
  for(;;){const {data,error}=await db.from("kommunen_kontakt").select("region_id,website,rollen_email,presse_email,kontakt_url,impressum_url").gt("region_id",after).order("region_id").limit(500).abortSignal(AbortSignal.timeout(20000));if(error)throw error;records.push(...data);if(data.length<500)break;after=data.at(-1)!.region_id;}
  const names=new Map<string,string>();after="";
  for(;;){const {data,error}=await db.from("mastr_regions").select("region_id,name").gt("region_id",after).order("region_id").limit(1000).abortSignal(AbortSignal.timeout(20000));if(error)throw error;for(const r of data)names.set(r.region_id,r.name);if(data.length<1000)break;after=data.at(-1)!.region_id;}
  const holds=arg("holds")?JSON.parse(readFileSync(resolve(arg("holds")!),"utf8")).holds:[];
  mkdirSync(resolve(directory,"inputs"),{recursive:true,mode:0o700});
  const targets=[];let sourceCount=0;let emailCount=0;
  for(const r of records){
    const target:BatchTarget={dataset:"kommunen",organization_id:r.region_id,website:r.website};
    const oldTarget=originalById.get(r.region_id);
    const oldPath=oldTarget?resolve(source,"results",targetFilename(oldTarget)):null;
    const old=oldPath&&existsSync(oldPath)?JSON.parse(readFileSync(oldPath,"utf8")):null;
    if(old&&(old.organization_id!==r.region_id||old.dataset!=="kommunen"))throw Error("Original result identity mismatch");
    const site=r.website?(/^https?:/i.test(r.website)?r.website:`https://${r.website}`):null;
    const urls=[...new Set<string>([site,r.kontakt_url,r.impressum_url,...(old?.pages??[]).map((p:{requestedUrl:string})=>p.requestedUrl),...(old?.candidates??[]).map((c:{sourceUrl:string})=>c.sourceUrl),...(old?.pending_urls??[]),...(old?.external_sources??[])].filter((u):u is string=>typeof u==="string").map(u=>contactUrl(u,site??undefined)).filter((u):u is string=>!!u))];
    const emails=[...new Set<string>([r.rollen_email,r.presse_email,...(old?.candidates??[]).map((c:{email:string})=>c.email)].filter((s):s is string=>!!s).map(s=>s.toLowerCase()))];
    const input={name:names.get(r.region_id)??"",website:r.website,emails,urls,heldEmails:holds.filter((h:{dataset:string;organization_id:string})=>h.dataset==="kommunen"&&h.organization_id===r.region_id).map((h:{email:string})=>h.email),originalResult:oldPath,originalEngine:original.engine};
    const inputPath=resolve(directory,"inputs",targetFilename(target));atomicJson(inputPath,input);
    targets.push({...target,organizationName:input.name,audit:{inputPath,inputDigest:digest(readFileSync(inputPath,"utf8")),directory:resolve(directory,"sources",r.region_id)}});
    sourceCount+=urls.length;emailCount+=emails.length;
  }
  const codeFiles=["lib/contact-evidence.ts", "lib/published-joomla-mail.ts", "lib/contact-discovery.ts", "lib/contact-quality.ts", "lib/contact-quality-evidence.ts", "scripts/lib/contact-fetch.ts", "scripts/lib/contact-crawl.ts", "scripts/lib/contact-render.ts", "scripts/lib/contact-batch.ts", "scripts/contact-full-research.ts", "scripts/lib/contact-deadline.ts", "lib/uri-sicher.ts", "lib/personen-fund.ts", "package-lock.json", "lib/municipal-contact-verification.ts", "scripts/lib/municipal-contact-audit.ts", "scripts/contact-supervised-worker.ts"];
  const inventory={createdAt:new Date().toISOString(),engine:digest(codeFiles.map(f=>readFileSync(f,"utf8")).join("\n")),pageBudget:30,mode:"municipal-source-audit",targets,knownSources:sourceCount,knownEmails:emailCount,sourceInventory:source,limits:"Whole current municipal contact table; every known source and mailbox. Not a claim that unknown public contacts are covered."};
  atomicJson(resolve(directory,"inventory.json"),inventory);
  console.log(JSON.stringify({directory,municipalities:targets.length,knownSources:sourceCount,knownEmails:emailCount,missingNames:targets.filter(t=>!t.organizationName).length,databaseWrites:0}));
}
main().catch(e=>{console.error(String(e));process.exitCode=1;});
