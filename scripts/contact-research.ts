/** Shared, additive contact research. Never sends mail or overwrites campaign choices. */
import { load } from "cheerio";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchContactPage, recordContactPage, contactEvidenceDirectory, type PageObservation } from "./lib/contact-fetch";
import { sameDomain } from "../lib/contact-evidence";

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
  let query = db.from(cfg.table).select(`${cfg.id},${cfg.url}`).not(cfg.url, "is", null).order(cfg.id).limit(limit);
  if (arg("id")) query = query.eq(cfg.id, arg("id")!);
  const { data, error } = await query;
  if (error) throw error;
  for (const raw of data ?? []) {
    const row = raw as unknown as Record<string, string>;
    const basis = /^https?:\/\//.test(row[cfg.url]) ? row[cfg.url] : `https://${row[cfg.url]}`;
    const host = new URL(basis).hostname.replace(/^www\./, "");
    const pending = new Map<string, number>([[basis, 200]]);
    const visited = new Set<string>();
    const pages: PageObservation[] = [];
    // Candidate discovery never stops at the first mailbox.
    while (pending.size && pages.length < pageBudget) {
      const [url] = [...pending].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
      pending.delete(url); visited.add(url);
      const result = await fetchContactPage(url, { organizationDomain: host, record: o => recordContactPage(dataset, o) });
      pages.push(result.observation);
      if (!result.html) continue;
      const base = result.observation.finalUrl!;
      const $ = load(result.html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href")!;
        if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
        let target: URL;
        try { target = new URL(href, base); } catch { return; }
        target.hash = "";
        if (!/^https?:$/.test(target.protocol) || !sameDomain(target.hostname.replace(/^www\./,""), host)) return;
        const text = `${target.pathname} ${$(el).text()}`.toLowerCase();
        const rank = /presse|redaktion|ansprechpartner|team|mitarbeiter/.test(text) ? 100 : /impressum|imprint/.test(text) ? 90 : /kontakt|contact/.test(text) ? 80 : 0;
        if (rank && !visited.has(target.href)) pending.set(target.href, rank);
      });
    }
    const candidates = pages.flatMap(p=>p.candidates);
    const result = { id: randomUUID(), dataset, organization_id: row[cfg.id], observed_at: new Date().toISOString(),
      status: pages.some(p=>p.status!=="read") ? "partial" : pending.size ? "budget-exhausted" : candidates.length ? "found" : "no-find-in-read-pages",
      pages, candidates, pending_urls: [...pending.keys()] };
    const dir = resolve(contactEvidenceDirectory(), "organizations");
    mkdirSync(dir, { recursive:true, mode:0o700 });
    writeFileSync(resolve(dir, `${result.id}.json`), JSON.stringify(result,null,2), {mode:0o600});
    if (process.argv.includes("--write")) {
      const { error: saveError } = await db.from("contact_research_runs").insert(result);
      if (saveError) throw saveError;
    }
    console.log(JSON.stringify({ dataset, id:row[cfg.id], status:result.status, pages:pages.length, candidates:candidates.length, pending:pending.size }));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
