/** Full inventory crawl, local evidence first. No mail or paid search requests. */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, openSync, closeSync, unlinkSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { crawlContacts } from "./lib/contact-crawl";
import { contactEvidenceDirectory, recordContactPage } from "./lib/contact-fetch";
import { renderContactPage } from "./lib/contact-render";
import { atomicJson, runContactBatch, targetFilename, type BatchTarget } from "./lib/contact-batch";
const arg = (key: string) => process.argv.find(value => value.startsWith(`--${key}=`))?.slice(key.length + 3);
const tables = {
  kommunen: {table:"kommunen_kontakt", id:"region_id", website:"website", classification:null},
  fachbetriebe: {table:"fachbetriebe", id:"domain", website:"domain", classification:"art"},
  presse: {table:"presse_medien", id:"domain", website:"domain", classification:"ist_medium"},
  versorger: {table:"utilities", id:"id", website:"website", classification:null},
} as const;
async function main() {
  const dir = resolve(arg("directory") ?? resolve(contactEvidenceDirectory(), "full-qualification"));
  mkdirSync(dir, {recursive:true, mode:0o700});
  const manifestPath = resolve(dir,"inventory.json");
  const pageBudget = Number(arg("pages") ?? 20);
  const concurrency = Number(arg("concurrency") ?? 4);
  if (!Number.isInteger(pageBudget) || pageBudget < 1 || pageBudget > 30) throw Error("pages must be 1..30");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw Error("concurrency must be 1..8");
  const codeFiles = ["lib/contact-evidence.ts", "lib/published-joomla-mail.ts", "lib/contact-discovery.ts", "lib/contact-quality.ts", "lib/contact-quality-evidence.ts", "scripts/lib/contact-fetch.ts", "scripts/lib/contact-crawl.ts", "scripts/lib/contact-render.ts", "scripts/lib/contact-batch.ts", "scripts/contact-full-research.ts", "scripts/lib/contact-deadline.ts", "lib/uri-sicher.ts", "lib/personen-fund.ts", "package-lock.json", "lib/municipal-contact-verification.ts", "scripts/lib/municipal-contact-audit.ts", "scripts/contact-supervised-worker.ts"];
  const engine = createHash("sha256").update(codeFiles.map(path=>readFileSync(resolve(path),"utf8")).join("\n")).digest("hex");
  let inventory: {createdAt:string; engine:string; pageBudget:number; targets:BatchTarget[]};
  if (existsSync(manifestPath)) {
    inventory = JSON.parse(readFileSync(manifestPath,"utf8"));
    if (inventory.engine !== engine || inventory.pageBudget !== pageBudget) throw Error("Engine or budget differs from frozen inventory; use a new directory");
  } else {
    for (const line of readFileSync(resolve(".env.local"),"utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_KEY!,{auth:{persistSession:false}});
    const targets: BatchTarget[] = [];
    for (const [dataset,cfg] of Object.entries(tables)) {
      let after: string | null = null;
      while (true) {
        const fields = [...new Set([cfg.id,cfg.website,...(cfg.classification ? [cfg.classification] : [])])].join(",");
        let query = db.from(cfg.table).select(fields).order(cfg.id).limit(500);
        if (after) query = query.gt(cfg.id,after);
        const {data,error} = await query;
        if (error) throw error;
        const rows = (data ?? []) as unknown as Record<string,string|null>[];
        for (const row of rows) {
          if (!row[cfg.id]) throw Error("Inventory row without identity");
          targets.push({dataset:dataset as BatchTarget["dataset"], organization_id:row[cfg.id]!,website:row[cfg.website],priorClassification:cfg.classification ? row[cfg.classification] : null});
        }
        if (rows.length < 500) break;
        after = rows.at(-1)![cfg.id]!;
      }
    }
    inventory = {createdAt:new Date().toISOString(),engine,pageBudget,targets};
    atomicJson(manifestPath,inventory);
  }
  const counts = Object.fromEntries(Object.keys(tables).map(dataset=>[dataset,inventory.targets.filter(t=>t.dataset===dataset).length]));
  console.log(JSON.stringify({directory:dir, inventory:counts, total:inventory.targets.length, maximumPageRequests:inventory.targets.length * pageBudget, paidSearchRequests:0, databaseWrites:0}));
  if (!process.argv.includes("--execute")) return;
  const lockPath = resolve(dir,"running.lock");
  const lock = openSync(lockPath,"wx",0o600);
  closeSync(lock);
  // A surviving lock after a process crash requires a process check before removal.
  const keepAlive = setInterval(()=>{},1000);
  const startedAt = new Date().toISOString();
  const resultsDir = resolve(dir,"results");
  try {
    await runContactBatch({targets:inventory.targets, directory:resultsDir, concurrency,
      run:async target => ({id:randomUUID(), observed_at:new Date().toISOString(),engine,
        ...await crawlContacts({website:target.website,dataset:target.dataset,pageBudget,render:renderContactPage,record:page=>recordContactPage(target.dataset,page)})}),
      progress:(completed,total)=>{if(completed % 25 === 0 || completed===total) console.log(JSON.stringify({completed,total,at:new Date().toISOString()}));},
    });
    const outcomes: Record<string,number> = {}; const quality: Record<string,number> = {};
    let requests = 0; let unknownRequestCounts = 0;
    for (const target of inventory.targets) {
      const result = JSON.parse(readFileSync(resolve(resultsDir,targetFilename(target)),"utf8"));
      outcomes[result.status] = (outcomes[result.status] ?? 0)+1;
      const key = result.quality?.status ?? "run-failed";
      quality[key] = (quality[key] ?? 0)+1; if (typeof result.requests === "number") requests += result.requests; else unknownRequestCounts++;
    }
    const report = {startedAt,finishedAt:new Date().toISOString(),engine,inventory:counts,expected:inventory.targets.length,recorded:readdirSync(resultsDir).filter(f=>f.endsWith(".json")).length,outcomes,quality,recordedRequests:requests,unknownRequestCounts,failedResultsRequireSeparateRetry:true,completeness:"All inventory rows attempted; public contact completeness not proven"};
    atomicJson(resolve(dir,"summary.json"),report); console.log(JSON.stringify(report));
  } finally {clearInterval(keepAlive); unlinkSync(lockPath);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
