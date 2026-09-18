import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Missing database environment");
const db = createClient(url, key);
async function main() {
  const { error } = await db.rpc("exec_sql", { sql: `
    CREATE TABLE IF NOT EXISTS funding_source_state (
      url text PRIMARY KEY, attempted_at timestamptz NOT NULL,
      final_url text NOT NULL, sha256 text NOT NULL,
      failure_reason text, next_retry_at timestamptz
    );
    ALTER TABLE funding_source_state ENABLE ROW LEVEL SECURITY;
    CREATE TABLE IF NOT EXISTS funding_discovery_leads (
      region_id text NOT NULL, url text NOT NULL, observed_at timestamptz NOT NULL,
      evidence jsonb NOT NULL, searched_at timestamptz,
      PRIMARY KEY (region_id,url)
    );
    ALTER TABLE funding_discovery_leads ENABLE ROW LEVEL SECURITY;
  ` });
  if (error) throw new Error(error.message);
  console.log("Funding source evidence schema ready");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
