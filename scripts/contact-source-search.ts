/** Bounded acquisition step for missing websites and contacts outside a known site. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { contactEvidenceDirectory } from "./lib/contact-fetch";
import { searchContactSources, type SourceTarget } from "./lib/contact-source-search";
const arg = (name: string) => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
async function main() {
  const manifest = arg("manifest");
  if (!manifest) throw Error("Use --manifest=FILE [--limit=4] [--execute]. Manifest: {targets:[{dataset,organization_id,name,question?}]}");
  const limit = Number(arg("limit") ?? 4);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw Error("limit must be 1..20");
  const input: { targets: SourceTarget[] } = JSON.parse(readFileSync(manifest, "utf8"));
  if (!Array.isArray(input.targets)) throw Error("Manifest requires targets");
  const targets = input.targets.slice(0, limit);
  if (!process.argv.includes("--execute")) { console.log(JSON.stringify({ queries: targets.length, targets, status: "planned" }, null, 2)); return; }
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  const dir = resolve(contactEvidenceDirectory(), "source-search"); mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const target of targets) {
    const result = await searchContactSources(target, { login: process.env.DATAFORSEO_LOGIN ?? "", password: process.env.DATAFORSEO_PASSWORD ?? "" });
    const path = resolve(dir, `${randomUUID()}.json`);
    writeFileSync(path, JSON.stringify(result, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ organization: target.name, status: result.status, sources: result.sources.length, cost: result.cost, path }));
    if (result.status === "failed") process.exitCode = 1;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
