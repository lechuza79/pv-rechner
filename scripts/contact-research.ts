/** Shared, additive contact research. Never sends mail or overwrites campaign choices. */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { recordContactPage, contactEvidenceDirectory } from "./lib/contact-fetch";
import { crawlContacts } from "./lib/contact-crawl";
import { renderContactPage } from "./lib/contact-render";

const DATASETS = {
  kommunen: { table: "kommunen_kontakt", id: "region_id", url: "website" },
  fachbetriebe: { table: "fachbetriebe", id: "domain", url: "domain" },
  presse: { table: "presse_medien", id: "domain", url: "domain" },
  versorger: { table: "utilities", id: "id", url: "website" },
} as const;
const arg = (name: string) => process.argv.find(x => x.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });

async function main() {
  if (process.argv.includes("--setup")) {
    const { error } = await db.rpc("exec_sql", { sql: `
      CREATE TABLE IF NOT EXISTS contact_research_runs (
        id uuid PRIMARY KEY, dataset text NOT NULL, organization_id text NOT NULL,
        observed_at timestamptz NOT NULL, status text NOT NULL,
        pages jsonb NOT NULL, candidates jsonb NOT NULL, pending_urls jsonb NOT NULL
      );
      ALTER TABLE contact_research_runs ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON contact_research_runs FROM PUBLIC, anon, authenticated;
      GRANT SELECT, INSERT ON contact_research_runs TO service_role;
      CREATE INDEX IF NOT EXISTS contact_research_organization ON contact_research_runs(dataset, organization_id, observed_at DESC);
      ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS sent_to text;
      ALTER TABLE kommunen_kontakt ADD COLUMN IF NOT EXISTS sent_message_id text;
    ` });
    if (error) throw error;
    console.log("Private research history and sent-message fields ready.");
    return;
  }
  const dataset = arg("dataset") as keyof typeof DATASETS;
  if (!DATASETS[dataset]) throw Error("Use --dataset=kommunen|fachbetriebe|presse|versorger [--limit=10] [--id=...] [--write]");
  const cfg = DATASETS[dataset];
  const limit = Number(arg("limit") ?? 10);
  const pageBudget = Number(arg("pages") ?? 12);
  if (!Number.isInteger(pageBudget) || pageBudget < 1 || pageBudget > 30) throw Error("pages must be 1..30");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Error("limit must be 1..100");
  let rows: { organization_id: string; website: string | null; sourceUrl?: string; evidence?: string }[];
  if (arg("manifest")) {
    const input = JSON.parse(readFileSync(resolve(arg("manifest")!), "utf8"));
    if (!Array.isArray(input.targets)) throw Error("Manifest requires targets");
    rows = input.targets.filter((t: { dataset: string }) => t.dataset === dataset).slice(0, limit);
    for (const row of rows) {
      if (!row.organization_id || !row.website || !row.sourceUrl || !row.evidence) throw Error("A supplied website requires organization_id, sourceUrl and identity evidence");
    }
  } else {
    let query = db.from(cfg.table).select(`${cfg.id},${cfg.url}`).order(cfg.id).limit(limit);
    if (arg("after")) query = query.gt(cfg.id, arg("after")!);
    if (arg("id")) query = query.eq(cfg.id, arg("id")!);
    const { data, error } = await query;
    if (error) throw error;
    rows = (data ?? []).map(raw => { const row = raw as unknown as Record<string, string | null>; return { organization_id: row[cfg.id]!, website: row[cfg.url] }; });
  }
  for (const row of rows) {
    const crawl = await crawlContacts({ website: row.website, dataset, pageBudget,
      render: renderContactPage, record: o => recordContactPage(dataset, o) });
    const result = { id: randomUUID(), dataset, organization_id: row.organization_id, observed_at: new Date().toISOString(), source: row, ...crawl };
    const dir = resolve(contactEvidenceDirectory(), "organizations");
    mkdirSync(dir, { recursive:true, mode:0o700 });
    writeFileSync(resolve(dir, `${result.id}.json`), JSON.stringify(result,null,2), {mode:0o600});
    if (process.argv.includes("--write")) {
      const { error: saveError } = await db.from("contact_research_runs").insert({ id: result.id, dataset, organization_id: result.organization_id, observed_at: result.observed_at, status: result.status, pages: result.pages, candidates: result.candidates, pending_urls: result.pending_urls });
      if (saveError) throw saveError;
    }
    console.log(JSON.stringify({ dataset, id:row.organization_id, status:result.status, pages:result.pages.length, candidates:result.candidates.length, pending:result.pending_urls.length }));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
