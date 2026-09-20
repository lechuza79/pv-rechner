/** One disposable process per organization; the supervisor enforces wall time. */
import { readFileSync, appendFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { crawlContacts } from "./lib/contact-crawl";
import { renderContactPage } from "./lib/contact-render";
import { auditMunicipality } from "./lib/municipal-contact-audit";
import { atomicJson } from "./lib/contact-batch";
async function main() {
  // No crawl starts before its durable lease exists. Parent death closes stdin.
  let start = "";
  for await (const chunk of process.stdin) start += chunk;
  if (start.trim() !== "go") throw Error("Supervisor handshake missing");
  const request = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const dependencyDigest = createHash("sha256").update(readFileSync("node_modules/.package-lock.json")).digest("hex");
  if (dependencyDigest !== readFileSync("dependency-lock.sha256", "utf8")) throw Error("Runtime dependencies changed");
  const result = request.target.audit ? await auditMunicipality({...request.target.audit,attempt:request.attempt}) : await crawlContacts({
    website: request.target.website, dataset: request.target.dataset, organizationName:request.target.organizationName,
    pageBudget: request.pageBudget, render: renderContactPage,
    record: page => appendFileSync(request.pagesPath, JSON.stringify(page) + "\n", {mode:0o600}),
  });
  atomicJson(request.outputPath, {id:randomUUID(), observed_at:new Date().toISOString(),
    engine:request.engine, ...result, dataset:request.target.dataset,
    organization_id:request.target.organization_id, source:request.target,
    supervision:{attempt:request.attempt, timeoutSeconds:request.timeoutSeconds}});
}
main().catch(error=>{console.error(String(error));process.exitCode=1;});
